<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PushSubscriptionController extends Controller
{
    public function configuration(): JsonResponse
    {
        return response()->json(['public_key' => config('webpush.public_key'), 'configured' => filled(config('webpush.public_key')) && filled(config('webpush.private_key'))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['endpoint' => 'required|url|max:4096', 'keys.p256dh' => 'required|string|max:1024', 'keys.auth' => 'required|string|max:1024', 'content_encoding' => 'nullable|in:aes128gcm,aesgcm']);
        $hash = hash('sha256', $data['endpoint']);
        $owner = DB::table('push_subscriptions')->where('endpoint_hash', $hash)->value('user_id');
        abort_if($owner && $owner !== $request->user()->id, 409, 'Esta inscrição pertence a outro usuário.');
        DB::table('push_subscriptions')->updateOrInsert(['endpoint_hash' => $hash], ['user_id' => $request->user()->id, 'endpoint' => $data['endpoint'], 'public_key' => $data['keys']['p256dh'], 'auth_token' => $data['keys']['auth'], 'content_encoding' => $data['content_encoding'] ?? 'aes128gcm', 'last_used_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['ok' => true], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['endpoint' => 'required|url|max:4096']);
        DB::table('push_subscriptions')->where('endpoint_hash', hash('sha256', $data['endpoint']))->where('user_id', $request->user()->id)->delete();

        return response()->json(['ok' => true]);
    }
}
