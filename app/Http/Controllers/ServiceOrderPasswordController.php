<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceOrderPasswordController extends Controller
{
    public function show(Request $request, ServiceOrder $order): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403);
        abort_if($order->getRawOriginal('system_password') === null, 404, 'Esta OS não possui senha do sistema cadastrada.');

        try {
            $password = $order->system_password;
        } catch (DecryptException) {
            // Senha de outra instalação/APP_KEY: não apagar nem expor o dado cifrado.
            return response()->json([
                'message' => 'Esta senha antiga foi criptografada com outra chave. A OS continua acessível; para consultar a senha, recupere a chave original ou cadastre uma nova senha na OS.',
                'code' => 'SYSTEM_PASSWORD_KEY_MISMATCH',
            ], 409)->header('Cache-Control', 'no-store, private');
        }

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

        return response()->json(['password' => $password])
            ->header('Cache-Control', 'no-store, private')
            ->header('Pragma', 'no-cache');
    }
}
