<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientServerPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Paginação E2E',
            'login' => 'client-pagination',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $this->actingAs($user);
    }

    public function test_client_list_paginates_and_sorts_without_losing_total(): void
    {
        $zulu = $this->createClient('Zulu Informatica', '52998224725', '35999991111');
        $alpha = $this->createClient('Alpha Informatica', '16899535009', '35999992222');
        $this->createClient('Beta Informatica', '11144477735', '35999993333');

        $first = $this->getJson('/api/clients?page=1&per_page=2')
            ->assertOk()->assertJsonPath('total', 3)->assertJsonCount(2, 'data');
        $this->assertSame($alpha->id, $first->json('data.0.id'));
        $this->getJson('/api/clients?page=2&per_page=2')
            ->assertOk()->assertJsonPath('total', 3)->assertJsonCount(1, 'data');

        $byId = $this->getJson('/api/clients?sort=id&page=1&per_page=2')->assertOk();
        $this->assertSame($zulu->id, $byId->json('data.0.id'));
        $this->assertSame($alpha->id, $byId->json('data.1.id'));
    }

    public function test_mobile_search_only_by_name_and_desktop_phone_search(): void
    {
        $target = $this->createClient('Oficina Azul', '52998224725', '35999991111', 'Contato Mercado');
        $this->createClient('Mercado Central', '16899535009', '35999992222');

        $this->getJson('/api/clients?q=35999991111&per_page=12')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $target->id);
        $this->getJson('/api/clients?q=%2835%29%2099999-1111&per_page=12')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $target->id);
        $this->getJson('/api/clients?q=Contato&name_only=1&per_page=10')
            ->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
        $this->getJson('/api/clients?q=Mercado&name_only=1&per_page=10')
            ->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/clients?all=1')
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_phrase_search_does_not_match_unrelated_fields_from_different_terms(): void
    {
        $target = $this->createClient('Pagina E2E 07', '52998224725', '35999991111');
        $this->createClient('Pagina E2E 13', '16899535009', '35999992222', '07');

        $this->getJson('/api/clients?q=Pagina%20E2E%2007&per_page=12')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $target->id);
    }

    public function test_alphanumeric_name_search_does_not_match_digited_phone_or_document(): void
    {
        $alpha = $this->createClient('Ordena E2E Alpha', '52998224725', '35999991111');
        $this->createClient('Ordena E2E Zulu', '16899535009', '35999992222');
        $this->createClient('Pagina E2E 01', '11144477735', '35999993333');

        $this->getJson('/api/clients?q=Ordena%20E2E&per_page=12')
            ->assertOk()->assertJsonPath('total', 2)->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $alpha->id);
    }

    private function createClient(string $name, string $document, string $phone, ?string $nickname = null): Client
    {
        return Client::create([
            'name' => $name, 'nickname' => $nickname, 'document' => $document,
            'phone' => $phone, 'postal_code' => '37160000', 'street' => 'Rua A',
            'number' => '12', 'district' => 'Centro', 'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }
}
