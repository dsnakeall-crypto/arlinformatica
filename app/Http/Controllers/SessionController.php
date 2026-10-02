<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function csrfToken(Request $request): JsonResponse
    {
        // Same-origin callers may refresh their own session token. No user data
        // or authorization is granted by this endpoint, including for guests.
        return response()->json([
            'csrf_token' => $request->session()->token(),
            'authenticated' => $request->user() !== null,
        ])->header('Cache-Control', 'no-store, private');
    }
}
