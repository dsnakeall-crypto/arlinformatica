<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseCardArtworkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        $this->actingAs($this->account('Master'));
    }

    private function account(string $role): User
    {
        return User::create(['name' => $role, 'login' => uniqid('card'), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', $role)->value('id'), 'active' => true]);
    }

    private function payload(array $extra = []): array
    {
        return [...['name' => 'Meu cartão', 'active' => true, 'due_day' => 10, 'color' => '#820ad1'], ...$extra];
    }

    public function test_gallery_and_legacy_color_save_without_changing_financial_data(): void
    {
        $gallery = $this->getJson('/api/expense-control/configuration')->assertOk()->json('card_artworks');
        foreach (['bb', 'nubank', 'caixa', 'santander', 'bradesco', 'itau', 'samsung-itau', 'bv', 'mercado-pago', 'infinitepay'] as $key) {
            $this->assertContains($key, array_column($gallery, 'key'));
        }
        $this->postJson('/api/expense-control/catalogs/institutions', $this->payload())->assertOk()->assertJsonPath('artwork_key', null);
        $this->postJson('/api/expense-control/catalogs/institutions', $this->payload(['artwork_key' => 'nubank']))->assertOk()->assertJsonPath('artwork_key', 'nubank');
        $this->postJson('/api/expense-control/catalogs/institutions', $this->payload(['artwork_key' => '../../secret']))->assertUnprocessable();
        foreach (['cg_debts', 'cg_installments', 'cg_entries', 'financial_transactions'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_uploaded_image_is_private_standardized_and_preserved_during_regular_edit(): void
    {
        $response = $this->post('/api/expense-control/catalogs/institutions', $this->payload(['image' => UploadedFile::fake()->image('foto.png', 1200, 900)]), ['Accept' => 'application/json'])->assertOk();
        $id = $response->json('id');
        $this->assertArrayNotHasKey('image_path', $response->json());
        $path = DB::table('cg_institutions')->where('id', $id)->value('image_path');
        $bytes = Storage::disk('local')->get($path);
        $info = getimagesizefromstring($bytes);
        $this->assertSame([856, 540], [$info[0], $info[1]]);
        $this->assertSame('image/jpeg', $info['mime']);
        $this->assertLessThanOrEqual(102400, strlen($bytes));
        $this->get($response->json('image_url'))->assertOk()->assertHeader('Content-Type', 'image/jpeg')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->putJson('/api/expense-control/catalogs/institutions/'.$id, $this->payload(['name' => 'Editado']))->assertOk();
        $this->assertSame($path, DB::table('cg_institutions')->where('id', $id)->value('image_path'));
        $this->actingAs($this->account('Usuário local'))->getJson('/api/expense-control/institutions/'.$id.'/image')->assertForbidden();
        $this->actingAs($this->account('Controle de Gasto'))->get('/api/expense-control/institutions/'.$id.'/image')->assertOk();
        $this->putJson('/api/expense-control/catalogs/institutions/'.$id, $this->payload(['artwork_key' => 'bb']))->assertOk()->assertJsonPath('image_url', null);
        $this->assertNull(DB::table('cg_institutions')->where('id', $id)->value('image_path'));
        Storage::disk('local')->assertExists($path);
    }

    public function test_invalid_upload_does_not_save_or_leave_files(): void
    {
        $this->post('/api/expense-control/catalogs/institutions', $this->payload(['image' => UploadedFile::fake()->createWithContent('fake.png', '<script>alert(1)</script>')]), ['Accept' => 'application/json'])->assertUnprocessable();
        $this->post('/api/expense-control/catalogs/institutions', $this->payload(['image' => UploadedFile::fake()->create('large.jpg', 4097, 'image/jpeg')]), ['Accept' => 'application/json'])->assertUnprocessable();
        $this->post('/api/expense-control/catalogs/institutions', $this->payload(['image' => UploadedFile::fake()->image('huge.png', 4100, 4000)]), ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('cg_institutions', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('expense-cards'));
    }

    public function test_failed_catalog_update_removes_new_uploaded_file(): void
    {
        $this->post('/api/expense-control/catalogs/institutions/999', $this->payload(['_method' => 'PUT', 'image' => UploadedFile::fake()->image('card.jpg', 856, 540)]), ['Accept' => 'application/json'])->assertNotFound();
        $this->assertSame([], Storage::disk('local')->allFiles('expense-cards'));
    }

    public function test_backup_restores_the_uploaded_card_and_its_database_link(): void
    {
        $user = auth()->user();
        $response = $this->post('/api/expense-control/catalogs/institutions', $this->payload(['image' => UploadedFile::fake()->image('card.jpg', 856, 540)]), ['Accept' => 'application/json'])->assertOk();
        $id = $response->json('id');
        $path = DB::table('cg_institutions')->where('id', $id)->value('image_path');
        $hash = hash('sha256', Storage::disk('local')->get($path));
        $service = app(BackupService::class);
        $backup = $service->create($user);
        $service->validate(Storage::disk('local')->path($backup->path));
        Storage::disk('local')->delete($path);
        DB::table('cg_institutions')->where('id', $id)->update(['image_path' => null]);
        $service->restore($backup, $user);
        $this->assertSame($path, DB::table('cg_institutions')->where('id', $id)->value('image_path'));
        $this->assertSame($hash, hash('sha256', Storage::disk('local')->get($path)));
        $this->get('/api/expense-control/institutions/'.$id.'/image')->assertOk();
    }
}
