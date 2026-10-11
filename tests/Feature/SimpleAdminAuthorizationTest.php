<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimpleAdminAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function employee(string $role): User
    {
        return User::create([
            'role_id' => Role::firstOrCreate(['name' => $role], ['permissions' => []])->id,
            'name' => 'Conta de teste '.$role,
            'login' => 'test-'.str_replace(' ', '-', strtolower($role)),
            'password' => 'Senha#Teste123',
            'active' => true,
            'expense_control_access' => false,
        ]);
    }

    public function test_simple_admin_can_read_safe_settings_but_cannot_change_admin_data(): void
    {
        $user = $this->employee('Administrador Simples');
        $this->actingAs($user);
        $this->getJson('/api/me')->assertOk()->assertJsonPath('can_expense_control', false);
        $this->getJson('/api/settings/overview')->assertOk()->assertJsonStructure(['company_name']);
        $this->getJson('/api/settings')->assertForbidden();
        $this->putJson('/api/settings', [])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/backups')->assertForbidden();
        $this->getJson('/api/settings/signature')->assertForbidden();
        $this->getJson('/api/expense-control/configuration')->assertForbidden();
    }

    public function test_gastos_requires_individual_master_granted_permission(): void
    {
        $user = $this->employee('Administrador Simples');
        $this->actingAs($user);
        $this->getJson('/api/expense-control/configuration')->assertForbidden();

        $user->update(['expense_control_access' => true]);
        $this->getJson('/api/me')->assertOk()->assertJsonPath('can_expense_control', true);
        $this->getJson('/api/expense-control/configuration')->assertOk();
    }

    public function test_other_roles_do_not_gain_expenses_by_role_or_by_flag(): void
    {
        $user = $this->employee('Administrador');
        $this->actingAs($user);
        $this->getJson('/api/expense-control/configuration')->assertForbidden();
        $user->update(['expense_control_access' => true]);
        $this->getJson('/api/expense-control/configuration')->assertOk();

        $employee = $this->employee('Usuário local');
        $employee->forceFill(['expense_control_access' => true])->save();
        $this->actingAs($employee);
        $this->getJson('/api/expense-control/configuration')->assertForbidden();

        $master = $this->employee('Master');
        $this->actingAs($master);
        $this->getJson('/api/expense-control/configuration')->assertOk();
    }
}
