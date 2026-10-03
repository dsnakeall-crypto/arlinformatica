<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use App\Services\ExpenseControl;
use App\Services\SupplierPayables;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SimulationVolumeTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['backup.disk' => 'local']);
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 3)->startOfDay());
        $this->master = User::create(['name' => 'Operador fictício de homologação', 'login' => 'volume-master', 'password' => 'Homologacao#2026!', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]);
        $this->actingAs($this->master);
    }

    private function cpf(int $seed): string
    {
        $digits = str_split((string) (710000000 + $seed));
        for ($size = 9; $size < 11; $size++) {
            $sum = 0;
            for ($i = 0; $i < $size; $i++) {
                $sum += (int) $digits[$i] * ($size + 1 - $i);
            }
            $digit = 11 - $sum % 11;
            $digits[] = (string) ($digit >= 10 ? 0 : $digit);
        }

        return implode('', $digits);
    }

    private function contact(int $i, bool $supplier = false): array
    {
        return [
            'name' => ($supplier ? 'Fornecedor' : 'Cliente').' fictício '.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            ...($supplier ? ['trade_name' => 'Parceiro fictício '.$i, 'whatsapp' => '35999991234', 'landline' => '3532345678'] : []),
            'document' => $this->cpf($i + ($supplier ? 100 : 0)), 'phone' => '35999991234',
            'postal_code' => '37160000', 'street' => 'Rua de homologação', 'number' => (string) $i,
            'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG',
        ];
    }

    private function product(string $name, int $stock = 0): int
    {
        return $this->postJson('/api/catalogs/products', ['name' => $name, 'price_cents' => 48000, 'stock_quantity' => $stock, 'warranty_enabled' => false, 'active' => true])->assertCreated()->json('id');
    }

    private function evidence(string $section, array $facts): void
    {
        $directory = getenv('SIM_REPORT_PATH');
        if ($directory) {
            file_put_contents($directory.'/'.$section.'.json', json_encode(['driver' => DB::connection()->getDriverName(), ...$facts], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        }
    }

    public function test_thirty_clients_and_orders_cover_opening_closure_documents_inventory_and_finance(): void
    {
        $product = $this->product('SSD para 30 chamados', 100);
        $equipment = DB::table('equipment_types')->where('active', true)->pluck('id')->all();
        $manufacturers = DB::table('manufacturers')->where('active', true)->pluck('id')->all();
        $numbers = [];
        $closed = 0;
        $interrupted = 0;
        $received = 0;
        $refunded = 0;
        foreach (range(1, 30) as $i) {
            $clientData = $this->contact($i);
            $client = $this->postJson('/api/clients', $clientData)->assertCreated()->json();
            $this->postJson('/api/clients', $clientData)->assertUnprocessable();
            $orderData = [
                'client_id' => $client['id'], 'equipment_type_id' => $equipment[($i - 1) % count($equipment)],
                'manufacturer_id' => $manufacturers[($i - 1) % count($manufacturers)],
                'attendance_type' => $i % 2 ? 'bench' : 'external',
                'equipment_description' => 'Equipamento fictício detalhado '.$i,
                'reported_problem' => 'Relato original '.$i.': liga/desliga; revisão de placa, tela e sistema.',
                'system_password_absent' => $i % 4 !== 0, 'system_password' => $i % 4 === 0 ? 'Senha fictícia '.$i : null, 'checklist' => [],
                'items' => [['catalog_id' => $product, 'quantity' => 1]],
            ];
            $order = $this->postJson('/api/orders', $orderData)->assertCreated()->json();
            $url = '/api/orders/'.$order['id'];
            $numbers[] = $order['number'];
            $this->get($url.'/term')->assertOk();
            $this->patchJson($url.'/status', ['status' => 'completed'])->assertUnprocessable();
            $this->patchJson($url.'/status', ['status' => 'waiting_part'])->assertOk();
            $this->patchJson($url, ['reported_problem' => $orderData['reported_problem'], 'intake_condition' => 'Condição revisada '.$i])->assertOk();
            if ($i % 6 === 0) {
                $this->patchJson($url.'/status', ['status' => 'interrupted'])->assertUnprocessable();
                $this->patchJson($url.'/status', ['status' => 'interrupted', 'interruption_reason' => 'Cliente desistiu após diagnóstico '.$i, 'interruption_work_done' => 'Análise sem substituição de peça'])->assertOk();
                $this->postJson($url.'/reopen', ['note' => 'Tentativa de reabrir interrompida'])->assertUnprocessable();
                $interrupted++;
            } else {
                $this->patchJson($url.'/status', ['status' => 'in_service'])->assertOk();
                $finalItems = [['catalog_id' => $product, 'description' => 'SSD para 30 chamados', 'quantity' => 1, 'unit_price_cents' => 48000, 'warranty_enabled' => false]];
                if ($i % 2) {
                    $budget = $this->postJson($url.'/budgets', ['diagnosis' => 'Diagnóstico '.$i, 'proposal' => 'Trocar SSD', 'validity_days' => 7, 'items' => $finalItems])->assertCreated()->json();
                    $this->patchJson($url.'/budgets/'.$budget['budget']['revision'].'/status', ['status' => 'approved'])->assertOk();
                    $this->get($url.'/budgets/'.$budget['budget']['revision'].'/pdf')->assertOk();
                }
                $payload = ['technical_report' => 'Reparo verificado '.$i, 'discount_cents' => $i, 'items' => $finalItems, 'photo_ids' => []];
                $final = $this->postJson($url.'/finalize', $payload)->assertCreated()->json();
                $this->postJson($url.'/finalize', $payload)->assertConflict();
                $this->get($url.'/final/'.$final['finalization']['revision'].'/pdf')->assertOk();
                $total = 48000 - $i;
                $payment = ['idempotency_key' => 'volume-order-'.$i.'-first', 'amount_cents' => 10000, 'method' => ['pix', 'cash', 'debit', 'credit', 'transfer', 'other'][$i % 6]];
                $this->postJson($url.'/payment', $payment)->assertCreated();
                $this->postJson($url.'/payment', $payment)->assertOk();
                $this->postJson($url.'/payment', [...$payment, 'amount_cents' => 10001])->assertOk()->assertJsonPath('amount_cents', 10000);
                $this->getJson($url.'/payments')->assertOk()->assertJsonPath('paid_cents', 10000)->assertJsonPath('balance_cents', $total - 10000);
                $this->postJson($url.'/payment', ['idempotency_key' => 'volume-order-'.$i.'-rest', 'amount_cents' => $total - 10000, 'method' => 'pix'])->assertCreated();
                $received += $total;
                if ($i % 5 === 0) {
                    $this->postJson($url.'/refunds', ['amount_cents' => 1000, 'reason' => 'Devolução comercial de teste', 'method' => 'pix'])->assertCreated();
                    $refunded += 1000;
                }
                $this->getJson($url.'/payments')->assertOk()->assertJsonPath('collectible_balance_cents', 0);
                $closed++;
            }
            $this->getJson($url.'/audit-history')->assertOk();
            $this->getJson('/api/clients/'.$client['id'])->assertOk();
        }
        $this->assertCount(30, array_unique($numbers));
        $this->assertDatabaseCount('clients', 30);
        $this->assertDatabaseCount('service_orders', 30);
        $this->assertSame(100 - $closed, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertSame($received, (int) DB::table('payments')->sum('amount_cents'));
        $this->getJson('/api/finance/receivables')->assertOk()->assertJsonPath('total_balance_cents', 0);
        foreach (['overview', 'daily', 'month'] as $section) {
            $this->getJson('/api/finance/'.$section.'?month=2026-10&date=2026-10-03')->assertOk();
        }
        $this->evidence('orders', ['clients' => 30, 'orders' => 30, 'completed' => $closed, 'interrupted' => $interrupted, 'gross_received_cents' => $received, 'refunded_cents' => $refunded, 'stock_final' => 100 - $closed, 'term_pdfs' => 30, 'final_pdfs' => $closed]);
    }

    public function test_thirty_suppliers_purchases_receipts_returns_documents_and_payables_balance(): void
    {
        $shared = $this->product('SSD compartilhado entre 30 fornecedores');
        $expectedStock = 0;
        $returns = 0;
        $receipts = 0;
        $methods = SupplierPayables::METHODS;
        $supplierIds = [];
        foreach (range(1, 30) as $i) {
            $data = $this->contact($i, true);
            $supplier = $this->postJson('/api/suppliers', $data)->assertCreated()->json();
            $id = $supplier['id'];
            $supplierIds[] = $id;
            $url = '/api/suppliers/'.$id;
            $this->postJson('/api/suppliers', $data)->assertUnprocessable();
            $this->putJson($url.'/profile', ['profile' => ['payment_days' => $i, 'bank' => 'Banco fictício', 'agency' => '0001', 'account' => '1234', 'pix_key' => 'chave-ficticia-'.$i, 'discount_percent' => 5, 'delivery_days' => 7, 'freight' => 'buyer']])->assertOk();
            $own = $this->product('Produto individual fornecedor '.$i);
            $this->postJson($url.'/offerings', ['product_id' => $shared, 'supplier_code' => 'SKU-'.$i, 'brand' => 'Marca fictícia', 'cost_cents' => $i === 1 ? 0 : 20000 + $i, 'minimum_quantity' => 1, 'delivery_days' => 7, 'active' => true])->assertOk();
            $total = 3 * (20000 + $i) + 2 * 10001;
            $count = $i % 6 + 1;
            $parts = [];
            foreach (range(1, $count) as $n) {
                $parts[] = ['amount_cents' => intdiv($total, $count) + ($n <= $total % $count ? 1 : 0), 'due_on' => today()->addMonthsNoOverflow($n - 1)->toDateString()];
            }
            $buy = ['request_key' => (string) Str::uuid(), 'purchased_on' => today()->toDateString(), 'expected_on' => today()->addWeek()->toDateString(), 'reference' => 'COMPRA-'.$i, 'received_now' => $i % 4 === 0, 'payment_terms' => $count === 1 ? 'cash' : ($i % 2 ? 'installments' : 'duplicata'), 'payment_method' => $methods[$i % count($methods)], 'installments' => $parts, 'items' => [['product_id' => $shared, 'quantity' => 3, 'unit_cost_cents' => 20000 + $i, 'lot' => 'LOTE-'.$i], ['product_id' => $own, 'quantity' => 2, 'unit_cost_cents' => 10001]]];
            $purchase = $this->postJson($url.'/purchases', $buy)->assertCreated()->assertJsonPath('total_cents', $total)->json();
            $this->postJson($url.'/purchases', $buy)->assertCreated();
            $this->postJson($url.'/purchases', [...$buy, 'reference' => 'OUTRA'])->assertConflict();
            $purchaseUrl = '/api/supplier-purchases/'.$purchase['id'];
            $items = DB::table('supplier_purchase_items')->where('purchase_id', $purchase['id'])->orderBy('id')->get();
            if ($i % 4 === 0) {
                $expectedStock += 3;
                $receipts++;
            } else {
                $partial = ['request_key' => (string) Str::uuid(), 'received_on' => today()->toDateString(), 'items' => [['item_id' => $items[0]->id, 'quantity' => 1]]];
                $this->postJson($purchaseUrl.'/receipts', $partial)->assertCreated();
                $this->postJson($purchaseUrl.'/receipts', $partial)->assertCreated();
                $expectedStock++;
                $receipts++;
                $this->postJson($purchaseUrl.'/receipts', [...$partial, 'request_key' => (string) Str::uuid(), 'items' => [['item_id' => $items[0]->id, 'quantity' => 3]]])->assertUnprocessable();
                if ($i % 4 === 2) {
                    $this->postJson($purchaseUrl.'/cancel', ['reason' => 'Cancelar saldo não entregue no teste'])->assertOk();
                    $this->postJson($purchaseUrl.'/receipts', [...$partial, 'request_key' => (string) Str::uuid()])->assertConflict();
                } else {
                    $this->postJson($purchaseUrl.'/receipts', ['request_key' => (string) Str::uuid(), 'received_on' => today()->toDateString(), 'items' => [['item_id' => $items[0]->id, 'quantity' => 2], ['item_id' => $items[1]->id, 'quantity' => 2]]])->assertCreated();
                    $expectedStock += 2;
                    $receipts++;
                }
            }
            if ($i % 3 === 0) {
                $return = ['request_key' => (string) Str::uuid(), 'purchase_item_id' => $items[0]->id, 'quantity' => 1, 'value_cents' => 20000 + $i, 'returned_on' => today()->toDateString(), 'reason' => 'Devolução fictícia conferida', 'resolution' => ['credit', 'refund', 'exchange', 'pending'][intdiv($i, 3) % 4]];
                $this->postJson($url.'/returns', $return)->assertCreated();
                $this->postJson($url.'/returns', $return)->assertCreated();
                $this->postJson($url.'/returns', [...$return, 'quantity' => 2])->assertConflict();
                $returns++;
                $expectedStock--;
            }
            $title = DB::table('supplier_payables')->where('purchase_id', $purchase['id'])->orderBy('installment')->first();
            $pay = ['paid_on' => today()->toDateString(), 'paid_method' => $methods[$i % count($methods)], 'interest_cents' => 101, 'discount_cents' => 51];
            $this->postJson('/api/supplier-payables/'.$title->id.'/pay', $pay)->assertOk();
            $this->postJson('/api/supplier-payables/'.$title->id.'/pay', $pay)->assertOk();
            $this->postJson($url.'/occurrences', ['occurred_on' => today()->toDateString(), 'category' => ['delivery', 'quality', 'price', 'service', 'other'][$i % 5], 'description' => 'Ocorrência fictícia '.$i, 'delivery_rating' => $i % 5 + 1, 'quality_rating' => 4, 'price_rating' => 3, 'service_rating' => 5])->assertCreated();
            $doc = ['request_key' => (string) Str::uuid(), 'category' => ['invoice', 'boleto', 'receipt', 'contract', 'prices', 'other'][$i % 6], 'purchase_id' => $purchase['id']];
            $file = fn () => UploadedFile::fake()->createWithContent('documento-'.$i.'.xml', '<?xml version="1.0"?><nota><numero>'.$i.'</numero></nota>');
            $document = $this->post($url.'/documents', [...$doc, 'file' => $file()], ['Accept' => 'application/json'])->assertCreated()->json();
            $this->post($url.'/documents', [...$doc, 'file' => $file()], ['Accept' => 'application/json'])->assertCreated();
            $this->get('/api/supplier-documents/'.$document['id'].'/download')->assertOk();
            $this->getJson($url.'/workspace')->assertOk()->assertJsonCount(1, 'documents')->assertJsonCount(1, 'finance_purchases.data');
            $this->getJson($url.'/products/'.$shared)->assertOk()->assertJsonPath('summary.ordered_quantity', 3);
            $this->getJson($purchaseUrl)->assertOk()->assertJsonCount($count, 'installments');
        }
        $this->assertDatabaseCount('suppliers', 30);
        $this->assertDatabaseCount('supplier_purchases', 30);
        $this->assertDatabaseCount('supplier_purchase_receipts', $receipts);
        $this->assertDatabaseCount('supplier_returns', $returns);
        $this->assertDatabaseCount('supplier_documents', 30);
        $this->assertSame($expectedStock, (int) DB::table('service_catalog')->where('id', $shared)->value('stock_quantity'));
        $this->getJson('/api/suppliers')->assertOk()->assertJsonPath('total', 30)->assertJsonCount(20, 'data');
        $this->getJson('/api/suppliers?page=2')->assertOk()->assertJsonCount(10, 'data');
        $this->getJson('/api/suppliers?q=SKU-30')->assertOk();
        $gift = $this->product('Brinde sem fornecedor');
        $giftData = ['request_key' => (string) Str::uuid(), 'quantity' => 2, 'reason' => 'Brinde fictício', 'origin' => 'gift'];
        $this->postJson('/api/catalogs/products/'.$gift.'/stock-entries', $giftData)->assertOk();
        $this->postJson('/api/catalogs/products/'.$gift.'/stock-entries', $giftData)->assertOk();
        $this->assertSame(2, (int) DB::table('service_catalog')->where('id', $gift)->value('stock_quantity'));
        $this->assertDatabaseHas('stock_entry_details', ['stock_movement_id' => DB::table('stock_movements')->where('product_id', $gift)->value('id'), 'supplier_id' => null, 'unit_cost_cents' => 0]);
        $this->assertDatabaseCount('financial_expenses', 0);
        $backup = app(BackupService::class)->create($this->master);
        $manifest = app(BackupService::class)->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(30, $manifest['counts']['supplier_purchases']);
        $this->evidence('suppliers', ['suppliers' => 30, 'purchases' => 30, 'catalog_products' => 32, 'purchase_items' => 60, 'receipts' => $receipts, 'returns' => $returns, 'documents' => 30, 'occurrences' => 30, 'shared_stock_final' => $expectedStock, 'payables' => DB::table('supplier_payables')->count(), 'backup_validated' => true]);
    }

    public function test_forty_eight_debts_multiple_institutions_and_all_payment_lifecycles(): void
    {
        $banks = [];
        $types = [];
        foreach (['Bradesco', 'Nubank', 'Mercado Pago', 'Itaú', 'Caixa', 'Banco do Brasil', 'Santander', 'BV'] as $name) {
            $banks[] = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Fictício '.$name, 'due_day' => 10 + count($banks), 'active' => true, 'color' => '#234567'])->assertOk()->json('id');
        }
        foreach (['Cartão', 'Empréstimo', 'Financiamento', 'Conta fixa'] as $name) {
            $types[] = $this->postJson('/api/expense-control/catalogs/types', ['name' => $name, 'active' => true])->assertOk()->json('id');
        }
        $original = 0;
        $fullySettled = 0;
        $cancelled = 0;
        $operations = 0;
        foreach (range(0, 47) as $i) {
            $mode = $i % 8;
            $recurrence = $mode === 6 ? 'monthly' : ($mode === 7 ? 'once' : 'installments');
            $payload = ['request_key' => (string) Str::uuid(), 'institution_id' => $banks[$i % count($banks)], 'type_id' => $types[$i % count($types)], 'name' => 'Dívida fictícia '.$i, 'recurrence' => $recurrence, 'responsibility' => ['one', 'two', 'shared'][$i % 3], 'percent_one' => [50, 33, 67][$i % 3], 'amount_cents' => 10001 + $i, 'installment_count' => $recurrence === 'installments' ? $i % 12 + 2 : 1, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 10, 'notes' => 'Somente homologação'];
            $detail = $this->postJson('/api/expense-control/debts', $payload)->assertCreated()->json();
            $id = $detail['debt']['id'];
            $this->postJson('/api/expense-control/debts', $payload)->assertCreated();
            $this->postJson('/api/expense-control/debts', [...$payload, 'name' => 'Outro pedido'])->assertConflict();
            foreach ($detail['installments'] as $item) {
                $this->assertSame($item['amount_cents'], $item['share_one_cents'] + $item['share_two_cents']);
            }
            $original += array_sum(array_column($detail['installments'], 'amount_cents'));
            $this->putJson('/api/expense-control/debts/'.$id, ['name' => 'Dívida revisada '.$i, 'notes' => 'Revisão de identificação'])->assertOk();
            $ids = array_column($detail['installments'], 'id');
            $operation = ['request_key' => (string) Str::uuid(), 'installment_ids' => $ids, 'kind' => $mode === 3 ? 'advance' : ($mode === 5 ? 'discount' : 'payment'), 'target' => 'both', 'paid_by' => $mode === 5 ? null : ($i % 2 + 1), 'occurred_on' => today()->toDateString(), 'amount_cents' => null, 'notes' => 'Operação de teste'];
            if (in_array($mode, [0, 3], true)) {
                $this->postJson('/api/expense-control/operations', $operation)->assertCreated();
                $this->postJson('/api/expense-control/operations', $operation)->assertCreated();
                $this->postJson('/api/expense-control/operations', [...$operation, 'notes' => 'Outro conteúdo'])->assertConflict();
                $fullySettled++;
                $operations++;
            } elseif (in_array($mode, [1, 4, 5], true)) {
                $operation['installment_ids'] = [$ids[0]];
                $operation['amount_cents'] = 2500;
                $this->postJson('/api/expense-control/operations', $operation)->assertCreated();
                $operations++;
                if ($mode === 4) {
                    $entry = DB::table('cg_entries')->where('installment_id', $ids[0])->value('id');
                    $this->postJson('/api/expense-control/entries/'.$entry.'/reverse', ['reason' => 'Estorno fictício conferido'])->assertOk();
                    $this->postJson('/api/expense-control/entries/'.$entry.'/reverse', ['reason' => 'Estorno fictício conferido'])->assertOk();
                }
            } elseif ($mode === 2) {
                $this->postJson('/api/expense-control/debts/'.$id.'/cancel', ['reason' => 'Cadastro incorreto no cenário fictício'])->assertOk();
                $cancelled++;
            } elseif ($mode === 6) {
                $this->getJson('/api/expense-control/summary?month=2027-01')->assertOk();
                $this->postJson('/api/expense-control/debts/'.$id.'/end-recurring', ['end_month' => '2026-12'])->assertOk();
            }
            $after = $this->getJson('/api/expense-control/debts/'.$id)->assertOk()->json();
            foreach ($after['installments'] as $item) {
                $this->assertGreaterThanOrEqual(0, $item['remaining_one_cents']);
                $this->assertGreaterThanOrEqual(0, $item['remaining_two_cents']);
                $this->assertSame($item['remaining_cents'], $item['remaining_one_cents'] + $item['remaining_two_cents']);
            }
            $this->getJson('/api/expense-control/debts?month=2026-10&institution='.$payload['institution_id'])->assertOk();
        }
        $control = app(ExpenseControl::class);
        $rows = $control->installments()->whereNull('d.cancelled_at')->where('i.month_on', '2026-10-01')->get()->map(fn ($row) => $control->figures($row));
        $summary = $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->json();
        $this->assertSame($rows->sum('remaining_cents'), $summary['totals']['remaining_cents']);
        $this->assertSame($rows->sum('remaining_one_cents'), $summary['totals']['one_remaining_cents']);
        $this->assertSame($rows->sum('remaining_two_cents'), $summary['totals']['two_remaining_cents']);
        $plan = ['institution_id' => $banks[7], 'month' => '2026-10', 'target' => 'one', 'amount_cents' => $rows->where('institution_id', $banks[7])->sum('remaining_one_cents'), 'preview' => true];
        $preview = $this->postJson('/api/expense-control/institution-payments', $plan)->assertOk()->json();
        $this->assertGreaterThan(0, $preview['balance_cents']);
        $request = [...$plan, 'preview' => false, 'preview_hash' => $preview['preview_hash'], 'request_key' => (string) Str::uuid(), 'kind' => 'payment', 'paid_by' => 1, 'occurred_on' => today()->toDateString(), 'notes' => 'Fatura do mês do Allan'];
        $this->postJson('/api/expense-control/institution-payments', $request)->assertCreated();
        $this->postJson('/api/expense-control/institution-payments', $request)->assertCreated();
        $remaining = $control->installments()->whereNull('d.cancelled_at')->where('d.institution_id', $banks[7])->where('i.month_on', '2026-10-01')->get()->map(fn ($row) => $control->figures($row));
        $this->assertSame(0, $remaining->sum('remaining_one_cents'));
        foreach (['projection', 'advances', 'activity'] as $section) {
            $this->getJson('/api/expense-control/'.$section.'?month=2026-10')->assertOk();
        }
        $this->getJson('/api/expense-control/debts?status=settled&month=2026-10')->assertOk()->assertJsonPath('total', $fullySettled + 2);
        $this->assertDatabaseCount('cg_debts', 48);
        $this->deleteJson('/api/expense-control/catalogs/institutions/'.$banks[6], ['confirmed' => true])->assertUnprocessable();
        $this->evidence('expenses', ['debts' => 48, 'institutions' => 8, 'types' => 4, 'fully_settled_initial' => $fullySettled, 'cancelled' => $cancelled, 'operations_initial' => $operations, 'installments' => DB::table('cg_installments')->count(), 'entries' => DB::table('cg_entries')->count(), 'original_before_recurrences_cents' => $original, 'remaining_month_before_institution_payment_cents' => $summary['totals']['remaining_cents'], 'institution_payment_cents' => $preview['balance_cents']]);
    }
}
