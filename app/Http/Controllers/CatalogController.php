<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    private const TABLES = [
        'equipment' => 'equipment_types',
        'manufacturers' => 'manufacturers',
        'services' => 'service_catalog',
        'products' => 'service_catalog',
        'items' => 'service_catalog',
    ];

    public function index(Request $request, string $catalog): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        $query = DB::table($table);
        if (in_array($catalog, ['services', 'products', 'items'], true)) {
            $query->select($table.'.*')->selectSub(function ($usage) use ($table) {
                $usage->from('service_order_items')
                    ->selectRaw('COUNT(DISTINCT service_order_id)')
                    ->whereColumn('service_order_items.catalog_id', $table.'.id');
            }, 'usage_count');

            if ($catalog === 'services') {
                $query->where(fn ($services) => $services->where('category', 'service')->orWhereNull('category'));
            } elseif ($catalog === 'products') {
                $query->where('category', 'product');
            }
        }
        $query->orderBy('name');
        if ($request->boolean('active', true)) {
            $query->where('active', true);
        }
        if ($search = trim((string) $request->query('q'))) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request, string $catalog, Audit $audit, InventoryService $inventory): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        abort_unless(in_array($catalog, ['equipment', 'manufacturers', 'services', 'products'], true), 404);
        $rules = ['name' => ['required', 'string', 'max:255', Rule::unique($table)], 'active' => 'boolean'];
        if (in_array($catalog, ['services', 'products'], true)) {
            $rules += ['price_cents' => 'required|integer|min:0', 'warranty_enabled' => 'boolean', 'warranty_term' => 'nullable|integer|min:1', 'warranty_unit' => 'nullable|in:days,months,years'];
        }
        if ($catalog === 'products') {
            $rules['stock_quantity'] = 'required|integer|min:0|max:4294967295';
        }
        $this->addWarrantyRules($rules, $catalog);
        $data = $request->validate($rules);
        $this->validateWarranty($data, $catalog);
        if (in_array($catalog, ['services', 'products'], true)) {
            $data['category'] = $catalog === 'products' ? 'product' : 'service';
        }
        $initialStock = $catalog === 'products' ? (int) ($data['stock_quantity'] ?? 0) : 0;
        if ($catalog === 'products') {
            $data['stock_quantity'] = 0;
        }
        $record = DB::transaction(function () use ($data, $table, $catalog, $initialStock, $request, $audit, $inventory) {
            $id = DB::table($table)->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
            if ($catalog === 'products' && $initialStock > 0) {
                $inventory->addStock($id, $initialStock, 'Saldo inicial do cadastro do produto', $request->user()->id);
            }
            $created = DB::table($table)->find($id);
            $audit->record($request, 'catalog.created', $table, $id, null, $created);

            return $created;
        });

        return response()->json($record, 201);
    }

    public function stockMovements(int $id): JsonResponse
    {
        abort_unless(DB::table('service_catalog')->where('id', $id)->where('category', 'product')->exists(), 404);

        return response()->json(DB::table('stock_movements')
            ->leftJoin('users', 'users.id', '=', 'stock_movements.user_id')
            ->where('product_id', $id)
            ->latest('stock_movements.id')
            ->limit(100)
            ->get(['stock_movements.*', 'users.name as user_name']));
    }

    public function stockEntry(Request $request, int $id, InventoryService $inventory): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1|max:4294967295',
            'reason' => 'required|string|max:500',
        ]);
        $record = $inventory->addStock(
            $id,
            (int) $data['quantity'],
            trim($data['reason']),
            $request->user()->id,
        );

        return response()->json($record);
    }

    public function update(Request $request, string $catalog, int $id, Audit $audit): JsonResponse
    {
        $table = self::TABLES[$catalog] ?? abort(404);
        abort_unless(in_array($catalog, ['equipment', 'manufacturers', 'services', 'products'], true), 404);
        $recordQuery = DB::table($table)->where('id', $id);
        if ($catalog === 'services') {
            $recordQuery->where(fn ($services) => $services->where('category', 'service')->orWhereNull('category'));
        } elseif ($catalog === 'products') {
            $recordQuery->where('category', 'product');
        }
        abort_unless($recordQuery->exists(), 404);
        $rules = ['name' => ['sometimes', 'string', 'max:255', Rule::unique($table)->ignore($id)], 'active' => 'sometimes|boolean', 'price_cents' => 'sometimes|integer|min:0'];
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
        if (in_array($catalog, ['services', 'products'], true)) {
            $prefix = $sometimes ? 'sometimes|' : '';
            $rules += ['warranty_enabled' => $prefix.'boolean', 'warranty_term' => $prefix.'nullable|integer|min:1|max:9999', 'warranty_unit' => $prefix.'nullable|in:days,months,years'];
        }
    }

    private function validateWarranty(array $data, string $catalog): void
    {
        if (in_array($catalog, ['services', 'products'], true) && ($data['warranty_enabled'] ?? false)) {
            validator($data, ['warranty_term' => 'required|integer|min:1', 'warranty_unit' => 'required|in:days,months,years'])->validate();
        }
    }
}
