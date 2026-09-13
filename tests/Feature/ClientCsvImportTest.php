<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use App\Services\ClientCsvImport;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ClientCsvImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Importador', 'login' => 'import', 'password' => 'test-password', 'active' => true]));
    }

    private function upload(string $rows, ?string $header = null)
    {
        return $this->postJson('/api/settings/clients/import', ['file' => UploadedFile::fake()->createWithContent('clientes.csv', "\xEF\xBB\xBF".($header ?? implode(';', ClientCsvImport::HEADER))."\r\n".$rows)]);
    }

    public function test_import_maps_fields_and_preserves_optional_blanks(): void
    {
        $this->upload("José;529.982.247-25;Rua A;10;Centro;São Paulo;SP;01001-000;(11) 99999-1234\r\nEmpresa;04.252.011/0001-10;;;;;;;11999991234\r\n")
            ->assertOk()->assertJsonPath('created', 2)->assertJsonPath('read', 2)->assertJsonPath('failed', 0);
        $this->assertDatabaseHas('clients', ['name' => 'José', 'document' => '52998224725', 'street' => 'Rua A', 'number' => '10', 'district' => 'Centro', 'city' => 'São Paulo', 'state' => 'SP', 'postal_code' => '01001000', 'phone' => '(11) 99999-1234']);
        $this->assertDatabaseHas('clients', ['name' => 'Empresa', 'street' => '', 'number' => '', 'district' => '', 'city' => '', 'state' => '', 'postal_code' => '']);
        $audit = DB::table('audit_logs')->where('action', 'clients.imported')->first();
        $this->assertNotNull($audit->user_id);
        $this->assertNotNull($audit->created_at);
        $this->assertSame(2, json_decode($audit->after, true)['created']);
    }

    public function test_missing_required_fields_report_line_numbers(): void
    {
        $this->upload(";52998224725;;;;;;;11999991234\r\nJosé;;;;;;;;11999991234\r\nJosé;52998224725;;;;;;;\r\n")
            ->assertOk()->assertJsonPath('failed', 3)->assertJsonPath('created', 0)
            ->assertJsonPath('errors.0.line', 2)->assertJsonPath('errors.1.line', 3)->assertJsonPath('errors.2.line', 4);
    }

    public function test_existing_and_repeated_documents_are_ignored_even_when_archived(): void
    {
        $row = "José;52998224725;;;;;;;11999991234\r\n";
        $this->upload($row.$row)->assertOk()->assertJsonPath('created', 1)->assertJsonPath('ignored', 1);
        DB::table('clients')->update(['deleted_at' => now()]);
        $this->upload("Outro;529.982.247-25;;;;;;;11988881234\r\n")->assertOk()->assertJsonPath('created', 0)->assertJsonPath('ignored', 1);
        $this->assertDatabaseHas('clients', ['name' => 'José', 'phone' => '11999991234']);
    }

    public function test_wrong_header_is_rejected_without_writes(): void
    {
        $this->upload('José;52998224725;;;;;;;11999991234', 'Nome;Documento')->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseMissing('audit_logs', ['action' => 'clients.imported']);
    }

    public function test_audit_failure_rolls_back_clients(): void
    {
        $this->mock(Audit::class)->shouldReceive('record')->once()->andThrow(new \RuntimeException('audit unavailable'));
        $this->upload('José;52998224725;;;;;;;11999991234')->assertStatus(500);
        $this->assertDatabaseCount('clients', 0);
    }

    public function test_only_master_can_import_and_upload_limits_apply(): void
    {
        $this->postJson('/api/settings/clients/import', ['file' => UploadedFile::fake()->create('clientes.csv', 2049, 'text/csv')])->assertUnprocessable();
        $this->postJson('/api/settings/clients/import', ['file' => UploadedFile::fake()->createWithContent('clientes.txt', implode(';', ClientCsvImport::HEADER))])->assertUnprocessable();
        foreach (['Administrador', 'Funcionário'] as $role) {
            $this->actingAs(User::create(['role_id' => Role::where('name', $role)->value('id'), 'name' => $role, 'login' => $role, 'password' => 'test-password', 'active' => true]));
            $this->upload('')->assertForbidden();
        }
    }

    public function test_six_hundred_rows_use_batch_queries(): void
    {
        $rows = '';
        for ($index = 1; $index <= 600; $index++) {
            $digits = str_pad((string) $index, 9, '0', STR_PAD_LEFT);
            for ($length = 9; $length <= 10; $length++) {
                $sum = 0;
                for ($position = 0; $position < $length; $position++) {
                    $sum += (int) $digits[$position] * ($length + 1 - $position);
                }
                $digits .= (($sum * 10) % 11) % 10;
            }
            $rows .= "Cliente {$index};{$digits};;;;;;;11999991234\r\n";
        }
        DB::enableQueryLog();
        $this->upload($rows)
            ->assertOk()->assertJsonPath('read', 600)->assertJsonPath('created', 600)->assertJsonPath('ignored', 0);
        $queries = array_filter(DB::getQueryLog(), fn ($query) => str_contains($query['query'], 'select') && str_contains($query['query'], 'clients'));
        $this->assertCount(12, $queries);
        $inserts = array_filter(DB::getQueryLog(), fn ($query) => str_contains($query['query'], 'insert into "clients"'));
        $this->assertCount(12, $inserts);
        DB::disableQueryLog();
    }
}
