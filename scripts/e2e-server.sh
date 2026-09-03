#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${ROOT}/database/e2e.sqlite"
rm -f "$DB"
touch "$DB"

export APP_ENV=testing APP_DEBUG=false APP_KEY='base64:7n9S6t2H7Hn23xH5H3YgNnLh6dI0vY7Hc7Jt6nD6m1M='
export DB_CONNECTION=sqlite DB_DATABASE="$DB"
export SESSION_DRIVER=file CACHE_STORE=array QUEUE_CONNECTION=sync

cd "$ROOT"
php artisan migrate:fresh --seed --force
php artisan db:seed --class=E2ESeeder --force

SERVER_ROUTER="$ROOT/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"
cd "$ROOT/public"

exec php -S 127.0.0.1:8000 "$SERVER_ROUTER"
