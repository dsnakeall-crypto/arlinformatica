<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthenticationGateTest extends TestCase
{
    public function test_guest_sees_login_gate_instead_of_application_shell(): void
    {
        $response = $this->get('/');

        $response->assertOk()
            ->assertSee('Acesso restrito')
            ->assertSee('id="login-form"', false)
            ->assertDontSee('id="root"', false);
    }

    public function test_guest_api_stays_unauthenticated(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
