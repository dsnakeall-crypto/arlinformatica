<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    private const TABLES = ['equipment' => 'equipment_types', 'manufacturers' => 'manufacturers', 'services' => 'service_catalog'];

    public function index(string $catalog): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        $query = DB::table($table)->orderBy('name');
        if (request()->boolean('active', true)) {
            $query->where('active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request, string $catalog): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        $rules = ['name' => ['required', 'string', 'max:255', Rule::unique($table)], 'active' => 'boolean'];
        if ($catalog === 'services') {
            $rules += ['category' => 'nullable|in:service,product', 'price_cents' => 'required|integer|min:0', 'warranty_enabled' => 'boolean', 'warranty_term' => 'nullable|integer|min:1', 'warranty_unit' => 'nullable|in:days,months,years'];
        }
        $data = $request->validate($rules);
        $id = DB::table($table)->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(DB::table($table)->find($id), 201);
    }

    public function update(Request $request, string $catalog, int $id): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        abort_unless(DB::table($table)->where('id', $id)->exists(), 404);
        $data = $request->validate(['name' => ['sometimes', 'string', 'max:255', Rule::unique($table)->ignore($id)], 'active' => 'sometimes|boolean', 'category' => 'sometimes|nullable|in:service,product', 'price_cents' => 'sometimes|integer|min:0']);
        DB::table($table)->where('id', $id)->update($data + ['updated_at' => now()]);

        return response()->json(DB::table($table)->find($id));
    }

    public function checklist(Request $request): JsonResponse
    {
        return response()->json(DB::table('checklist_templates')->where('active', true)->when($request->integer('equipment_type_id'), fn ($q, $id) => $q->where('equipment_type_id', $id))->orderBy('label')->get());
    }
}
