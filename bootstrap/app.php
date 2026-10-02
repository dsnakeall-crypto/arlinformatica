<?php

use App\Http\Middleware\DiscardInvalidRememberCookie;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\RequireRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo('/login');
        $middleware->api(prepend: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            ValidateCsrfToken::class,
        ]);
        $middleware->web(append: [DiscardInvalidRememberCookie::class, EnsureActiveUser::class]);
        $middleware->api(append: [DiscardInvalidRememberCookie::class, EnsureActiveUser::class]);
        $middleware->alias(['role' => RequireRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
        $exceptions->render(function (HttpException $exception, Request $request) {
            if ($exception->getStatusCode() === 419 && ($request->is('api/*') || $request->expectsJson())) {
                return response()->json([
                    'message' => 'Sua sessão expirou. Verifique a sessão antes de tentar salvar novamente.',
                    'code' => 'SESSION_EXPIRED',
                ], 419)->header('Cache-Control', 'no-store, private');
            }
        });
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Seu acesso foi encerrado. Entre novamente para continuar.',
                    'code' => 'UNAUTHENTICATED',
                ], 401)->header('Cache-Control', 'no-store, private');
            }
        });
    })->create();
