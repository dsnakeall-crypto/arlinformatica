<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Services\ExpenseControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpenseVehiclesController extends Controller
{
    public function __construct(private ExpenseControl $control) {}

    public function index(Request $request): JsonResponse
    {
        $parameters = $request->validate(['page' => 'nullable|integer|min:1|max:100000']);
        $page = (int) ($parameters['page'] ?? 1);
        $vehicles = DB::table('cg_vehicles')->orderBy('name')->get();
        $events = DB::table('cg_vehicle_events as e')
            ->join('cg_vehicles as v', 'v.id', '=', 'e.vehicle_id')
            ->join('cg_debts as d', 'd.id', '=', 'e.debt_id')
            ->leftJoin('cg_institutions as bank', 'bank.id', '=', 'e.institution_id')
            ->select('e.*', 'v.name as vehicle_name', 'bank.name as institution_name',
                'd.cancelled_at as debt_cancelled_at')
            ->orderByDesc('e.occurred_on')->orderByDesc('e.id')->skip(($page - 1) * 30)->take(31)->get();
        $hasMore = $events->count() > 30;
        $events = $events->take(30)->values();
        $ids = $events->pluck('id');
        $items = $ids->isEmpty() ? collect() : DB::table('cg_vehicle_event_items')
            ->whereIn('vehicle_event_id', $ids)->orderBy('position')->get()->groupBy('vehicle_event_id');
        $events->transform(function ($e) use ($items) {
            $e->items = $items->get($e->id, collect())->values();

            return $e;
        });

        return response()->json(['vehicles' => $vehicles, 'events' => $events, 'next_page' => $hasMore ? $page + 1 : null])
            ->header('Cache-Control', 'no-store, private');
    }

    public function vehicle(Request $request, Audit $audit): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|min:2|max:120',
            'plate' => ['nullable', 'string', 'max:12', 'regex:/^[A-Za-z0-9 -]+$/'],
            'notes' => 'nullable|string|max:1000',
        ]);
        $id = DB::table('cg_vehicles')->insertGetId([
            ...$data, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $audit->record($request, 'expense_control.vehicle_created', 'expense_control_vehicle', $id, null, $data);

        return response()->json(['id' => $id, 'message' => 'Veículo cadastrado.'], 201);
    }

    public function event(Request $request, Audit $audit): JsonResponse
    {
        $data = $request->validate([
            'request_key' => 'required|uuid',
            'vehicle_id' => 'required|integer|exists:cg_vehicles,id',
            'kind' => 'required|in:wash,maintenance',
            'occurred_on' => 'required|date_format:Y-m-d|after_or_equal:2000-01|before_or_equal:today',
            'location' => 'required_if:kind,maintenance|nullable|string|max:180',
            'odometer_km' => 'nullable|integer|min:0|max:9999999',
            'next_due_on' => 'nullable|date_format:Y-m-d|after_or_equal:occurred_on',
            'next_due_km' => 'nullable|integer|min:0|max:9999999',
            'work_notes' => 'nullable|string|max:3000',
            'attention_notes' => 'nullable|string|max:2000',
            'responsibility' => 'required|in:one,two,shared',
            'institution_id' => 'required|integer|exists:cg_institutions,id',
            'type_id' => 'required|integer|exists:cg_types,id',
            'amount_cents' => 'required|integer|min:1|max:100000000',
            'items' => 'array|max:60',
            'items.*.description' => 'required|string|max:180',
            'items.*.amount_cents' => 'required|integer|min:0|max:100000000',
        ]);
        if ($data['kind'] === 'wash') {
            foreach (['next_due_on', 'next_due_km', 'attention_notes', 'work_notes', 'odometer_km'] as $key) {
                $data[$key] = null;
            }
            $data['items'] = [];
        }
        if (isset($data['next_due_km'], $data['odometer_km']) && $data['next_due_km'] <= $data['odometer_km']) {
            throw ValidationException::withMessages(['next_due_km' => 'A próxima revisão deve ter quilometragem maior que a atual.']);
        }
        $partsTotal = array_sum(array_column($data['items'] ?? [], 'amount_cents'));
        if ($partsTotal > $data['amount_cents']) {
            throw ValidationException::withMessages(['amount_cents' => 'O total não pode ser inferior à soma dos itens.']);
        }
        $hash = hash('sha256', json_encode($data));
        $result = DB::transaction(function () use ($request, $audit, $data, $hash) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $old = DB::table('cg_vehicle_events')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless((int) $old->created_by === (int) $request->user()->id
                    && hash_equals($old->payload_hash, $hash), 409, 'Esta solicitação já foi usada com outros dados.');

                return ['id' => $old->id, 'debt_id' => $old->debt_id, 'replayed' => true];
            }
            $defaultPercent = (int) DB::table('cg_people')->where('id', 1)->value('default_percent');
            $vehicleName = DB::table('cg_vehicles')->where('id', $data['vehicle_id'])->value('name');
            $debtId = $this->control->createDebt($request, [
                'request_key' => $data['request_key'],
                'institution_id' => $data['institution_id'],
                'type_id' => $data['type_id'],
                'name' => ($data['kind'] === 'wash' ? 'Lavagem' : 'Manutenção').' - '.$vehicleName,
                'recurrence' => 'once',
                'responsibility' => $data['responsibility'],
                'percent_one' => $defaultPercent,
                'amount_cents' => $data['amount_cents'],
                'installment_count' => 1,
                'first_number' => 1,
                'start_month' => substr($data['occurred_on'], 0, 7),
                'due_day' => (int) substr($data['occurred_on'], 8, 2),
                'notes' => $data['kind'] === 'maintenance'
                    ? mb_substr(($data['work_notes'] ?? '').' | Local: '.($data['location'] ?? '-'), 0, 2000)
                    : 'Lavagem de veículo - '.($data['location'] ?? 'local não informado'),
            ]);
            $items = $data['items'] ?? [];
            unset($data['items']);
            $id = DB::table('cg_vehicle_events')->insertGetId([
                ...$data, 'payload_hash' => $hash, 'debt_id' => $debtId,
                'percent_one' => $data['responsibility'] === 'one' ? 100 : ($data['responsibility'] === 'two' ? 0 : $defaultPercent),
                'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($items as $index => $item) {
                DB::table('cg_vehicle_event_items')->insert([
                    'vehicle_event_id' => $id, 'description' => $item['description'],
                    'amount_cents' => $item['amount_cents'], 'position' => $index + 1,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $audit->record($request, 'expense_control.vehicle_event_created', 'expense_control_vehicle_event', $id,
                null, ['kind' => $data['kind'], 'vehicle_id' => $data['vehicle_id'],
                    'amount_cents' => $data['amount_cents'], 'debt_id' => $debtId]);

            return ['id' => $id, 'debt_id' => $debtId, 'replayed' => false];
        }, 3);

        return response()->json($result, $result['replayed'] ? 200 : 201)
            ->header('Cache-Control', 'no-store, private');
    }
}
