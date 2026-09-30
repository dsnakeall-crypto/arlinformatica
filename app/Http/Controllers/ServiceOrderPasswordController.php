<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceOrderPasswordController extends Controller
{
    public function show(Request $request, ServiceOrder $order): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403);
        abort_if($order->system_password === null, 404, 'Esta OS não possui senha do sistema cadastrada.');

        DB::table('audit_logs')->insert([
            'user_id' => $request->user()->id,
            'action' => 'service_order.system_password_viewed',
            'subject_type' => 'service_order',
            'subject_id' => $order->id,
            'before' => null,
            'after' => json_encode(['viewer' => $request->user()->name]),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json(['password' => $order->system_password])
            ->header('Cache-Control', 'no-store, private')
            ->header('Pragma', 'no-cache');
    }
}
