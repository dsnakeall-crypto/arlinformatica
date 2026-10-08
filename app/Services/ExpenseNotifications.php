<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ExpenseNotifications
{
    public function debt(Request $request, object $debt): void
    {
        $this->send($request, 'debt:'.$debt->id, 'Dívida cadastrada', collect([$debt]), (int) $debt->amount_cents * ($debt->recurrence === 'installments' ? $debt->installment_count - $debt->first_number + 1 : 1));
    }

    public function operation(Request $request, int $id): void
    {
        $entries = DB::table('cg_entries')->where('operation_id', $id)->whereIn('kind', ['payment', 'advance'])->get();
        if ($entries->isEmpty()) {
            return;
        }
        $debts = DB::table('cg_debts')->whereIn('id', DB::table('cg_installments')->whereIn('id', $entries->pluck('installment_id'))->pluck('debt_id'))->get();
        $this->send($request, 'operation:'.$id, 'Pagamento / quitação registrado', $debts, (int) $entries->sum('amount_cents'));
    }

    private function send(Request $request, string $key, string $event, $debts, int $amount): void
    {
        $people = DB::table('cg_people')->pluck('name', 'id');
        $details = $debts->map(fn ($d) => ['id' => $d->id, 'name' => $d->name, 'responsibility' => $d->responsibility === 'shared' ? 'Casal' : ($people[$d->responsibility === 'one' ? 1 : 2] ?? 'Responsável')])->values();
        $description = Str::limit($request->user()->name.' · '.$event.' · R$ '.number_format($amount / 100, 2, ',', '.').' · '.$details->map(fn ($d) => $d['name'].' ('.$d['responsibility'].')')->implode('; '), 250);
        $data = ['event' => $event, 'actor' => $request->user()->name, 'amount_cents' => $amount, 'debts' => $details];
        $recipients = User::query()->where('active', true)->whereHas('role', fn ($q) => $q->whereIn('name', ['Master', 'Administrador', 'Controle de Gasto']))->pluck('id');
        $inserted = [];
        foreach ($recipients as $userId) {
            if (DB::table('notifications')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_id' => $userId, 'type' => 'expense_control', 'deduplication_key' => 'expense:'.$key, 'title' => 'Gestor de Gastos · '.$event, 'description' => $description, 'url' => '/expense-control', 'data' => json_encode($data), 'active' => true, 'created_at' => now(), 'updated_at' => now()])) {
                $inserted[] = $userId;
            }
        }
        // Never send a phone notification for a transaction that is later rolled back.
        DB::afterCommit(fn () => app()->terminating(function () use ($inserted, $description) {
            try {
                app(WebPushService::class)->sendToUsers($inserted, ['title' => 'Gestor de Gastos', 'body' => $description, 'url' => '/expense-control', 'type' => 'expense_control']);
            } catch (\Throwable $error) {
                Log::warning('Push de gastos indisponível; notificação interna preservada.', ['exception' => $error::class]);
            }
        }));
    }
}
