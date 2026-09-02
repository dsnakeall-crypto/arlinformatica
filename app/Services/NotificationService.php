<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationService
{
    public function __construct(private readonly WebPushService $push) {}

    public function notifyUsers(string $type, string $title, string $description, string $url, string $key, array $data = []): void
    {
        $recipients = [];
        User::query()->where('active', true)->whereHas('role', fn ($query) => $query->whereIn('name', ['Master', 'Administrador', 'Funcionário']))->each(function (User $user) use ($type, $title, $description, $url, $key, $data, &$recipients) {
            $inserted = DB::table('notifications')->insertOrIgnore([
                'id' => (string) Str::uuid(), 'user_id' => $user->id, 'type' => $type, 'deduplication_key' => $key,
                'title' => $title, 'description' => $description, 'url' => $url, 'data' => json_encode($data),
                'active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($inserted) {
                $recipients[] = $user->id;
            }
        });
        $this->push->sendToUsers($recipients, ['title' => $title, 'body' => $description, 'url' => $url, 'type' => $type, 'id' => $data['service_order_id'] ?? $data['client_id'] ?? null]);
    }

    public function resolve(string $key): void
    {
        DB::table('notifications')->where('deduplication_key', $key)->update(['active' => false, 'read_at' => now(), 'updated_at' => now()]);
    }
}
