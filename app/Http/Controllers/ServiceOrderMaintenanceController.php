<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\NotificationService;
use App\Services\OrderNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceOrderMaintenanceController extends Controller
{
    private const REOPEN_TYPES = [
        'warranty_service' => 'Garantia de serviço',
        'warranty_product' => 'Garantia de produto',
        'same_issue_return' => 'Retorno do mesmo defeito',
        'adjustment_return' => 'Retorno para ajuste',
        'other' => 'Outro retorno',
    ];

    public function update(Request $request, ServiceOrder $order): JsonResponse
    {
        $data = $request->validate([
            'attendance_type' => ['required', 'in:bench,external'],
            'reported_problem' => ['required', 'string', 'max:10000'],
        ]);

        $before = [
            'attendance_type' => $order->attendance_type,
            'reported_problem' => $order->reported_problem,
        ];

        DB::transaction(function () use ($request, $order, $data, $before) {
            $order->update($data);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.edited',
                'subject_type' => 'service_order',
                'subject_id' => $order->id,
                'before' => json_encode($before),
                'after' => json_encode($data),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json($order->fresh()->load('client'));
    }

    public function reopen(
        Request $request,
        ServiceOrder $order,
        OrderNumber $numbers,
        CompanySettings $settings,
        NotificationService $notifications,
    ): JsonResponse {
        abort_unless($order->status === 'completed', 422, 'Somente uma OS concluída pode ser reaberta.');

        $data = $request->validate([
            'reopen_type' => ['required', 'in:'.implode(',', array_keys(self::REOPEN_TYPES))],
            'note' => ['required', 'string', 'max:5000'],
        ]);

        $alreadyOpen = ServiceOrder::query()
            ->where('reopened_from_order_id', $order->id)
            ->whereNotIn('status', ['completed', 'interrupted'])
            ->exists();
        abort_if($alreadyOpen, 409, 'Esta OS já possui um retorno em andamento.');

        $label = self::REOPEN_TYPES[$data['reopen_type']];
        $newOrder = DB::transaction(function () use ($request, $order, $numbers, $settings, $data, $label, $notifications) {
            $client = Client::findOrFail($order->client_id);
            $newOrder = new ServiceOrder();
            $newOrder->forceFill([
                'number' => $numbers->next(),
                'client_id' => $order->client_id,
                'reopened_from_order_id' => $order->id,
                'reopen_type' => $data['reopen_type'],
                'reopen_note' => trim($data['note']),
                'equipment_type_id' => $order->equipment_type_id,
                'manufacturer_id' => $order->manufacturer_id,
                'attendance_type' => $order->attendance_type,
                'status' => 'analysis',
                'reported_problem' => "{$label} da OS #{$order->number}:\n\n".trim($data['note']),
                'received_at' => now(),
                'created_by' => $request->user()->id,
            ])->save();
            $newOrder->histories()->create([
                'to_status' => 'analysis',
                'user_id' => $request->user()->id,
            ]);
            $newOrder->snapshot()->create([
                'client' => $client->toArray(),
                'company' => $settings->snapshot(),
                'equipment' => [
                    'type_id' => $order->equipment_type_id,
                    'manufacturer_id' => $order->manufacturer_id,
                ],
                'term_text' => (string) DB::table('versioned_templates')
                    ->where('type', 'term')
                    ->where('active', true)
                    ->latest('version')
                    ->value('body'),
            ]);

            $cycle = DB::table('post_sale_cycles')
                ->where('service_order_id', $order->id)
                ->where('active', true)
                ->first();
            if ($cycle) {
                DB::table('post_sale_cycles')->where('id', $cycle->id)->update([
                    'active' => false,
                    'archived_at' => now(),
                    'archive_reason' => "OS reaberta como {$label}",
                    'updated_at' => now(),
                ]);
                $notifications->resolve("post-sale:{$cycle->id}");
            }

            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.reopened',
                'subject_type' => 'service_order',
                'subject_id' => $order->id,
                'after' => json_encode([
                    'new_service_order_id' => $newOrder->id,
                    'new_number' => $newOrder->number,
                    'reopen_type' => $data['reopen_type'],
                    'reopen_label' => $label,
                    'note' => trim($data['note']),
                ]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            return $newOrder;
        });

        $notifications->notifyUsers(
            'order_reopened',
            'OS reaberta',
            "OS {$newOrder->number} — {$newOrder->client->name} ({$label})",
            "/orders/{$newOrder->id}",
            "order-reopened:{$newOrder->id}",
            ['service_order_id' => $newOrder->id, 'reopened_from_order_id' => $order->id],
        );

        return response()->json([
            'order' => $newOrder->fresh()->load('client'),
            'reopen_label' => $label,
        ], 201);
    }
}
