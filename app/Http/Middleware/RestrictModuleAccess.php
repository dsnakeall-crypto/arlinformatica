<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictModuleAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->user()?->role?->name;
        if (! $request->is('api/*') || ! in_array($role, ['Controle de Gasto', 'Usuário local'], true)) {
            return $next($request);
        }
        $common = $request->is('api/me', 'api/me/sidebar') || ($request->isMethod('GET') && $request->is('api/settings/logo/menu', 'api/settings/logo/app'));
        if ($role === 'Controle de Gasto') {
            $notifications = ($request->isMethod('GET') && $request->is('api/notifications', 'api/push/configuration'))
                || ($request->isMethod('PATCH') && $request->is('api/notifications/*'))
                || ($request->isMethod('POST') && $request->is('api/push/subscriptions'))
                || ($request->isMethod('DELETE') && $request->is('api/push/subscriptions'));
            abort_unless($common || $notifications || $request->is('api/expense-control/*'), 403, 'Este perfil acessa somente o Controle de Gasto.');
        } else {
            $read = $request->isMethod('GET') && $request->is('api/clients', 'api/clients/*', 'api/orders', 'api/orders/*', 'api/catalogs/*', 'api/operational-settings', 'api/navigation-summary', 'api/notifications', 'api/push/configuration');
            $create = $request->isMethod('POST') && $request->is('api/clients', 'api/orders', 'api/orders/*/photos', 'api/push/subscriptions');
            abort_unless($common || $read || $create, 403, 'Este perfil permite consultar e abrir chamados e cadastrar clientes.');
        }

        return $next($request);
    }
}
