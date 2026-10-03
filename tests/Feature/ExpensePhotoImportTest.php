<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpensePhotoImportTest extends TestCase
{
    use RefreshDatabase;

    private int $bank;

    private int $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs($this->account('Master'));
        $this->bank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Fatura foto', 'due_day' => 31, 'active' => true, 'color' => '#c9002c'])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Crédito foto', 'active' => true])->assertOk()->json('id');
    }

    private function account(string $role): User
    {
        return User::create(['name' => $role, 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', $role)->value('id'), 'active' => true]);
    }

    private function payload(): array
    {
        $item = ['request_key' => (string) Str::uuid(), 'reviewed' => true, 'name' => 'Geladeira', 'type_id' => $this->type, 'recurrence' => 'installments', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 12051, 'installment_count' => 10, 'first_number' => 3, 'notes' => null];

        return ['request_key' => (string) Str::uuid(), 'source_hash' => hash('sha256', 'foto fictícia'), 'institution_id' => $this->bank, 'start_month' => '2026-10', 'due_day' => 31, 'items' => [$item, [...$item, 'request_key' => (string) Str::uuid(), 'name' => 'Mercado', 'recurrence' => 'once', 'responsibility' => 'two', 'amount_cents' => 8990, 'installment_count' => 1, 'first_number' => 1]]];
    }

    public function test_reviewed_batch_preserves_installments_cents_and_company_records(): void
    {
        $result = $this->postJson('/api/expense-control/photo-imports', $this->payload())->assertCreated()->json();
        $this->assertCount(2, $result['debt_ids']);
        $this->assertDatabaseCount('cg_photo_imports', 1);
        $this->assertDatabaseCount('cg_installments', 9);
        $first = DB::table('cg_installments')->where('debt_id', $result['debt_ids'][0])->orderBy('number')->first();
        $this->assertSame(3, $first->number);
        $this->assertSame(12051, $first->amount_cents);
        $this->assertSame(12051, $first->share_one_cents + $first->share_two_cents);
        $this->assertSame('2026-10-31', $first->due_on);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->assertDatabaseCount('service_orders', 0);
    }

    public function test_retries_and_duplicate_photo_do_not_duplicate_financial_data(): void
    {
        $payload = $this->payload();
        $ids = $this->postJson('/api/expense-control/photo-imports', $payload)->assertCreated()->json('debt_ids');
        $this->postJson('/api/expense-control/photo-imports', $payload)->assertOk()->assertJsonPath('debt_ids', $ids)->assertJsonPath('replayed', true);
        $changed = $payload;
        $changed['items'][0]['amount_cents']++;
        $this->postJson('/api/expense-control/photo-imports', $changed)->assertConflict();
        $this->postJson('/api/expense-control/photo-imports', $this->payload())->assertConflict();
        $this->actingAs($this->account('Controle de Gasto'));
        $this->postJson('/api/expense-control/photo-imports', $payload)->assertConflict();
        $this->assertDatabaseCount('cg_debts', 2);
        $this->assertDatabaseCount('cg_installments', 9);
    }

    public function test_unreviewed_invalid_parcels_and_unexpected_fields_are_rejected(): void
    {
        foreach (['reviewed' => false, 'first_number' => 11, 'amount_cents' => 0, 'created_by' => 999] as $key => $value) {
            $data = $this->payload();
            $data['items'][0][$key] = $value;
            $this->postJson('/api/expense-control/photo-imports', $data)->assertUnprocessable();
        }
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('cg_photo_imports', 0);
    }

    public function test_failure_in_second_purchase_rolls_back_entire_batch(): void
    {
        $inactive = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Inativo', 'active' => false])->assertOk()->json('id');
        $data = $this->payload();
        $data['items'][1]['type_id'] = $inactive;
        $this->postJson('/api/expense-control/photo-imports', $data)->assertUnprocessable();
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('cg_installments', 0);
        $this->assertDatabaseCount('cg_photo_imports', 0);
    }

    public function test_photo_import_is_authorized_on_backend_for_expense_role_only(): void
    {
        foreach (['Funcionário', 'Usuário local'] as $role) {
            $this->actingAs($this->account($role));
            $this->postJson('/api/expense-control/photo-imports', $this->payload())->assertForbidden();
        }
        $this->actingAs($this->account('Controle de Gasto'));
        $this->postJson('/api/expense-control/photo-imports', $this->payload())->assertCreated();
    }

    public function test_backup_restore_preserves_import_protection_and_installments(): void
    {
        Storage::fake('local');
        $data = $this->payload();
        $ids = $this->postJson('/api/expense-control/photo-imports', $data)->assertCreated()->json('debt_ids');
        $service = app(BackupService::class);
        $backup = $service->create(auth()->user());
        $manifest = $service->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(1, $manifest['counts']['cg_photo_imports']);
        $service->restore($backup, auth()->user());
        $this->assertDatabaseCount('cg_installments', 9);
        $this->postJson('/api/expense-control/photo-imports', $data)->assertOk()->assertJsonPath('debt_ids', $ids);
    }

    public function test_individual_cards_without_general_card_preserve_atomic_retry_and_duplicate_protection(): void
    {
        $secondBank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Segundo cartão', 'due_day' => 10, 'active' => true, 'color' => '#123456'])->assertOk()->json('id');
        $data = $this->payload();
        $data['institution_id'] = null;
        $data['items'][0]['institution_id'] = $this->bank;
        $data['items'][1]['institution_id'] = $secondBank;
        $ids = $this->postJson('/api/expense-control/photo-imports', $data)->assertCreated()->json('debt_ids');
        $this->assertDatabaseHas('cg_debts', ['id' => $ids[0], 'institution_id' => $this->bank]);
        $this->assertDatabaseHas('cg_debts', ['id' => $ids[1], 'institution_id' => $secondBank]);
        $this->assertDatabaseCount('cg_photo_imports', 2);
        $this->postJson('/api/expense-control/photo-imports', $data)->assertOk()->assertJsonPath('debt_ids', $ids);
        foreach ([$this->bank, $secondBank] as $bank) {
            $duplicate = $this->payload();
            $duplicate['institution_id'] = $bank;
            $this->postJson('/api/expense-control/photo-imports', $duplicate)->assertConflict();
        }
        $this->assertDatabaseCount('cg_debts', 2);
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_individual_inactive_card_rolls_back_all_purchases_and_missing_card_is_rejected(): void
    {
        $inactive = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Cartão inativo', 'due_day' => 10, 'active' => false, 'color' => '#123456'])->assertOk()->json('id');
        $data = $this->payload();
        $data['items'][1]['institution_id'] = $inactive;
        $this->postJson('/api/expense-control/photo-imports', $data)->assertUnprocessable();
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('cg_photo_imports', 0);
        unset($data['items'][1]['institution_id'], $data['institution_id']);
        $this->postJson('/api/expense-control/photo-imports', $data)->assertUnprocessable();
        $this->assertDatabaseCount('cg_installments', 0);
    }
}
