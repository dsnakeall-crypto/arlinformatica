<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

class WebPushService
{
    public function sendToUser(int $userId, array $payload): array
    {
        if (! class_exists(WebPush::class) || ! filled(config('webpush.private_key'))) {
            return ['status' => 'not_configured', 'accepted' => 0];
        }
        $subscriptions = DB::table('push_subscriptions')->where('user_id', $userId)->get();
        if ($subscriptions->isEmpty()) {
            return ['status' => 'no_subscription', 'accepted' => 0];
        }
        try {
            $webPush = new WebPush(['VAPID' => ['subject' => config('webpush.subject'), 'publicKey' => config('webpush.public_key'), 'privateKey' => config('webpush.private_key')]]);
            foreach ($subscriptions as $row) {
                $subscription = Subscription::create(['endpoint' => $row->endpoint, 'publicKey' => $row->public_key, 'authToken' => $row->auth_token, 'contentEncoding' => $row->content_encoding]);
                $webPush->queueNotification($subscription, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            }
            $accepted = 0;
            foreach ($webPush->flush() as $report) {
                $hash = hash('sha256', $report->getRequest()->getUri()->__toString());
                if ($report->isSuccess()) {
                    $accepted++;
                    DB::table('push_subscriptions')->where('endpoint_hash', $hash)->update(['last_used_at' => now(), 'updated_at' => now()]);
                } elseif ($report->isSubscriptionExpired()) {
                    DB::table('push_subscriptions')->where('endpoint_hash', $hash)->delete();
                    $this->auditInvalid($userId);
                } else {
                    Log::warning('Web Push temporariamente recusado.', ['endpoint_hash' => substr($hash, 0, 12), 'reason' => $report->getReason()]);
                }
            }

            return ['status' => 'sent_to_service', 'accepted' => $accepted];
        } catch (Throwable $e) {
            Log::warning('Web Push falhou sem interromper a notificação interna.', ['exception' => $e::class]);

            return ['status' => 'error', 'accepted' => 0];
        }
    }

    public function sendToUsers(iterable $userIds, array $payload): void
    {
        foreach ($userIds as $id) {
            $this->sendToUser((int) $id, $payload);
        }
    }

    private function auditInvalid(int $userId): void
    {
        DB::table('audit_logs')->insert(['user_id' => $userId, 'action' => 'push.subscription_invalid_removed', 'subject_type' => 'push_subscription', 'created_at' => now()]);
    }
}
