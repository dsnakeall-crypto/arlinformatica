<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    private const TABLES = ['equipment' => 'equipment_types', 'manufacturers' => 'manufacturers', 'services' => 'service_catalog'];

    public function index(Request $request, string $catalog): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        $query = DB::table($table)->orderBy('name');
        if ($request->boolean('active', true)) {
            $query->where('active', true);
        }
        if ($search = trim((string) $request->query('q'))) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request, string $catalog, Audit $audit): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        $rules = ['name' => ['required', 'string', 'max:255', Rule::unique($table)], 'active' => 'boolean'];
        if ($catalog === 'services') {
            $rules += ['category' => 'nullable|in:service,product', 'price_cents' => 'required|integer|min:0', 'warranty_enabled' => 'boolean', 'warranty_term' => 'nullable|integer|min:1', 'warranty_unit' => 'nullable|in:days,months,years'];
        }
        $this->addWarrantyRules($rules, $catalog);
        $data = $request->validate($rules);
        $this->validateWarranty($data, $catalog);
        $id = DB::table($table)->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $record = DB::table($table)->find($id);
        $audit->record($request, 'catalog.created', $table, $id, null, $record);

        return response()->json($record, 201);
    }

    public function update(Request $request, string $catalog, int $id, Audit $audit): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        abort_unless(DB::table($table)->where('id', $id)->exists(), 404);
        $rules = ['name' => ['sometimes', 'string', 'max:255', Rule::unique($table)->ignore($id)], 'active' => 'sometimes|boolean', 'category' => 'sometimes|nullable|in:service,product', 'price_cents' => 'sometimes|integer|min:0'];
        $this->addWarrantyRules($rules, $catalog, true);
        $data = $request->validate($rules);
        $this->validateWarranty($data, $catalog);
        $before = DB::table($table)->find($id);
        DB::table($table)->where('id', $id)->update($data + ['updated_at' => now()]);
        $record = DB::table($table)->find($id);
        $audit->record($request, 'catalog.updated', $table, $id, $before, $record);

        return response()->json($record);
    }

    public function checklist(Request $request): JsonResponse
    {
        return response()->json(DB::table('checklist_templates')->when($request->boolean('active', true), fn ($q) => $q->where('active', true))->when($request->integer('equipment_type_id'), fn ($q, $id) => $q->where('equipment_type_id', $id))->orderBy('position')->orderBy('label')->get());
    }

    public function storeChecklist(Request $request, Audit $audit): JsonResponse
    {
        $data = $request->validate(['equipment_type_id' => 'required|exists:equipment_types,id', 'label' => ['required', 'string', 'max:255', Rule::unique('checklist_templates')->where('equipment_type_id', $request->integer('equipment_type_id'))], 'allows_note' => 'boolean', 'position' => 'integer|min:0|max:10000']);
        $id = DB::table('checklist_templates')->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $record = DB::table('checklist_templates')->find($id);
        $audit->record($request, 'checklist.created', 'checklist_templates', $id, null, $record);

        return response()->json($record, 201);
    }

    public function updateChecklist(Request $request, int $id, Audit $audit): JsonResponse
    {
        $before = DB::table('checklist_templates')->find($id) ?? abort(404);
        $data = $request->validate(['label' => ['sometimes', 'string', 'max:255', Rule::unique('checklist_templates')->where('equipment_type_id', $before->equipment_type_id)->ignore($id)], 'allows_note' => 'sometimes|boolean', 'position' => 'sometimes|integer|min:0|max:10000', 'active' => 'sometimes|boolean']);
        DB::table('checklist_templates')->where('id', $id)->update($data + ['updated_at' => now()]);
        $record = DB::table('checklist_templates')->find($id);
        $audit->record($request, 'checklist.updated', 'checklist_templates', $id, $before, $record);

        return response()->json($record);
    }

    private function addWarrantyRules(array &$rules, string $catalog, bool $sometimes = false): void
    {
        if ($catalog === 'services') {
            $prefix = $sometimes ? 'sometimes|' : '';
            $rules += ['warranty_enabled' => $prefix.'boolean', 'warranty_term' => $prefix.'nullable|integer|min:1|max:9999', 'warranty_unit' => $prefix.'nullable|in:days,months,years'];
        }
    }

    private function validateWarranty(array $data, string $catalog): void
    {
        if ($catalog === 'services' && ($data['warranty_enabled'] ?? false)) {
            validator($data, ['warranty_term' => 'required|integer|min:1', 'warranty_unit' => 'required|in:days,months,years'])->validate();
        }
    }
}
