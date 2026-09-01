<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('notifications')->where('user_id', $request->user()->id)->where('active', true);

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
