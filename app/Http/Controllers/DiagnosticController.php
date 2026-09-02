<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Services\DiagnosticService;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagnosticController extends Controller
{
    public function show(Request $request, DiagnosticService $service, Audit $audit): JsonResponse
    {
        $audit->record($request, 'diagnostic.viewed', 'system', null);

        return response()->json($service->run());
    }

    public function testPush(Request $request, WebPushService $push, Audit $audit): JsonResponse
    {
        $result = $push->sendToUser($request->user()->id, ['title' => 'Teste ARL Informática', 'body' => 'As notificações deste dispositivo estão configuradas.', 'url' => '/settings', 'type' => 'test']);
        $audit->record($request, 'push.tested', 'user', $request->user()->id, null, $result);

        return response()->json($result, $result['status'] === 'error' ? 422 : 200);
    }
}
