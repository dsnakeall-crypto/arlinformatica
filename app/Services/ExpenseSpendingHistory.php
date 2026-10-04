<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ExpenseSpendingHistory
{
    public function report(CarbonImmutable $start, CarbonImmutable $end, string $person, ExpenseControl $control): array
    {
        $months = [];
        for ($cursor = $start; $cursor <= $end; $cursor = $cursor->addMonth()) {
            $months[$cursor->format('Y-m')] = ['month' => $cursor->format('Y-m'), 'amount_cents' => 0, 'advance_cents' => 0, 'count' => 0];
        }
        $value = fn ($row) => match ($person) {
            'one' => (int) $row->share_one_cents,
            'two' => (int) $row->share_two_cents,
            'shared' => $row->responsibility === 'shared' ? (int) $row->amount_cents : 0,
            default => (int) $row->amount_cents,
        };
        $existing = [];
        $add = function ($row) use (&$months, $value) {
            $key = substr($row->month_on, 0, 7);
            $amount = $value($row);
            if (isset($months[$key]) && $amount > 0) {
                $months[$key]['amount_cents'] += $amount;
                $months[$key]['count']++;
            }
        };
        $rows = DB::table('cg_installments as i')->join('cg_debts as d', 'd.id', '=', 'i.debt_id')
            ->whereNull('d.cancelled_at')->whereBetween('i.month_on', [$start->toDateString(), $end->toDateString()])
            ->get(['i.*', 'd.responsibility']);
        foreach ($rows as $row) {
            $existing[$row->debt_id][$row->month_on] = true;
            $add($row);
        }
        // Preview missing recurring months without creating rows or changing balances.
        $recurring = DB::table('cg_debts')->whereNull('cancelled_at')->where('recurrence', 'monthly')
            ->where('start_on', '<=', $end->toDateString())->where(fn ($q) => $q->whereNull('ended_on')->orWhere('ended_on', '>=', $start->toDateString()))->get();
        foreach ($recurring as $debt) {
            $first = $start->max(CarbonImmutable::parse($debt->start_on));
            $last = $debt->ended_on ? $end->min(CarbonImmutable::parse($debt->ended_on)) : $end;
            for ($cursor = $first; $cursor <= $last; $cursor = $cursor->addMonth()) {
                if (! isset($existing[$debt->id][$cursor->toDateString()])) {
                    $add((object) [...$control->generate($debt, $cursor, 1), 'responsibility' => $debt->responsibility]);
                }
            }
        }
        $advances = DB::table('cg_entries as e')->join('cg_installments as i', 'i.id', '=', 'e.installment_id')
            ->join('cg_debts as d', 'd.id', '=', 'i.debt_id')->whereNull('d.cancelled_at')->whereNull('e.reversed_at')
            ->where('e.kind', 'advance')->whereBetween('e.occurred_on', [$start->toDateString(), $end->endOfMonth()->toDateString()])
            ->get(['e.occurred_on', 'e.amount_cents', 'e.credit_one_cents as share_one_cents', 'e.credit_two_cents as share_two_cents', 'd.responsibility']);
        foreach ($advances as $entry) {
            $months[substr($entry->occurred_on, 0, 7)]['advance_cents'] += $value($entry);
        }
        $previous = null;
        foreach ($months as &$row) {
            $row['change_cents'] = $previous === null ? null : $row['amount_cents'] - $previous;
            $row['change_percent'] = $previous > 0 ? round(100 * $row['change_cents'] / $previous, 1) : null;
            $previous = $row['amount_cents'];
        }
        unset($row);
        $ordered = array_values($months);
        $total = array_sum(array_column($ordered, 'amount_cents'));
        $ranked = collect($ordered)->sortBy('amount_cents')->values();

        return ['start' => $start->format('Y-m'), 'end' => $end->format('Y-m'), 'person' => $person,
            'months' => $ordered, 'total_cents' => $total, 'advance_cents' => array_sum(array_column($ordered, 'advance_cents')),
            'highest' => $total > 0 ? collect($ordered)->sortByDesc('amount_cents')->first() : null, 'lowest' => $total > 0 ? $ranked->first() : null];
    }
}
