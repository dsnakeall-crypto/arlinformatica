from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise RuntimeError(f'expected text not found: {path}: {old[:80]!r}')
    p.write_text(s.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    p = Path(path)
    s = p.read_text()
    updated, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'expected exactly one regex match in {path}; got {count}: {pattern}')
    p.write_text(updated)


# Configuração de mensagens: abertura e acompanhamento ficam fixos/ocultos;
# somente Google e Instagram permanecem editáveis.
opening = Path('resources/js/opening-whatsapp.ts')
s = opening.read_text()
new_settings = '''function reveal(element: HTMLElement | null | undefined) {
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
s, count = re.subn(
    r'function syncMessageSettings\(\) \{.*?\n\}\n\nfunction syncPostSale\(\)',
    new_settings + '\n\nfunction syncPostSale()',
    s,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError(f'syncMessageSettings replacement count={count}')
opening.write_text(s)


# Link público final: token aleatório no URL, somente hash persistido, validade de 48 h.
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

replace_once(
    'routes/web.php',
    "Route::get('/share/orders/{order}/final/{revision}', [FinalShareController::class, 'download'])\n    ->middleware('signed')\n    ->name('orders.final.public');",
    "Route::get('/share/orders/{order}/final/{revision}/{token}', [FinalShareController::class, 'download'])\n    ->where('token', '[A-Fa-f0-9]{64}')\n    ->name('orders.final.public');",
)

replace_once(
    'app/Http/Controllers/FinalizationController.php',
    "        abort_if($order->status === 'completed', 409, 'A OS já possui uma finalização imutável.');\n",
    "        abort_if($order->status === 'completed', 409, 'A OS já possui uma finalização imutável.');\n        abort_if($order->status === 'interrupted', 409, 'Uma OS interrompida deve voltar ao fluxo antes de ser finalizada.');\n",
)

replace_once(
    'app/Http/Controllers/ServiceOrderController.php',
    "->whereIn('status', ['analysis', 'waiting_part', 'in_service'])",
    "->whereIn('status', ['analysis', 'waiting_part'])",
)
replace_once(
    'app/Http/Controllers/ServiceOrderController.php',
    "'status' => 'required|in:analysis,waiting_part,in_service,completed,interrupted,paid',",
    "'status' => 'required|in:analysis,waiting_part,completed,interrupted,paid',",
)

# Regressões E2E alinhadas às decisões aprovadas, sem enfraquecer os fluxos.
regex_once(
    'tests/e2e/post-sale-navigation.spec.ts',
    r"await expect\(page\.locator\('\.arl-post-sale-editor'\)\)\.toBeVisible\(\);",
    "await expect(page.locator('.arl-post-sale-editor')).toBeHidden();",
)

settings_test = '''test('configurações mantém editáveis somente Google e Instagram', async ({ page }) => {
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
regex_once(
    'tests/e2e/settings-editors.spec.ts',
    r"test\('configurações não expõe mensagens automáticas de WhatsApp editáveis'.*?^\}\);",
    settings_test,
)

# Cobertura do token/hash e da expiração em banco.
final_test = Path('tests/Feature/FinalShareTest.php')
s = final_test.read_text()
needle = '        $this->assertStringContainsString("/share/orders/{$order->id}/final/1", $share[\'url\']);\n'
if needle not in s:
    raise RuntimeError('FinalShareTest share-url assertion not found')
insert = needle + '''        $pathOnly = parse_url($share['url'], PHP_URL_PATH);
        $token = basename((string) $pathOnly);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $stored = DB::table('final_share_tokens')->where('service_order_id', $order->id)->where('revision', 1)->first();
        $this->assertNotNull($stored);
        $this->assertSame(hash('sha256', $token), $stored->token_hash);
        $this->assertNotSame($token, $stored->token_hash);
'''
s = s.replace(needle, insert, 1)
needle2 = "        $tampered = str_replace('/final/1', '/final/2', $share['url']);\n        $this->get($tampered)->assertForbidden();\n"
if needle2 not in s:
    raise RuntimeError('FinalShareTest tamper assertion not found')
s = s.replace(
    needle2,
    needle2 + "\n        DB::table('final_share_tokens')->where('id', $stored->id)->update(['expires_at' => now()->subSecond()]);\n        $this->get($share['url'])->assertForbidden();\n",
    1,
)
final_test.write_text(s)

workflow_test = Path('tests/Feature/ServiceOrderWorkflowTest.php')
s = workflow_test.read_text()
marker = '    public function test_paid_archives_only_completed_order_with_no_balance_and_finalized_list_returns_it(): void\n'
if marker not in s:
    raise RuntimeError('ServiceOrderWorkflowTest insertion marker not found')
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
workflow_test.write_text(s.replace(marker, extra + marker, 1))
