<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpensePaymentReceipt
{
    // The receipt is an immutable audit snapshot; cg_entries remains the financial source of truth.
    public function capture(Request $request, int $operation, Audit $audit): void
    {
        $entries = DB::table('cg_entries')->where('operation_id', $operation)->orderBy('id')->get();
        if ($entries->isEmpty() || $entries->contains(fn ($entry) => $entry->kind === 'discount')) {
            return;
        }
        $control = app(ExpenseControl::class);
        $items = $control->installments()->whereIn('i.id', $entries->pluck('installment_id'))->get()->keyBy('id');
        $people = DB::table('cg_people')->pluck('name', 'id');
        $rows = $entries->map(function ($entry) use ($control, $items, $people) {
            $item = $items->get($entry->installment_id);
            abort_unless($item, 409, 'Não foi possível conferir a parcela do comprovante.');
            $figures = $control->figures($item);
            $part = (int) $entry->credit_two_cents === 0 ? 'one' : ((int) $entry->credit_one_cents === 0 ? 'two' : 'both');
            $after = $part === 'one' ? $figures['remaining_one_cents'] : ($part === 'two' ? $figures['remaining_two_cents'] : $figures['remaining_cents']);

            return ['entry_id' => (int) $entry->id, 'installment_id' => (int) $entry->installment_id,
                'debt_name' => $item->name, 'institution_name' => $item->institution_name, 'type_name' => $item->type_name,
                'month' => substr($item->month_on, 0, 7), 'number' => (int) $item->number, 'due_on' => substr($item->due_on, 0, 10),
                'responsibility' => $item->responsibility, 'part' => $part, 'payer' => $entry->paid_by ? ($people[$entry->paid_by] ?? 'Responsável') : 'Casal',
                'kind' => $entry->kind, 'occurred_on' => substr($entry->occurred_on, 0, 10),
                'before_cents' => $after + (int) $entry->amount_cents, 'paid_cents' => (int) $entry->amount_cents, 'after_cents' => $after];
        })->values()->all();
        $receipt = ['operation_id' => $operation, 'recorded_at' => now()->toIso8601String(), 'rows' => $rows,
            'total_paid_cents' => (int) $entries->sum('amount_cents')];
        $audit->record($request, 'expense_control.receipt_created', 'expense_control', $operation, null, $receipt);
    }

    public function read(int $operation): array
    {
        $snapshot = DB::table('audit_logs')->where('action', 'expense_control.receipt_created')
            ->where('subject_type', 'expense_control')->where('subject_id', $operation)->orderBy('id')->value('after');
        abort_unless($snapshot, 404, 'Comprovante não disponível para esta operação anterior.');
        $receipt = json_decode($snapshot, true, 512, JSON_THROW_ON_ERROR);
        $entries = DB::table('cg_entries')->where('operation_id', $operation)->orderBy('id')->get();
        abort_unless((int) $entries->sum('amount_cents') === $receipt['total_paid_cents']
            && $entries->pluck('id')->map(fn ($id) => (int) $id)->all() === array_column($receipt['rows'], 'entry_id'), 409, 'O comprovante não confere com os pagamentos registrados.');
        $reversed = $entries->whereNotNull('reversed_at')->count();
        $receipt['status'] = $reversed === 0 ? 'confirmed' : ($reversed === $entries->count() ? 'reversed' : 'partially_reversed');

        return $receipt;
    }
}
