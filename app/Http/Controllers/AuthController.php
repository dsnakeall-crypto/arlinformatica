<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $credentials = $r->validate(['login' => 'required|string', 'password' => 'required|string']);
        if (! Auth::attempt([...$credentials, 'active' => true], $r->boolean('remember'))) {
            throw ValidationException::withMessages(['login' => 'Credenciais inválidas.']);
        }
        $r->session()->regenerate();

        return response()->json(['user' => $r->user()->load('role')]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role:id,name');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'login' => $user->login,
            'role' => $user->role->name,
        ]);
    }

    public function logout(Request $r)
    {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->noContent();
    }
}
