<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ServiceOrderAuditController extends Controller
{
    public function index(ServiceOrder $order): JsonResponse
    {
        $entries = DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->where('audit_logs.subject_type', 'service_order')
            ->where('audit_logs.subject_id', $order->id)
            ->orderByDesc('audit_logs.created_at')
            ->orderByDesc('audit_logs.id')
            ->get([
                'audit_logs.id',
                'audit_logs.action',
                'audit_logs.before',
                'audit_logs.after',
                'audit_logs.created_at',
                'users.name as user_name',
            ])
            ->map(function ($row) {
                $before = $this->decodeState($row->before);
                $after = $this->decodeState($row->after);

                return [
                    'id' => (int) $row->id,
                    'created_at' => (string) $row->created_at,
                    'user' => $row->user_name ?: 'Sistema',
                    'action' => $this->actionLabel((string) $row->action),
                    'changes' => $this->changes((string) $row->action, $before, $after),
                ];
            })
            ->values();

        return response()->json($entries);
    }

    private function decodeState(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (! is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function actionLabel(string $action): string
    {
        return match ($action) {
            'service_order.edited' => 'Alteração da OS',
            'service_order.finalized' => 'Finalização da OS',
            'service_order.marked_paid_and_retrieved' => 'Pagamento e retirada',
            'service_order.reopened' => 'Reabertura da OS',
            'service_order.deleted' => 'Remoção da OS',
            'service_order.refund_created' => 'Estorno da OS',
            default => 'Registro da OS',
        };
    }

    private function changes(string $action, array $before, array $after): array
    {
        return match ($action) {
            'service_order.edited' => $this->editedChanges($before, $after),
            'service_order.finalized' => $this->finalizationChanges($after),
            'service_order.marked_paid_and_retrieved' => ['OS marcada como paga e retirada.'],
            'service_order.reopened' => $this->reopenChanges($after),
            'service_order.deleted' => ['OS removida da operação; histórico financeiro, auditoria e documentos foram preservados.'],
            'service_order.refund_created' => [
                'Estorno de '.$this->money((int) ($after['amount_cents'] ?? 0)).' via '.$this->refundMethod($after['method'] ?? null).'.',
                'Motivo: '.$this->text($after['reason'] ?? null),
                'O valor original da OS permaneceu em '.$this->money((int) ($after['original_order_total_cents'] ?? 0)).'.',
            ],
            default => ['Alteração registrada no histórico da OS.'],
        };
    }

    private function editedChanges(array $before, array $after): array
    {
        $changes = [];

        $beforeClient = data_get($before, 'client.name');
        $afterClient = data_get($after, 'client.name');
        if ($beforeClient !== $afterClient) {
            $changes[] = sprintf('Cliente alterado de %s para %s', $this->text($beforeClient), $this->text($afterClient));
        }

        $this->appendScalarChange($changes, 'Equipamento', $before['equipment_description'] ?? null, $after['equipment_description'] ?? null);

        $beforeAttendance = $this->attendance($before['attendance_type'] ?? null);
        $afterAttendance = $this->attendance($after['attendance_type'] ?? null);
        if ($beforeAttendance !== $afterAttendance) {
            $changes[] = "Atendimento alterado de {$beforeAttendance} para {$afterAttendance}";
        }

        $this->appendScalarChange($changes, 'Problema relatado', $before['reported_problem'] ?? null, $after['reported_problem'] ?? null);
        $this->appendScalarChange($changes, 'Laudo final', $before['final_report'] ?? null, $after['final_report'] ?? null);

        $beforeChecklist = is_array($before['checklist'] ?? null) ? $before['checklist'] : [];
        $afterChecklist = is_array($after['checklist'] ?? null) ? $after['checklist'] : [];
        if ($beforeChecklist !== $afterChecklist) {
            $changes[] = sprintf('Checklist alterado de %s para %s', $this->checklist($beforeChecklist), $this->checklist($afterChecklist));
        }

        $beforeItems = is_array($before['items'] ?? null) ? $before['items'] : [];
        $afterItems = is_array($after['items'] ?? null) ? $after['items'] : [];
        if ($beforeItems !== $afterItems) {
            $changes[] = sprintf('Serviços / Produtos alterados de %s para %s', $this->items($beforeItems), $this->items($afterItems));
        }

        return $changes !== [] ? $changes : ['Alteração administrativa registrada sem mudança de conteúdo exibível.'];
    }

    private function appendScalarChange(array &$changes, string $label, mixed $before, mixed $after): void
    {
        if ($before === $after) {
            return;
        }

        $changes[] = sprintf('%s alterado de %s para %s', $label, $this->text($before), $this->text($after));
    }

    private function finalizationChanges(array $after): array
    {
        $result = match ($after['result'] ?? null) {
            'repair_completed' => 'Reparo realizado',
            'irreparable' => 'Equipamento sem possibilidade de reparo',
            'client_cancelled' => 'Cliente desistiu/cancelou',
            'economically_unviable' => 'Reparo economicamente inviável',
            'no_fault' => 'Sem defeito constatado',
            default => 'Outro resultado',
        };
        $changes = ["Resultado: {$result}"];
        if (array_key_exists('total_cents', $after)) {
            $changes[] = 'Total final: '.$this->money((int) $after['total_cents']);
        }
        if (isset($after['previous_total_cents']) && (int) $after['previous_total_cents'] !== (int) ($after['total_cents'] ?? 0)) {
            $changes[] = 'Valor alterado de '.$this->money((int) $after['previous_total_cents']).' para '.$this->money((int) $after['total_cents']);
        }
        if (! empty($after['financial_adjustment_id'])) {
            $changes[] = 'Ajuste de cobrança registrado no financeiro para esta OS.';
        }
        if (! empty($after['approved_budget_id'])) {
            $changes[] = 'Finalização vinculada a orçamento aprovado.';
        }

        return $changes;
    }

    private function reopenChanges(array $after): array
    {
        $changes = ['A mesma OS foi reaberta para correção e nova finalização.'];
        if (! empty($after['note'])) {
            $changes[] = 'Motivo: '.$this->text($after['note']);
        }

        return $changes;
    }

    private function attendance(mixed $value): string
    {
        return match ($value) {
            'bench' => 'Bancada',
            'external' => 'Externo',
            default => 'não informado',
        };
    }

    private function refundMethod(mixed $value): string
    {
        return match ($value) {
            'pix' => 'Pix', 'cash' => 'Dinheiro', 'debit' => 'Cartão de débito',
            'credit' => 'Cartão de crédito', 'transfer' => 'Transferência', default => 'Outro',
        };
    }

    private function checklist(array $items): string
    {
        if ($items === []) {
            return 'sem marcações';
        }

        $text = collect($items)->map(function ($item) {
            $label = $this->text($item['label'] ?? null);
            $note = trim((string) ($item['note'] ?? ''));

            return $note === '' ? $label : $label.' ('.$this->text($note).')';
        })->implode('; ');

        return Str::limit($text, 260, '…');
    }

    private function items(array $items): string
    {
        if ($items === []) {
            return 'nenhum serviço/produto';
        }

        $text = collect($items)->map(function ($item) {
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $description = $this->text($item['description'] ?? null);
            $price = $this->money((int) ($item['unit_price_cents'] ?? 0));

            return "{$quantity}× {$description} a {$price}";
        })->implode('; ');

        return Str::limit($text, 300, '…');
    }

    private function money(int $cents): string
    {
        return 'R$ '.number_format($cents / 100, 2, ',', '.');
    }

    private function text(mixed $value): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', (string) $value) ?? '');

        return $text === '' ? 'não informado' : Str::limit($text, 180, '…');
    }
}
