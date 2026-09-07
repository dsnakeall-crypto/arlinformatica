from pathlib import Path
import re

p = Path('resources/js/opening-whatsapp.ts')
s = p.read_text()
new = '''function reveal(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.hidden = false;
  element.removeAttribute('aria-hidden');
  element.style.removeProperty('display');
}

function syncMessageSettings() {
  const settingsHeading = qa<HTMLHeadingElement>('main h1').find((item) => item.textContent?.trim() === 'Configurações');
  if (!settingsHeading) return;

  hide(q<HTMLElement>('.arl-opening-message-panel'));
  hide(q<HTMLElement>('.arl-post-sale-editor'));

  const messagesTab = q<HTMLElement>('.arl-settings-tab[data-section="messages"]');
  reveal(messagesTab);
  const nav = q<HTMLElement>('.arl-message-subnav');
  reveal(nav);
  nav?.querySelector('[data-msg-tab="opening"]')?.remove();
  if (!document.documentElement.dataset.arlMessageSubtab || document.documentElement.dataset.arlMessageSubtab === 'opening') {
    document.documentElement.dataset.arlMessageSubtab = 'google';
  }
  qa<HTMLElement>('.arl-post-message-panel').forEach(reveal);

  const followUp = q<HTMLTextAreaElement>('textarea[name="post_sale_follow_up"], textarea[data-key="post_sale_follow_up"]');
  const followUpField = followUp?.closest<HTMLElement>('label, .field, .form-field');
  hide(followUpField || followUp);
}'''
s, n = re.subn(r'function syncMessageSettings\(\) \{.*?\n\}\n\nfunction syncPostSale\(\)', new + '\n\nfunction syncPostSale()', s, flags=re.S)
assert n == 1, n
p.write_text(s)

Path('app/Http/Controllers/FinalShareController.php').write_text('''<?php

namespace App\\Http\\Controllers;

use App\\Models\\ServiceOrder;
use App\\Services\\DocumentService;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Support\\Facades\\DB;

class FinalShareController extends Controller
{
    public function show(ServiceOrder $order): JsonResponse
    {
        $document = DB::table('generated_documents')
            ->where('service_order_id', $order->id)
            ->where('type', 'final')
            ->orderByDesc('revision')
            ->first();
        abort_unless($document, 404, 'O PDF final desta OS ainda não foi gerado.');

        $expiresAt = now()->addHours(48);
        $token = bin2hex(random_bytes(32));
        DB::table('final_share_tokens')->where('expires_at', '<=', now())->delete();
        DB::table('final_share_tokens')->insert([
            'service_order_id' => $order->id,
            'revision' => (int) $document->revision,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'url' => route('orders.final.public', [
                'order' => $order->id,
                'revision' => (int) $document->revision,
                'token' => $token,
            ]),
            'expires_at' => $expiresAt->toIso8601String(),
            'revision' => (int) $document->revision,
        ]);
    }

    public function download(ServiceOrder $order, int $revision, string $token, DocumentService $documents)
    {
        $valid = DB::table('final_share_tokens')
            ->where('service_order_id', $order->id)
            ->where('revision', $revision)
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->exists();
        abort_unless($valid, 403, 'Este link não é válido ou já expirou.');

        return $documents->response($order, 'final', $revision);
    }
}
''')

p = Path('routes/web.php')
s = p.read_text()
old = "Route::get('/share/orders/{order}/final/{revision}', [FinalShareController::class, 'download'])\n    ->middleware('signed')\n    ->name('orders.final.public');"
new = "Route::get('/share/orders/{order}/final/{revision}/{token}', [FinalShareController::class, 'download'])\n    ->where('token', '[A-Fa-f0-9]{64}')\n    ->name('orders.final.public');"
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('app/Http/Controllers/FinalizationController.php')
s = p.read_text()
needle = "        abort_if($order->status === 'completed', 409, 'A OS já possui uma finalização imutável.');\n"
assert needle in s
p.write_text(s.replace(needle, needle + "        abort_if($order->status === 'interrupted', 409, 'Uma OS interrompida deve voltar ao fluxo antes de ser finalizada.');\n", 1))

p = Path('app/Http/Controllers/ServiceOrderController.php')
s = p.read_text()
old_desk = "->whereIn('status', ['analysis', 'waiting_part', 'in_service'])"
old_validation = "'status' => 'required|in:analysis,waiting_part,in_service,completed,interrupted,paid',"
assert old_desk in s and old_validation in s
s = s.replace(old_desk, "->whereIn('status', ['analysis', 'waiting_part'])", 1)
s = s.replace(old_validation, "'status' => 'required|in:analysis,waiting_part,completed,interrupted,paid',", 1)
p.write_text(s)

p = Path('tests/e2e/post-sale-navigation.spec.ts')
s = p.read_text()
old = "    await expect(page.locator('.arl-post-sale-editor')).toBeVisible();"
assert old in s
p.write_text(s.replace(old, "    await expect(page.locator('.arl-post-sale-editor')).toBeHidden();", 1))

p = Path('tests/e2e/settings-editors.spec.ts')
s = p.read_text()
old = '''test('configurações não expõe mensagens automáticas de WhatsApp editáveis', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Pós-Venda / Mensagens', exact: true })).toBeHidden();
  await expect(page.getByLabel('Mensagem de acompanhamento')).toBeHidden();
  await expect(page.getByLabel('Mensagem para avaliação Google')).toBeHidden();
  await expect(page.getByLabel('Mensagem para Instagram')).toBeHidden();
  await expect(page.locator('.arl-settings-tab[data-section="messages"]')).toBeHidden();
});'''
new = '''test('configurações mantém editáveis somente Google e Instagram', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const messages = page.locator('.arl-settings-tab[data-section="messages"]');
  await expect(messages).toBeVisible();
  await messages.click();

  await expect(page.locator('.arl-opening-message-panel')).toBeHidden();
  await expect(page.locator('.arl-message-subnav [data-msg-tab="opening"]')).toHaveCount(0);
  await expect(page.getByLabel('Mensagem de acompanhamento')).toBeHidden();
  await expect(page.locator('.arl-message-subnav [data-msg-tab="google"]')).toBeVisible();
  await expect(page.locator('.arl-post-message-panel[data-msg-panel="google"] textarea')).toBeVisible();

  await page.locator('.arl-message-subnav [data-msg-tab="instagram"]').click();
  await expect(page.locator('.arl-post-message-panel[data-msg-panel="instagram"] textarea')).toBeVisible();
});'''
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('tests/Feature/FinalShareTest.php')
s = p.read_text()
needle = '        $this->assertStringContainsString("/share/orders/{$order->id}/final/1", $share[\'url\']);\n'
assert needle in s
insert = needle + '''        $pathOnly = parse_url($share['url'], PHP_URL_PATH);
        $token = basename((string) $pathOnly);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $stored = DB::table('final_share_tokens')->where('service_order_id', $order->id)->where('revision', 1)->first();
        $this->assertNotNull($stored);
        $this->assertSame(hash('sha256', $token), $stored->token_hash);
        $this->assertNotSame($token, $stored->token_hash);
'''
s = s.replace(needle, insert, 1)
old = "        $tampered = str_replace('/final/1', '/final/2', $share['url']);\n        $this->get($tampered)->assertForbidden();\n"
assert old in s
new = old + "\n        DB::table('final_share_tokens')->where('id', $stored->id)->update(['expires_at' => now()->subSecond()]);\n        $this->get($share['url'])->assertForbidden();\n"
p.write_text(s.replace(old, new, 1))

p = Path('tests/Feature/ServiceOrderWorkflowTest.php')
s = p.read_text()
marker = '    public function test_paid_archives_only_completed_order_with_no_balance_and_finalized_list_returns_it(): void\n'
assert marker in s
extra = '''    public function test_legacy_in_service_is_rejected_and_interrupted_order_cannot_be_finalized(): void
    {
        $user = $this->master();
        $order = $this->order($user);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'in_service'])
            ->assertStatus(422);

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu a interrupção do atendimento.',
        ])->assertOk();

        $this->postJson("/api/orders/{$order->id}/finalize", [])->assertStatus(409);
    }

'''
p.write_text(s.replace(marker, extra + marker, 1))
