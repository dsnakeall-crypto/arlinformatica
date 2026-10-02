<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SupplierPayables
{
    public const METHODS = ['pix', 'cash', 'bank_transfer', 'boleto', 'debit_card', 'credit_card', 'cheque', 'other'];

    public function create(int $purchaseId, int $total, array $data, Request $request): void
    {
        // Older purchases/API callers remain unplanned; never invent historical debts.
        if (! isset($data['payment_terms'])) {
            return;
        }
        $parts = $data['installments'];
        $sum = array_sum(array_column($parts, 'amount_cents'));
        if ($sum !== $total || (in_array($data['payment_terms'], ['cash', 'deferred'], true) && count($parts) !== 1)) {
            throw ValidationException::withMessages(['installments' => 'As parcelas devem somar exatamente o total da compra. À vista/a prazo usam uma parcela.']);
        }
        $last = null;
        foreach ($parts as $i => $part) {
            if ($part['due_on'] < $data['purchased_on'] || ($last && $part['due_on'] < $last)) {
                throw ValidationException::withMessages(['installments' => 'Vencimentos devem seguir a ordem e não podem ser anteriores à compra.']);
            }
            $last = $part['due_on'];
            if (! empty($part['paid_on']) && $part['paid_on'] < $data['purchased_on']) {
                throw ValidationException::withMessages(['installments' => 'Pagamento não pode ser anterior à compra.']);
            }
            $id = DB::table('supplier_payables')->insertGetId(['purchase_id' => $purchaseId, 'installment' => $i + 1, 'amount_cents' => $part['amount_cents'], 'due_on' => $part['due_on'], 'paid_on' => $part['paid_on'] ?? null, 'paid_method' => empty($part['paid_on']) ? null : $data['payment_method'], 'paid_by' => empty($part['paid_on']) ? null : $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            if (! empty($part['paid_on'])) {
                app(Audit::class)->record($request, 'supplier.payment_confirmed', 'supplier_payables', $id, null, ['purchase_id' => $purchaseId, 'amount_cents' => $part['amount_cents'], 'paid_on' => $part['paid_on'], 'paid_method' => $data['payment_method']]);
            }
        }
        DB::table('supplier_purchases')->where('id', $purchaseId)->update(['payment_terms' => $data['payment_terms'], 'payment_method' => $data['payment_method']]);
    }

    public function pay(int $id, array $data, Request $request): object
    {
        return DB::transaction(function () use ($id, $data, $request) {
            $row = DB::table('supplier_payables')->where('id', $id)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_if($row->voided_at, 409, 'Este título foi cancelado.');
            $purchase = DB::table('supplier_purchases')->find($row->purchase_id);
            abort_if($data['paid_on'] < $purchase->purchased_on, 422, 'Pagamento anterior à compra.');
            if ($row->paid_on) {
                abort_unless($row->paid_on === $data['paid_on'] && $row->paid_method === $data['paid_method'] && ($row->payment_reference ?? '') === ($data['payment_reference'] ?? ''), 409, 'Pagamento já confirmado com outros dados.');

                return $row;
            }
            DB::table('supplier_payables')->where('id', $id)->update($data + ['paid_by' => $request->user()->id, 'updated_at' => now()]);
            app(Audit::class)->record($request, 'supplier.payment_confirmed', 'supplier_payables', $id, $row, $data);
            $this->resolve($id);

            return DB::table('supplier_payables')->find($id);
        }, 3);
    }

    public function void(int $id, string $reason, Request $request): void
    {
        DB::transaction(function () use ($id, $reason, $request) {
            $row = DB::table('supplier_payables')->where('id', $id)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_if($row->paid_on || $row->voided_at, 409, 'Somente títulos em aberto podem ser cancelados.');
            DB::table('supplier_payables')->where('id', $id)->update(['voided_at' => now(), 'void_reason' => $reason, 'updated_at' => now()]);
            app(Audit::class)->record($request, 'supplier.payable_cancelled', 'supplier_payables', $id, $row, ['reason' => $reason]);
            $this->resolve($id);
        }, 3);
    }

    private function resolve(int $id): void
    {
        DB::table('notifications')->where('type', 'supplier_due')->where('deduplication_key', 'like', 'supplier-due:'.$id.':%')->update(['active' => false, 'read_at' => now(), 'updated_at' => now()]);
    }

    public function remind(): void
    {
        $today = now('America/Sao_Paulo')->toDateString();
        $limit = now('America/Sao_Paulo')->addDays(3)->toDateString();
        $users = User::where('active', true)->whereHas('role', fn ($q) => $q->whereIn('name', ['Master', 'Administrador']))->pluck('id');
        DB::table('supplier_payables as p')->join('supplier_purchases as c', 'c.id', '=', 'p.purchase_id')->whereNull('p.paid_on')->whereNull('p.voided_at')->where('p.due_on', '<=', $limit)->select('p.*', 'c.supplier_id')->orderBy('p.id')->chunk(100, function ($rows) use ($users, $today) {
            foreach ($rows as $row) {
                DB::transaction(function () use ($row, $users, $today) {
                    $current = DB::table('supplier_payables')->where('id', $row->id)->lockForUpdate()->first();
                    if (! $current || $current->paid_on || $current->voided_at) {
                        return;
                    }
                    $stage = $row->due_on < $today ? 'overdue' : ($row->due_on === $today ? 'today' : 'soon');
                    DB::table('notifications')->where('type', 'supplier_due')->where('deduplication_key', 'like', "supplier-due:{$row->id}:%")->where('deduplication_key', '!=', "supplier-due:{$row->id}:{$stage}")->update(['active' => false, 'updated_at' => now()]);
                    foreach ($users as $user) {
                        DB::table('notifications')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_id' => $user, 'type' => 'supplier_due', 'deduplication_key' => "supplier-due:{$row->id}:{$stage}", 'title' => $stage === 'overdue' ? 'Pagamento a fornecedor vencido' : 'Pagamento a fornecedor próximo', 'description' => 'Compra #'.$row->purchase_id.' · parcela '.$row->installment.' · vencimento '.date('d/m/Y', strtotime($row->due_on)), 'url' => '/suppliers?supplier='.$row->supplier_id.'&purchase='.$row->purchase_id, 'data' => json_encode(['purchase_id' => $row->purchase_id, 'payable_id' => $row->id]), 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
                    }
                }, 3);
            }
        });
    }
}
