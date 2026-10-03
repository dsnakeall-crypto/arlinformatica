<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExpenseControl
{
    public function month(string $month): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m', $month);
    }

    public function installments(): Builder
    {
        $credits = DB::table('cg_entries')->whereNull('reversed_at')->selectRaw('installment_id, SUM(credit_one_cents) AS credit_one, SUM(credit_two_cents) AS credit_two, SUM(CASE WHEN kind IN (\'payment\', \'advance\') THEN amount_cents ELSE 0 END) AS paid, SUM(CASE WHEN kind = \'discount\' THEN amount_cents ELSE 0 END) AS discounted, SUM(CASE WHEN kind IN (\'payment\', \'advance\') THEN credit_one_cents ELSE 0 END) AS paid_one, SUM(CASE WHEN kind IN (\'payment\', \'advance\') THEN credit_two_cents ELSE 0 END) AS paid_two')->groupBy('installment_id');

        return DB::table('cg_installments as i')->join('cg_debts as d', 'd.id', '=', 'i.debt_id')
            ->join('cg_institutions as bank', 'bank.id', '=', 'd.institution_id')->join('cg_types as type', 'type.id', '=', 'd.type_id')
            ->leftJoinSub($credits, 'credits', fn ($j) => $j->on('credits.installment_id', '=', 'i.id'))
            ->select('i.*', 'd.name', 'd.institution_id', 'd.type_id', 'd.recurrence', 'd.responsibility', 'd.installment_count', 'd.cancelled_at', 'bank.name as institution_name', 'type.name as type_name')
            ->selectRaw('COALESCE(credits.credit_one, 0) AS credit_one, COALESCE(credits.credit_two, 0) AS credit_two, COALESCE(credits.paid, 0) AS paid_cents, COALESCE(credits.discounted, 0) AS discount_cents, COALESCE(credits.paid_one, 0) AS paid_one_cents, COALESCE(credits.paid_two, 0) AS paid_two_cents');
    }

    public function figures(object $i): array
    {
        $one = (int) $i->share_one_cents - (int) $i->credit_one;
        $two = (int) $i->share_two_cents - (int) $i->credit_two;

        return [...(array) $i, 'remaining_one_cents' => $one, 'remaining_two_cents' => $two, 'remaining_cents' => $one + $two,
            'status' => $i->cancelled_at ? 'cancelled' : ($one + $two === 0 ? 'paid' : ((int) $i->credit_one + (int) $i->credit_two > 0 ? 'partial' : 'open'))];
    }

    public function shares(int $amount, int $percent): array
    {
        // A deterministic cent belongs to participant 1; allocating the remainder preserves the exact total.
        $one = intdiv($amount * $percent + 50, 100);

        return [$one, $amount - $one];
    }

    public function generate(object $debt, CarbonImmutable $month, int $number): array
    {
        [$one, $two] = $this->shares((int) $debt->amount_cents, (int) $debt->percent_one);

        return ['debt_id' => $debt->id, 'number' => $number, 'month_on' => $month->toDateString(), 'due_on' => $month->day(min((int) $debt->due_day, $month->daysInMonth))->toDateString(),
            'amount_cents' => $debt->amount_cents, 'share_one_cents' => $one, 'share_two_cents' => $two, 'created_at' => now(), 'updated_at' => now()];
    }

    public function ensureMonth(CarbonImmutable $month): void
    {
        // Recurring months are lazily materialized, never seeded as fictitious expenses or given a false end date.
        DB::transaction(function () use ($month) {
            $debts = DB::table('cg_debts')->where('recurrence', 'monthly')->whereNull('cancelled_at')->where('start_on', '<=', $month->toDateString())
                ->orderBy('id')->lockForUpdate()->get();
            foreach ($debts as $debt) {
                $start = CarbonImmutable::parse($debt->start_on);
                $end = $debt->ended_on ? $month->min(CarbonImmutable::parse($debt->ended_on)) : $month;
                $existing = DB::table('cg_installments')->where('debt_id', $debt->id)->pluck('month_on')->flip();
                $rows = [];
                for ($cursor = $start, $number = (int) $debt->first_number; $cursor <= $end; $cursor = $cursor->addMonth(), $number++) {
                    if (! $existing->has($cursor->toDateString())) {
                        $rows[] = $this->generate($debt, $cursor, $number);
                    }
                }
                foreach (array_chunk($rows, 100) as $chunk) {
                    DB::table('cg_installments')->insertOrIgnore($chunk);
                }
            }
        });
    }

    public function createDebt(Request $request, array $data): int
    {
        return DB::transaction(function () use ($request, $data) {
            // Serialize create/retry from the same account, including concurrent requests on MySQL.
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $hash = hash('sha256', json_encode($data));
            $old = DB::table('cg_debts')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless($old->created_by === $request->user()->id && hash_equals($old->payload_hash, $hash), 409, 'Esta solicitação já foi utilizada com outros dados.');

                return $old->id;
            }
            $this->activeCatalog($data);
            $percent = match ($data['responsibility']) {
                'one' => 100, 'two' => 0, default => $data['percent_one']
            };
            $start = $this->month($data['start_month']);
            unset($data['start_month']);
            $id = DB::table('cg_debts')->insertGetId([
                ...$data, 'start_on' => $start->toDateString(), 'created_by' => $request->user()->id,
                'percent_one' => $percent, 'payload_hash' => $hash, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $debt = DB::table('cg_debts')->find($id);
            $count = $debt->recurrence === 'installments' ? $debt->installment_count - $debt->first_number + 1 : 1;
            for ($n = 0; $n < $count; $n++) {
                DB::table('cg_installments')->insert($this->generate($debt, $start->addMonths($n), $debt->first_number + $n));
            }
            app(Audit::class)->record($request, 'expense_control.debt_created', 'expense_control', $id, null, ['name' => $debt->name, 'amount_cents' => $debt->amount_cents]);

            return $id;
        });
    }

    public function activeCatalog(array $data): void
    {
        foreach (['institution_id' => 'cg_institutions', 'type_id' => 'cg_types'] as $key => $table) {
            if (! DB::table($table)->where('id', $data[$key])->where('active', true)->exists()) {
                throw ValidationException::withMessages([$key => 'Selecione um cadastro ativo.']);
            }
        }
    }

    public function importPhoto(Request $request, array $data): array
    {
        return DB::transaction(function () use ($request, $data) {
            // Serialize request retries and lock every target institution in stable order.
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $banks = collect($data['items'])->map(fn ($item) => $item['institution_id'] ?? $data['institution_id'])->unique()->sort()->values();
            $institutions = DB::table('cg_institutions')->whereIn('id', $banks)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $hash = hash('sha256', json_encode($data));
            $old = DB::table('cg_photo_imports')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless($old->created_by === $request->user()->id && hash_equals($old->payload_hash, $hash), 409, 'Esta solicitação já foi utilizada com outros dados.');

                return ['id' => $old->id, 'debt_ids' => json_decode($old->debt_ids, true), 'replayed' => true];
            }
            abort_if(DB::table('cg_photo_imports')->whereIn('institution_id', $banks)->where('source_hash', $data['source_hash'])->exists(), 409, 'Esta foto já foi cadastrada nesta instituição. Confira as compras existentes para não duplicar a fatura.');
            $count = array_sum(array_map(fn ($item) => $item['installment_count'] - $item['first_number'] + 1, $data['items']));
            abort_if($count > 3000, 422, 'Divida o cadastro em lotes menores: máximo de 3.000 parcelas por confirmação.');
            $ids = [];
            $groupIds = [];
            foreach ($data['items'] as $item) {
                unset($item['reviewed']);
                $bankId = $item['institution_id'] ?? $data['institution_id'];
                $dueDay = ! empty($data['institution_id']) ? $institutions->get($bankId)->due_day : $data['due_day'];
                $debtId = $this->createDebt($request, [...$item, 'institution_id' => $bankId, 'start_month' => $data['start_month'], 'due_day' => $dueDay]);
                $ids[] = $debtId;
                $groupIds[$bankId][] = $debtId;
            }
            $id = null;
            foreach ($banks as $bankId) {
                $recordId = DB::table('cg_photo_imports')->insertGetId([
                    'request_key' => $id === null ? $data['request_key'] : (string) Str::uuid(),
                    'payload_hash' => $hash, 'source_hash' => $data['source_hash'],
                    'institution_id' => $bankId, 'created_by' => $request->user()->id,
                    // The primary record replays the whole batch; others protect each bank.
                    'debt_ids' => json_encode($id === null ? $ids : $groupIds[$bankId]), 'created_at' => now(), 'updated_at' => now(),
                ]);
                $id ??= $recordId;
            }
            app(Audit::class)->record($request, 'expense_control.photo_imported', 'expense_control', $id, null, ['debt_ids' => $ids, 'count' => count($ids)]);

            return ['id' => $id, 'debt_ids' => $ids, 'replayed' => false];
        }, 3);
    }

    public function institutionPlan(array $data): array
    {
        $field = $data['target'] === 'one' ? 'remaining_one_cents' : 'remaining_two_cents';
        $items = $this->installments()->where('d.institution_id', $data['institution_id'])
            ->whereNull('d.cancelled_at')->where('i.month_on', $this->month($data['month'])->toDateString())
            ->orderBy('d.start_on')->orderBy('d.id')->orderBy('i.id')->get()
            ->map(fn ($i) => $this->figures($i))->filter(fn ($i) => $i[$field] > 0)->values();
        $items = $items->sortBy(fn ($i) => $i['responsibility'] === 'shared' ? 1 : 0)->values();
        $balance = $items->sum($field);
        abort_if($data['amount_cents'] > $balance, 422, 'O valor supera o saldo deste responsável na instituição e no mês selecionado.');
        $left = $data['amount_cents'];
        $allocations = [];
        foreach ($items as $i) {
            if ($left === 0) {
                break;
            }
            $amount = min($left, $i[$field]);
            $allocations[] = ['id' => $i['id'], 'name' => $i['name'], 'number' => $i['number'], 'shared' => $i['responsibility'] === 'shared', 'amount_cents' => $amount, 'remaining_cents' => $i[$field] - $amount];
            $left -= $amount;
        }

        return ['balance_cents' => $balance, 'remaining_cents' => $balance - $data['amount_cents'], 'allocations' => $allocations,
            'preview_hash' => hash('sha256', json_encode([$data['institution_id'], $data['month'], $data['target'], $data['amount_cents'], $items->map(fn ($i) => [$i['id'], $i[$field]])->all()]))];
    }

    public function recordInstitution(Request $request, array $data, Audit $audit): array
    {
        return DB::transaction(function () use ($request, $data, $audit) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $hash = hash('sha256', json_encode($data));
            $old = DB::table('cg_operations')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless($old->created_by === $request->user()->id && hash_equals($old->payload_hash, $hash), 409, 'Solicitação já utilizada com outros dados.');

                return ['id' => $old->id, 'replayed' => true];
            }
            $debts = DB::table('cg_debts')->where('institution_id', $data['institution_id'])->orderBy('id')->lockForUpdate()->pluck('id');
            DB::table('cg_installments')->whereIn('debt_id', $debts)->orderBy('id')->lockForUpdate()->get();
            $plan = $this->institutionPlan($data);
            abort_unless(hash_equals($plan['preview_hash'], $data['preview_hash']), 409, 'O saldo mudou. Simule novamente antes de confirmar.');
            $operation = DB::table('cg_operations')->insertGetId(['request_key' => $data['request_key'], 'payload_hash' => $hash, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($plan['allocations'] as $allocation) {
                DB::table('cg_entries')->insert(['operation_id' => $operation, 'installment_id' => $allocation['id'], 'kind' => $data['kind'], 'paid_by' => $data['paid_by'], 'occurred_on' => $data['occurred_on'], 'amount_cents' => $allocation['amount_cents'],
                    'credit_one_cents' => $data['target'] === 'one' ? $allocation['amount_cents'] : 0, 'credit_two_cents' => $data['target'] === 'two' ? $allocation['amount_cents'] : 0,
                    'notes' => 'Pagamento da instituição · '.($data['notes'] ?? ''), 'created_at' => now(), 'updated_at' => now()]);
            }
            $audit->record($request, 'expense_control.operation_created', 'expense_control', $operation, null, [...$data, 'allocations' => $plan['allocations']]);

            return ['id' => $operation, 'replayed' => false];
        }, 3);
    }

    public function record(Request $request, array $data, Audit $audit): array
    {
        return DB::transaction(function () use ($request, $data, $audit) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $hash = hash('sha256', json_encode($data));
            $old = DB::table('cg_operations')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless($old->created_by === $request->user()->id && hash_equals($old->payload_hash, $hash), 409, 'Esta solicitação já foi utilizada com outros dados.');

                return ['id' => $old->id, 'replayed' => true];
            }
            $ids = $data['installment_ids'];
            $debtIds = DB::table('cg_installments')->whereIn('id', $ids)->distinct()->orderBy('debt_id')->pluck('debt_id');
            DB::table('cg_debts')->whereIn('id', $debtIds)->orderBy('id')->lockForUpdate()->get();
            DB::table('cg_installments')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
            $items = $this->installments()->whereIn('i.id', $ids)->orderBy('i.id')->get();
            abort_unless($items->count() === count($ids), 422, 'Uma parcela não está disponível.');
            $operation = DB::table('cg_operations')->insertGetId(['request_key' => $data['request_key'], 'payload_hash' => $hash, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($items as $item) {
                $figures = $this->figures($item);
                abort_if($item->cancelled_at, 422, 'A dívida está cancelada.');
                $one = $data['target'] === 'two' ? 0 : $figures['remaining_one_cents'];
                $two = $data['target'] === 'one' ? 0 : $figures['remaining_two_cents'];
                $remaining = $one + $two;
                $amount = $data['amount_cents'] ?? $remaining;
                abort_if($amount <= 0 || $amount > $remaining, 422, 'O valor deve ser positivo e não pode superar o saldo da parte selecionada.');
                if ($one === 0) {
                    $a = 0;
                    $b = $amount;
                } elseif ($two === 0) {
                    $a = $amount;
                    $b = 0;
                } else {
                    $a = min($one, intdiv($amount * $one + intdiv($remaining, 2), $remaining));
                    $b = $amount - $a;
                }
                DB::table('cg_entries')->insert([
                    'operation_id' => $operation, 'installment_id' => $item->id, 'kind' => $data['kind'], 'paid_by' => $data['paid_by'] ?? null,
                    'occurred_on' => $data['occurred_on'], 'amount_cents' => $amount, 'credit_one_cents' => $a, 'credit_two_cents' => $b,
                    'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $audit->record($request, 'expense_control.operation_created', 'expense_control', $operation, null, $data);

            return ['id' => $operation, 'replayed' => false];
        }, 3);
    }
}
