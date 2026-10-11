<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireExpenseAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->canUseExpenseControl(), 403, 'Controle de Gasto disponível somente para contas autorizadas.');

        return $next($request);
    }
}
