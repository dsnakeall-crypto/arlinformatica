<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

class DiscardInvalidRememberCookie
{
    public function __construct(private readonly AuthFactory $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $name = $this->auth->guard('web')->getRecallerName();

        if (! $request->cookies->has($name) || $this->isValid($request->cookies->get($name))) {
            return $next($request);
        }

        $request->cookies->remove($name);

        if ($request->is('api/*')) {
            return response()
                ->json(['message' => 'Unauthenticated.'], 401)
                ->withCookie(Cookie::forget($name));
        }

        return $next($request)->withCookie(Cookie::forget($name));
    }

    private function isValid(mixed $value): bool
    {
        if (! is_string($value)) {
            return false;
        }

        $segments = explode('|', $value);

        return count($segments) === 3 && collect($segments)->every(
            fn (string $segment): bool => trim($segment) !== '',
        );
    }
}
