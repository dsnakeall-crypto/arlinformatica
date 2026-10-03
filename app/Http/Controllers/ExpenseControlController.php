<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Services\ExpenseCardImage;
use App\Services\ExpenseControl;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExpenseControlController extends Controller
{
    public function __construct(private ExpenseControl $control) {}

    private function period(Request $r): CarbonImmutable
    {
        $r->validate(['month' => ['nullable', 'date_format:Y-m', 'after_or_equal:2000-01', 'before_or_equal:2099-12']]);

        return $this->control->month($r->query('month', today()->format('Y-m')));
    }

    public function configuration(Request $r): JsonResponse
    {
        return response()->json([
            'people' => DB::table('cg_people')->orderBy('id')->get(),
            'institutions' => DB::table('cg_institutions')->orderBy('name')->get()->map(fn ($row) => $this->institution($row)),
            'card_artworks' => $this->artworks(),
            'types' => DB::table('cg_types')->orderBy('name')->get(),
            'my_person_id' => DB::table('cg_people')->where('user_id', $r->user()->id)->value('id'),
            'can_assign_users' => $r->user()->hasRole('Master', 'Administrador'),
            'accounts' => $r->user()->hasRole('Master', 'Administrador') ? DB::table('users')->join('roles', 'roles.id', '=', 'users.role_id')->where('users.active', true)->whereIn('roles.name', ['Master', 'Administrador', 'Controle de Gasto'])->get(['users.id', 'users.name']) : [],
        ])->header('Cache-Control', 'no-store, private');
    }

    public function people(Request $r, Audit $audit): JsonResponse
    {
        $data = $r->validate(['people' => 'required|array|size:2', 'people.*.id' => 'required|integer|distinct|in:1,2', 'people.*.name' => 'required|string|max:80', 'people.*.default_percent' => 'required|integer|min:0|max:100', 'people.*.user_id' => 'nullable|integer|distinct|exists:users,id']);
        abort_unless(array_sum(array_column($data['people'], 'default_percent')) === 100, 422, 'A divisão precisa somar 100%.');
        DB::transaction(function () use ($r, $data, $audit) {
            $before = DB::table('cg_people')->orderBy('id')->lockForUpdate()->get();
            $assign = $r->user()->hasRole('Master', 'Administrador');
            foreach ($data['people'] as $person) {
                $old = $before->firstWhere('id', $person['id']);
                if (! $assign) {
                    abort_unless(($person['user_id'] ?? null) === $old->user_id, 403, 'Somente a administração vincula contas de acesso.');
                }
                if ($person['user_id'] ?? null) {
                    abort_unless(DB::table('users')->join('roles', 'roles.id', '=', 'users.role_id')->where('users.id', $person['user_id'])->where('users.active', true)->whereIn('roles.name', ['Master', 'Administrador', 'Controle de Gasto'])->exists(), 422, 'Vincule uma conta com acesso ao módulo.');
                }
            }
            if ($assign) {
                DB::table('cg_people')->update(['user_id' => null]);
            }
            foreach ($data['people'] as $person) {
                DB::table('cg_people')->where('id', $person['id'])->update(['name' => $person['name'], 'default_percent' => $person['default_percent'], ...($assign ? ['user_id' => $person['user_id'] ?? null] : []), 'updated_at' => now()]);
            }
            $audit->record($r, 'expense_control.people_updated', 'expense_control', null, $before, $data);
        });

        return $this->configuration($r);
    }

    public function catalog(Request $r, string $catalog, ?int $id = null): JsonResponse
    {
        abort_unless(in_array($catalog, ['institutions', 'types'], true), 404);
        $rules = ['name' => 'required|string|max:80', 'active' => 'required|boolean'];
        if ($catalog === 'institutions') {
            $rules += ['due_day' => 'required|integer|min:1|max:31', 'color' => ['required', 'regex:/^#[a-fA-F0-9]{6}$/'], 'artwork_key' => ['nullable', Rule::in(array_column($this->artworks(), 'key'))], 'image' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:4096', 'remove_image' => 'sometimes|boolean'];
        } else {
            $rules['name'] = ['required', 'string', 'max:80', Rule::unique('cg_types')->ignore($id)];
        }
        $data = $r->validate($rules);
        $table = 'cg_'.$catalog;
        $stored = null;
        if ($catalog === 'institutions') {
            $remove = $data['remove_image'] ?? false;
            unset($data['remove_image'], $data['image']);
            if ($r->hasFile('image')) {
                $bytes = app(ExpenseCardImage::class)->optimize($r->file('image'));
                $stored = 'expense-cards/'.Str::uuid().'.jpg';
                abort_unless(Storage::disk('local')->put($stored, $bytes), 500, 'Falha ao armazenar a imagem.');
                $data['image_path'] = $stored;
                $data['artwork_key'] = null;
            } elseif ($remove || ! empty($data['artwork_key'])) {
                $data['image_path'] = null;
            }
        }
        try {
            DB::transaction(function () use ($r, $table, &$id, $data) {
                $before = $id ? DB::table($table)->where('id', $id)->lockForUpdate()->first() : null;
                if ($id) {
                    abort_unless($before, 404);
                    DB::table($table)->where('id', $id)->update([...$data, 'updated_at' => now()]);
                } else {
                    $id = DB::table($table)->insertGetId([...$data, 'created_at' => now(), 'updated_at' => now()]);
                }
                app(Audit::class)->record($r, 'expense_control.catalog_saved', 'expense_control', $id, $before, $data);
            });

        } catch (\Throwable $error) {
            if ($stored) {
                Storage::disk('local')->delete($stored);
            }
            throw $error;
        }

        $row = DB::table($table)->find($id);

        return response()->json($catalog === 'institutions' ? $this->institution($row) : $row, 200);
    }

    private function artworks(): array
    {
        return json_decode(file_get_contents(public_path('arl-assets/expense-cards/catalog.json')), true, 512, JSON_THROW_ON_ERROR);
    }

    private function institution(object $row): object
    {
        $row->image_url = $row->image_path ? '/api/expense-control/institutions/'.$row->id.'/image?v='.basename($row->image_path, '.jpg') : null;
        unset($row->image_path);

        return $row;
    }

    public function image(int $id): BinaryFileResponse
    {
        $path = DB::table('cg_institutions')->where('id', $id)->value('image_path');
        abort_unless($path && str_starts_with($path, 'expense-cards/') && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function summary(Request $r): JsonResponse
    {
        $month = $this->period($r);
        $this->control->ensureMonth($month);
        $items = $this->control->installments()->whereNull('d.cancelled_at')->where('i.month_on', $month->toDateString())->orderBy('i.due_on')->get()->map(fn ($i) => $this->control->figures($i));
        $totals = ['original_cents' => 0, 'paid_cents' => 0, 'discount_cents' => 0, 'remaining_cents' => 0, 'one_original_cents' => 0, 'two_original_cents' => 0, 'one_remaining_cents' => 0, 'two_remaining_cents' => 0, 'shared_original_cents' => 0, 'shared_remaining_cents' => 0, 'one_paid_cents' => 0, 'two_paid_cents' => 0];
        foreach ($items as $i) {
            foreach (['paid_cents', 'discount_cents', 'remaining_cents'] as $key) {
                $totals[$key] += (int) $i[$key];
            }
            $totals['original_cents'] += (int) $i['amount_cents'];
            foreach (['one', 'two'] as $p) {
                $totals[$p.'_original_cents'] += (int) $i['share_'.$p.'_cents'];
                $totals[$p.'_remaining_cents'] += $i['remaining_'.$p.'_cents'];
                $totals[$p.'_paid_cents'] += (int) $i['paid_'.$p.'_cents'];
            }
            if ($i['responsibility'] === 'shared') {
                $totals['shared_original_cents'] += (int) $i['amount_cents'];
                $totals['shared_remaining_cents'] += $i['remaining_cents'];
            }
        }
        $banks = $items->groupBy('institution_id')->map(fn ($rows) => ['id' => $rows->first()['institution_id'], 'name' => $rows->first()['institution_name'], 'original_cents' => $rows->sum('amount_cents'), 'remaining_cents' => $rows->sum('remaining_cents'), 'count' => $rows->count()])->values();
        $person = DB::table('cg_people')->where('user_id', $r->user()->id)->value('id');
        $personal = $items->filter(fn ($i) => $person && $i[$person === 1 ? 'remaining_one_cents' : 'remaining_two_cents'] > 0);

        return response()->json(['month' => $month->format('Y-m'), 'totals' => $totals, 'institutions' => $banks, 'count' => $items->count(), 'next_due' => $items->filter(fn ($i) => $i['remaining_cents'] > 0 && $i['due_on'] >= today()->toDateString())->take(5)->values(), 'overdue' => $items->filter(fn ($i) => $i['remaining_cents'] > 0 && $i['due_on'] < today()->toDateString())->take(5)->values(),
            'personal_next_due' => $personal->filter(fn ($i) => $i['due_on'] >= today()->toDateString())->take(5)->values(), 'personal_overdue' => $personal->filter(fn ($i) => $i['due_on'] < today()->toDateString())->take(5)->values()]);
    }

    public function debts(Request $r): JsonResponse
    {
        $month = $this->period($r);
        $this->control->ensureMonth($month);
        $r->validate(['q' => 'nullable|string|max:200', 'institution' => 'nullable|integer', 'type' => 'nullable|integer', 'person' => 'nullable|in:one,two,shared', 'status' => 'nullable|in:active,settled,cancelled', 'sort' => 'nullable|in:newest,oldest,name,value']);
        $aggregate = $this->control->installments()->select('i.debt_id')->selectRaw('SUM(i.amount_cents) AS original_cents, SUM(i.amount_cents - COALESCE(credits.credit_one, 0) - COALESCE(credits.credit_two, 0)) AS remaining_cents, SUM(CASE WHEN i.month_on = ? THEN i.amount_cents - COALESCE(credits.credit_one, 0) - COALESCE(credits.credit_two, 0) ELSE 0 END) AS month_remaining_cents', [$month->toDateString()])->groupBy('i.debt_id');
        $q = DB::table('cg_debts as d')->join('cg_institutions as bank', 'bank.id', '=', 'd.institution_id')->join('cg_types as type', 'type.id', '=', 'd.type_id')->leftJoinSub($aggregate, 'totals', fn ($j) => $j->on('totals.debt_id', '=', 'd.id'))
            ->select('d.*', 'bank.name as institution_name', 'bank.color', 'type.name as type_name', 'totals.original_cents', 'totals.remaining_cents', 'totals.month_remaining_cents');
        if ($search = trim((string) $r->query('q'))) {
            $q->where(fn ($q) => $q->where('d.name', 'like', '%'.$search.'%')->orWhere('bank.name', 'like', '%'.$search.'%'));
        }
        foreach (['institution' => 'd.institution_id', 'type' => 'd.type_id'] as $filter => $column) {
            if ($r->filled($filter)) {
                $q->where($column, $r->query($filter));
            }
        }
        if ($r->query('person') === 'shared') {
            $q->where('d.responsibility', 'shared');
        }
        if ($r->query('person') === 'one') {
            $q->where('d.percent_one', '>', 0);
        }
        if ($r->query('person') === 'two') {
            $q->where('d.percent_one', '<', 100);
        }
        $status = $r->query('status', 'active');
        if ($status === 'cancelled') {
            $q->whereNotNull('d.cancelled_at');
        } else {
            $q->whereNull('d.cancelled_at');
            $status === 'settled'
                ? $q->where('totals.remaining_cents', 0)->where(fn ($q) => $q->where('d.recurrence', '!=', 'monthly')->orWhereNotNull('d.ended_on'))
                : $q->where(fn ($q) => $q->where('totals.remaining_cents', '>', 0)->orWhere(fn ($q) => $q->where('d.recurrence', 'monthly')->whereNull('d.ended_on')));
        }
        match ($r->query('sort')) {
            'oldest' => $q->orderBy('d.id'), 'name' => $q->orderBy('d.name')->orderBy('d.id'), 'value' => $q->orderByDesc('totals.remaining_cents')->orderBy('d.id'), default => $q->orderByDesc('d.id')
        };

        return response()->json($q->paginate(20));
    }

    public function show(int $id): JsonResponse
    {
        $debt = DB::table('cg_debts as d')->join('cg_institutions as bank', 'bank.id', '=', 'd.institution_id')->join('cg_types as type', 'type.id', '=', 'd.type_id')->where('d.id', $id)->first(['d.*', 'bank.name as institution_name', 'type.name as type_name']);
        abort_unless($debt, 404);
        $items = $this->control->installments()->where('i.debt_id', $id)->orderBy('i.month_on')->get()->map(fn ($i) => $this->control->figures($i));
        $entries = DB::table('cg_entries as e')->join('cg_installments as i', 'i.id', '=', 'e.installment_id')->leftJoin('cg_operations as op', 'op.id', '=', 'e.operation_id')->leftJoin('users', 'users.id', '=', 'op.created_by')->where('i.debt_id', $id)->orderByDesc('e.id')->get(['e.*', 'i.number', 'i.month_on', 'users.name as recorded_by']);

        return response()->json(['debt' => $debt, 'installments' => $items, 'entries' => $entries, 'financial_locked' => $entries->isNotEmpty()]);
    }

    public function store(Request $r): JsonResponse
    {
        $data = $this->debtData($r);
        $id = $this->control->createDebt($r, $data);

        return response()->json($this->show($id)->getData(true), 201);
    }

    public function importPhoto(Request $r): JsonResponse
    {
        abort_if($r->files->count() > 0, 422, 'A foto deve ser lida no aparelho. Envie somente as compras conferidas.');
        $data = $r->validate([
            'request_key' => 'required|uuid', 'source_hash' => ['required', 'regex:/^[a-f0-9]{64}$/'],
            'institution_id' => 'required|integer|exists:cg_institutions,id',
            'start_month' => 'required|date_format:Y-m|after_or_equal:2000-01|before_or_equal:2099-12',
            'due_day' => 'required|integer|min:1|max:31', 'items' => 'required|array|min:1|max:100',
            'items.*' => 'required|array:request_key,reviewed,name,type_id,recurrence,responsibility,percent_one,amount_cents,installment_count,first_number,notes',
            'items.*.request_key' => 'required|uuid|distinct', 'items.*.reviewed' => 'required|accepted',
            'items.*.name' => 'required|string|max:200', 'items.*.type_id' => 'required|integer|exists:cg_types,id',
            'items.*.recurrence' => 'required|in:installments,once', 'items.*.responsibility' => 'required|in:one,two,shared',
            'items.*.percent_one' => 'required|integer|min:0|max:100',
            'items.*.amount_cents' => 'required|integer|min:1|max:100000000',
            'items.*.installment_count' => 'required|integer|min:1|max:360',
            'items.*.first_number' => 'required|integer|min:1', 'items.*.notes' => 'nullable|string|max:2000',
        ]);
        foreach ($data['items'] as $index => &$item) {
            foreach (['type_id', 'percent_one', 'amount_cents', 'installment_count', 'first_number'] as $key) {
                $item[$key] = (int) $item[$key];
            }
            $item['reviewed'] = true;
            abort_if($item['first_number'] > $item['installment_count'], 422, 'A parcela atual da compra '.($index + 1).' não pode superar o total de parcelas.');
            if ($item['recurrence'] === 'once') {
                abort_unless($item['first_number'] === 1 && $item['installment_count'] === 1, 422, 'Compra única possui somente uma parcela.');
            }
            $item['notes'] ??= null;
        }
        unset($item);
        $result = $this->control->importPhoto($r, $data);

        return response()->json($result, $result['replayed'] ? 200 : 201);
    }

    private function debtData(Request $r): array
    {
        $data = $r->validate(['request_key' => 'required|uuid', 'institution_id' => 'required|integer|exists:cg_institutions,id', 'type_id' => 'required|integer|exists:cg_types,id',
            'name' => 'required|string|max:200', 'recurrence' => 'required|in:installments,monthly,once', 'responsibility' => 'required|in:one,two,shared',
            'percent_one' => 'required|integer|min:0|max:100', 'amount_cents' => 'required|integer|min:1|max:100000000', 'installment_count' => 'required|integer|min:1|max:360',
            'first_number' => 'required|integer|min:1|lte:installment_count', 'start_month' => 'required|date_format:Y-m|after_or_equal:2000-01|before_or_equal:2099-12',
            'due_day' => 'required|integer|min:1|max:31', 'notes' => 'nullable|string|max:2000']);
        if ($data['recurrence'] !== 'installments') {
            $data['installment_count'] = 1;
            $data['first_number'] = 1;
        }

        return $data;
    }

    public function update(Request $r, int $id, Audit $audit): JsonResponse
    {
        $data = $r->validate(['name' => 'required|string|max:200', 'notes' => 'nullable|string|max:2000']);
        DB::transaction(function () use ($r, $id, $data, $audit) {
            $before = DB::table('cg_debts')->where('id', $id)->lockForUpdate()->first();
            abort_unless($before, 404);
            DB::table('cg_debts')->where('id', $id)->update([...$data, 'updated_at' => now()]);
            $audit->record($r, 'expense_control.debt_updated', 'expense_control', $id, $before, $data);
        });

        return $this->show($id);
    }

    public function installment(Request $r, int $id, Audit $audit): JsonResponse
    {
        $data = $r->validate(['amount_cents' => 'required|integer|min:1|max:100000000', 'percent_one' => 'required|integer|min:0|max:100', 'due_on' => 'required|date_format:Y-m-d']);
        DB::transaction(function () use ($r, $id, $data, $audit) {
            $parent = DB::table('cg_installments')->find($id);
            abort_unless($parent, 404);
            $debt = DB::table('cg_debts')->where('id', $parent->debt_id)->lockForUpdate()->first();
            abort_if($debt->cancelled_at, 422, 'Dívida cancelada.');
            $before = DB::table('cg_installments')->where('id', $id)->lockForUpdate()->first();
            abort_if(DB::table('cg_entries')->where('installment_id', $id)->exists(), 422, 'Esta parcela possui histórico. Corrija o lançamento ou registre um abatimento para preservar os valores originais.');
            abort_unless(substr($data['due_on'], 0, 7) === substr($before->month_on, 0, 7), 422, 'O vencimento precisa permanecer no mês da parcela.');
            $percent = match ($debt->responsibility) {
                'one' => 100, 'two' => 0, default => $data['percent_one']
            };
            [$one, $two] = $this->control->shares($data['amount_cents'], $percent);
            DB::table('cg_installments')->where('id', $id)->update(['amount_cents' => $data['amount_cents'], 'due_on' => $data['due_on'], 'share_one_cents' => $one, 'share_two_cents' => $two, 'updated_at' => now()]);
            $audit->record($r, 'expense_control.installment_updated', 'expense_control', $id, $before, $data);
        });

        return response()->json(['message' => 'Parcela atualizada.']);
    }

    public function operation(Request $r, Audit $audit): JsonResponse
    {
        $data = $r->validate(['request_key' => 'required|uuid', 'installment_ids' => 'required|array|min:1|max:100', 'installment_ids.*' => 'required|integer|distinct',
            'kind' => 'required|in:payment,advance,discount', 'target' => 'required|in:one,two,both', 'paid_by' => 'nullable|required_unless:kind,discount|integer|in:1,2',
            'amount_cents' => 'nullable|integer|min:1|max:100000000', 'occurred_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'notes' => 'nullable|string|max:500']);
        abort_if(count($data['installment_ids']) > 1 && isset($data['amount_cents']), 422, 'Pagamento parcial deve selecionar somente uma parcela.');

        return response()->json($this->control->record($r, $data, $audit), 201);
    }

    public function reverse(Request $r, int $id, Audit $audit): JsonResponse
    {
        $data = $r->validate(['reason' => 'required|string|min:5|max:500']);
        DB::transaction(function () use ($r, $id, $data, $audit) {
            $entry = DB::table('cg_entries')->find($id);
            abort_unless($entry, 404);
            $parent = DB::table('cg_installments')->find($entry->installment_id);
            DB::table('cg_debts')->where('id', $parent->debt_id)->lockForUpdate()->first();
            $entry = DB::table('cg_entries')->where('id', $id)->lockForUpdate()->first();
            if ($entry->reversed_at) {
                return;
            }
            DB::table('cg_entries')->where('id', $id)->update(['reversed_at' => now(), 'reversal_reason' => $data['reason'], 'reversed_by' => $r->user()->id, 'updated_at' => now()]);
            $audit->record($r, 'expense_control.entry_reversed', 'expense_control', $id, $entry, $data);
        });

        return response()->json(['message' => 'Lançamento desfeito; o histórico foi preservado.']);
    }

    public function cancel(Request $r, int $id, Audit $audit): JsonResponse
    {
        $data = $r->validate(['reason' => 'required|string|min:5|max:500']);
        DB::transaction(function () use ($r, $id, $data, $audit) {
            $before = DB::table('cg_debts')->where('id', $id)->lockForUpdate()->first();
            abort_unless($before, 404);
            if ($before->cancelled_at) {
                return;
            }
            DB::table('cg_debts')->where('id', $id)->update(['cancelled_at' => now(), 'cancellation_reason' => $data['reason'], 'updated_at' => now()]);
            $audit->record($r, 'expense_control.debt_cancelled', 'expense_control', $id, $before, $data);
        });

        return $this->show($id);
    }

    public function endRecurring(Request $r, int $id, Audit $audit): JsonResponse
    {
        $data = $r->validate(['end_month' => 'required|date_format:Y-m|after_or_equal:2000-01|before_or_equal:2099-12']);
        DB::transaction(function () use ($r, $id, $data, $audit) {
            $debt = DB::table('cg_debts')->where('id', $id)->lockForUpdate()->first();
            abort_unless($debt && $debt->recurrence === 'monthly' && ! $debt->cancelled_at, 422, 'Selecione uma despesa mensal ativa.');
            $end = $this->control->month($data['end_month'])->toDateString();
            abort_if($end < $debt->start_on, 422, 'O último mês deve ser igual ou posterior ao início.');
            $future = DB::table('cg_installments')->where('debt_id', $id)->where('month_on', '>', $end)->pluck('id');
            abort_if(DB::table('cg_entries')->whereIn('installment_id', $future)->exists(), 422, 'Há histórico após o mês escolhido. Selecione um mês posterior para preservá-lo.');
            DB::table('cg_installments')->whereIn('id', $future)->delete();
            DB::table('cg_debts')->where('id', $id)->update(['ended_on' => $end, 'updated_at' => now()]);
            $audit->record($r, 'expense_control.recurring_ended', 'expense_control', $id, $debt, $data);
        });

        return $this->show($id);
    }

    public function projection(Request $r): JsonResponse
    {
        $start = $this->period($r);
        $months = [];
        for ($n = 0; $n < 12; $n++) {
            $this->control->ensureMonth($start->addMonths($n));
        }
        $all = $this->control->installments()->whereNull('d.cancelled_at')->whereBetween('i.month_on', [$start->toDateString(), $start->addMonths(11)->toDateString()])->get()->map(fn ($i) => $this->control->figures($i))->groupBy('month_on');
        for ($n = 0; $n < 12; $n++) {
            $date = $start->addMonths($n);
            $items = $all->get($date->toDateString(), collect());
            $months[] = ['month' => $date->format('Y-m'), 'remaining_cents' => $items->sum('remaining_cents'), 'one_cents' => $items->sum('remaining_one_cents'), 'two_cents' => $items->sum('remaining_two_cents'), 'shared_cents' => $items->where('responsibility', 'shared')->sum('remaining_cents'), 'count' => $items->filter(fn ($i) => $i['remaining_cents'] > 0)->count()];
        }

        return response()->json($months);
    }

    public function advances(Request $r): JsonResponse
    {
        $month = $this->period($r);

        return response()->json(DB::table('cg_entries as e')->join('cg_installments as i', 'i.id', '=', 'e.installment_id')->join('cg_debts as d', 'd.id', '=', 'i.debt_id')->join('cg_institutions as bank', 'bank.id', '=', 'd.institution_id')->where('i.month_on', $month->toDateString())->orderByDesc('e.id')->select('e.*', 'd.name', 'bank.name as institution_name', 'i.number', 'i.month_on')->paginate(20));
    }

    public function activity(): JsonResponse
    {
        return response()->json(DB::table('audit_logs')->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')->where('subject_type', 'expense_control')->orderByDesc('audit_logs.id')->select('audit_logs.id', 'audit_logs.action', 'audit_logs.created_at', 'users.name as user_name')->paginate(20));
    }
}
