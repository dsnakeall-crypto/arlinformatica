<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_required_client_fields_return_clear_field_messages(): void
    {
        $this->actingAs($this->user())
            ->postJson('/api/clients', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Informe o nome ou razão social.')
            ->assertJsonPath('errors.document.0', 'Informe o CPF ou CNPJ.')
            ->assertJsonPath('errors.phone.0', 'Informe o telefone.')
            ->assertJsonPath('errors.street.0', 'Informe o endereço.');
    }

    public function test_document_status_reports_invalid_active_and_archived_duplicates(): void
    {
        $user = $this->user();
        $document = '52998224725';
        $client = Client::create([
            'name' => 'Cliente existente',
            'document' => $document,
            'phone' => '35999999999',
            'street' => 'Rua Principal',
        ]);

        $this->actingAs($user)->getJson('/api/clients/document-status?document=11111111111')
            ->assertOk()
            ->assertJsonPath('status', 'invalid')
            ->assertJsonPath('message', 'O CPF informado é inválido.');
        $this->getJson('/api/clients/document-status?document='.$document)
            ->assertOk()
            ->assertJsonPath('status', 'duplicate')
            ->assertJsonPath('message', 'Este CPF já está cadastrado.');

        $client->delete();

        $this->getJson('/api/clients/document-status?document='.$document)
            ->assertOk()
            ->assertJsonPath('status', 'archived')
            ->assertJsonPath('message', 'Este CPF já está cadastrado. O cliente foi removido da lista.');
    }

    public function test_duplicate_document_remains_blocked_with_a_clear_message(): void
    {
        $user = $this->user();
        Client::create([
            'name' => 'Cliente existente',
            'document' => '52998224725',
            'phone' => '35999999999',
            'street' => 'Rua Principal',
        ])->delete();

        $this->actingAs($user)->postJson('/api/clients', [
            'name' => 'Nova tentativa',
            'document' => '52998224725',
            'phone' => '35999999999',
            'street' => 'Rua Principal',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.document.0', 'Este CPF já está cadastrado. O cliente foi removido da lista.');
    }

    private function user(): User
    {
        $role = Role::create(['name' => 'Master']);

        return User::create([
            'role_id' => $role->id,
            'name' => 'Validador de clientes',
            'login' => 'client-validator',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }
}
