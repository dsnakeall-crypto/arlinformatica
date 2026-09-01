<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\StatusHistory;
use App\Services\OrderNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceOrderController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = ServiceOrder::query()->with('client:id,name,phone,city,state')->latest('received_at');
        if ($status = $r->query('status')) {
            $q->where('status', $status);
        } if ($search = trim((string) $r->query('q'))) {
            $q->where(fn ($x) => $x->where('number', 'like', "%$search%")->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$search%")));
        }

        return response()->json($q->paginate(20));
    }

    public function store(Request $r, OrderNumber $numbers): JsonResponse
    {
        $data = $r->validate(['client_id' => 'required|exists:clients,id', 'equipment_type_id' => 'required|exists:equipment_types,id', 'manufacturer_id' => 'nullable|exists:manufacturers,id', 'attendance_type' => 'required|in:bench,external', 'reported_problem' => 'required|string|max:10000', 'checklist' => 'array', 'checklist.*.label' => 'required|string|max:255', 'checklist.*.note' => 'nullable|string|max:255']);
        $order = DB::transaction(function () use ($data, $numbers, $r) {
            $client = Client::findOrFail($data['client_id']);
            $order = ServiceOrder::create([...$data, 'number' => $numbers->next(), 'status' => 'analysis', 'received_at' => now(), 'created_by' => $r->user()->id]);
            $order->histories()->create(['to_status' => 'analysis', 'user_id' => $r->user()->id]);
            $order->checklists()->createMany($data['checklist'] ?? []);
            $order->snapshot()->create(['client' => $client->toArray(), 'company' => $this->companySnapshot(), 'equipment' => ['type_id' => $data['equipment_type_id'], 'manufacturer_id' => $data['manufacturer_id'] ?? null], 'term_text' => $this->term()]);

            return $order;
        });

        return response()->json($order->load('client'), 201);
    }

    public function updateStatus(Request $r, ServiceOrder $order): JsonResponse
    {
        $data = $r->validate(['status' => 'required|in:analysis,waiting_part,in_service,completed,interrupted']);
        if ($data['status'] === 'completed') {
            abort(422, 'Use a finalização para concluir a OS.');
        } DB::transaction(function () use ($order, $data, $r) {
            $before = $order->status;
            $order->update(['status' => $data['status']]);
            StatusHistory::create(['service_order_id' => $order->id, 'from_status' => $before, 'to_status' => $data['status'], 'user_id' => $r->user()->id]);
        });

        return response()->json($order->fresh());
    }

    private function companySnapshot(): array
    {
        return ['name' => 'ARL Informática', 'instagram' => config('arl.instagram')];
    }

    private function term(): string
    {
        return (string) DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->value('body');
    }
}
