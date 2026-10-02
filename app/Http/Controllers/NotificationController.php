<?php

namespace App\Http\Controllers;

use App\Services\SupplierPayables;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role && in_array($request->user()->role->name, ['Master', 'Administrador'], true)) {
            app(SupplierPayables::class)->remind();
        }
        $query = DB::table('notifications')->where('user_id', $request->user()->id)->where('active', true);
        if (! in_array($request->user()->role?->name, ['Master', 'Administrador'], true)) {
            $query->where('type', '!=', 'supplier_due');
        }

        return response()->json(['unread' => (clone $query)->whereNull('read_at')->count(), 'data' => $query->latest()->limit(50)->get()]);
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        abort_unless(DB::table('notifications')->where('id', $notification)->where('user_id', $request->user()->id)->update(['read_at' => now(), 'updated_at' => now()]), 404);

        return response()->json(['ok' => true]);
    }

    public function readAll(Request $request): JsonResponse
    {
        DB::table('notifications')->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
