<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\ClientCsvImport;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ClientNicknameTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Cadastro',
            'login' => 'client-nickname', 'password' => 'Senha#Forte123', 'active' => true,
        ]);
        $this->actingAs($this->user);
    }

    public function test_optional_nickname_is_saved_updated_and_limited_to_eighty_characters(): void
    {
        $created = $this->postJson('/api/clients', $this->payload('52998224725', 'Oficina do Zé'))
            ->assertCreated()->assertJsonPath('nickname', 'Oficina do Zé')->json();

        $this->putJson("/api/clients/{$created['id']}", $this->payload('52998224725', 'Empresa XPTO'))
            ->assertOk()->assertJsonPath('nickname', 'Empresa XPTO');

        $withoutNickname = $this->postJson('/api/clients', $this->payload('16899535009', null))
            ->assertCreated()->json();
        $this->assertNull($withoutNickname['nickname']);

        $this->postJson('/api/clients', $this->payload('11144477735', str_repeat('a', 81)))
            ->assertUnprocessable()->assertJsonValidationErrors('nickname');
    }

    public function test_client_and_order_search_find_the_nickname_and_lists_return_it(): void
    {
        $client = Client::create($this->payload('52998224725', 'Laboratório Azul'));
        $order = ServiceOrder::create([
            'number' => '7654321', 'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench',
            'status' => 'analysis', 'reported_problem' => 'Não liga', 'received_at' => now(), 'created_by' => $this->user->id,
        ]);

        $this->getJson('/api/clients?q=Laborat%C3%B3rio')->assertOk()
            ->assertJsonPath('data.0.id', $client->id)
            ->assertJsonPath('data.0.nickname', 'Laboratório Azul');
        $this->getJson('/api/orders?q=Azul')->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.client.nickname', 'Laboratório Azul');
        $this->getJson('/api/orders/desk')->assertOk()
            ->assertJsonPath('0.client.nickname', 'Laboratório Azul');
    }

    public function test_csv_import_header_remains_unchanged(): void
    {
        $this->assertSame(
            ['Nome', 'CPF/CNPJ', 'Endereço', 'Número', 'Bairro', 'Cidade', 'UF', 'CEP', 'Celular'],
            ClientCsvImport::HEADER,
        );
        $this->assertNotContains('Apelido / Referência', ClientCsvImport::HEADER);
    }

    private function payload(string $document, ?string $nickname): array
    {
        return [
            'name' => 'Cliente Teste', 'nickname' => $nickname, 'document' => $document,
            'phone' => '35999999999', 'postal_code' => null, 'street' => 'Rua A', 'number' => null,
            'district' => null, 'city' => null, 'state' => null, 'complement' => null,
        ];
    }
}
