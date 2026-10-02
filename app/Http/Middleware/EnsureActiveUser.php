<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->active) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'message' => 'Sua conta está desativada. Solicite ao responsável a liberação do acesso.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 401)->header('Cache-Control', 'no-store, private');
        }

        return redirect()->route('login');
    }
}
