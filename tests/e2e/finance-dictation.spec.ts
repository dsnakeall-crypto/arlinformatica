import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('Caixa Diário mostra entradas por forma e A Receber abre por ícone', async ({ page }) => {
  await login(page);
  await page.route('**/api/finance/daily', route => route.fulfill({ json: {
    date: '2026-10-08', timezone: 'America/Sao_Paulo', total_cents: 1600,
    transactions: [
      { id: 1, kind: 'service_order', method: 'pix', effective_cents: 1500, occurred_at: '2026-10-08T12:00:00Z' },
      { id: 2, kind: 'quick_entry', method: null, effective_cents: 300, occurred_at: '2026-10-08T12:00:00Z' },
      { id: 3, kind: 'refund', method: 'pix', effective_cents: -200, occurred_at: '2026-10-08T12:00:00Z' },
    ],
  } }));
  await page.route('**/api/finance/receivables', route => route.fulfill({ json: { count: 1, total_balance_cents: 1000, data: [{ id: 123, number: '0000123', client_name: 'Cliente teste', total_cents: 1000, paid_cents: 0, balance_cents: 1000 }] } }));
  await page.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await page.getByRole('button', { name: 'Caixa Diário', exact: true }).click();
  const methods = page.locator('.finance-daily-methods');
  await expect(methods.locator('article')).toHaveCount(6);
  await expect(methods.locator('article').filter({ hasText: 'Pix' })).toContainText('R$ 15,00');
  await expect(methods.locator('article').filter({ hasText: 'Outro' })).toContainText('R$ 3,00');
  await expect(methods).not.toContainText('Saída');
  await page.screenshot({ path: 'output/finance-dictation/daily-desktop.png', fullPage: true });
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/finance-dictation/daily-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel('Layout neste dispositivo').selectOption('desktop');
  await page.getByRole('button', { name: 'A Receber', exact: true }).click();
  const eye = page.getByRole('button', { name: 'Abrir OS 0000123', exact: true });
  await expect(eye).toBeVisible();
  await expect(eye).toHaveText('');
  await expect(eye.locator('svg')).toHaveCount(1);
  expect(await eye.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({ path: 'output/finance-dictation/receivables-desktop.png', fullPage: true });
});

test('Ditado acrescenta texto sem salvar, evita duplicação e libera o microfone ao sair', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = ''; continuous = false; interimResults = false;
      onresult: any; onerror: any; onend: any;
      start() { (window as any).testRecognition = this; }
      stop() { this.onend?.(); }
      abort() { sessionStorage.setItem('testRecognitionAborted', 'true'); }
    }
    (window as any).webkitSpeechRecognition = FakeRecognition;
    (window as any).SpeechRecognition = FakeRecognition;
  });
  await login(page);
  const client = await api(page, '/clients', 'POST', { name: 'Cliente Ditado', document: uniqueDocument(), phone: '35999998888', postal_code: '37160000', street: 'Rua Teste', number: '1', district: 'Centro', city: 'Campos Gerais', state: 'MG' });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench', reported_problem: 'Teste ditado', checklist: [] });
  expect(order.status).toBe(201);
  await page.goto(`/orders/${order.body.id}`);
  const report = page.getByRole('textbox', { name: 'Laudo Final', exact: true });
  await report.fill('Texto original.');
  let writes = 0;
  page.on('request', r => { if (r.method() === 'PATCH' && new URL(r.url()).pathname === `/api/orders/${order.body.id}`) writes++; });
  await page.getByRole('button', { name: 'Ditar laudo', exact: true }).click();
  await page.evaluate(() => {
    const r = (window as any).testRecognition;
    const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Equipamento reparado.' } }] };
    r.onresult(event); r.onresult(event);
  });
  await expect(report).toHaveValue('Texto original. Equipamento reparado.');
  await report.fill('Revisão manual.');
  await page.evaluate(() => (window as any).testRecognition.onresult({ resultIndex: 1, results: [{ isFinal: true, 0: { transcript: 'Equipamento reparado.' } }, { isFinal: true, 0: { transcript: 'Testes concluídos.' } }] }));
  await expect(report).toHaveValue('Revisão manual. Testes concluídos.');
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Parar ditado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ditar laudo', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/finance-dictation/report-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Ditar laudo', exact: true }).click();
  await page.evaluate(() => (window as any).testRecognition.onerror({ error: 'not-allowed' }));
  await expect(page.getByRole('status')).toContainText('Permita o microfone');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Painel', exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('testRecognitionAborted'))).toBe('true');
  await page.addInitScript(() => { (window as any).SpeechRecognition = undefined; (window as any).webkitSpeechRecognition = undefined; });
  await page.goto(`/orders/${order.body.id}`);
  await expect(page.getByRole('button', { name: 'Ditar laudo', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Ditado indisponível');
});
