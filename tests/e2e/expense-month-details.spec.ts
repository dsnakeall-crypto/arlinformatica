import { test, expect } from '@playwright/test';
import { api, login } from './helpers';

test('projeção abre detalhes, mantém mês principal e cabe em desktop e mobile', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Projeção banco ' + stamp, active: true, due_day: 10, color: '#336699' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Empréstimo projeção ' + stamp, active: true })).body;
  const current = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const next = new Date(current + '-01T12:00:00'); next.setMonth(next.getMonth() + 1);
  const month = next.toLocaleDateString('sv-SE').slice(0, 7);
  for (let i = 0; i < 7; i++) {
    expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Reforma ' + stamp + ' ' + i, recurrence: 'once', responsibility: 'shared', percent_one: 50, amount_cents: 10000, installment_count: 1, first_number: 1, start_month: month, due_day: 10 })).status).toBe(201);
  }
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(mobile => localStorage.setItem('arl-layout-mode', mobile ? 'mobile' : 'web'), viewport.width < 1024);
    await page.goto('/expense-control');
    await page.getByRole('tab', { name: 'Projeção', exact: true }).click();
    const row = page.locator('.cg-projection-grid>.cg-panel').nth(1);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Ver mês', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /^Projeção ·/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveCount(0);
    await expect(dialog.locator('.cg-projection-detail-rows article')).toHaveCount(5);
    const original = await dialog.boundingBox();
    expect(original!.x).toBeGreaterThanOrEqual(0); expect(original!.y).toBeGreaterThanOrEqual(0);
    expect(original!.x + original!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(original!.y + original!.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.locator('.cgm-header .cg-month-trigger,.page-header .cg-month-trigger,.cg-page .cg-month-trigger').first()).toHaveAttribute('data-month', current);
    await dialog.getByRole('button', { name: 'Próxima página da projeção' }).click();
    await expect(dialog.locator('.cg-projection-detail footer')).toContainText('2 /');
    await expect(dialog.getByRole('status')).toHaveCount(0);
    await dialog.getByRole('tab', { name: /Despesas compartilhadas/ }).click();
    await expect(dialog.locator('.cg-projection-detail footer')).toContainText('1 /');
    await expect(dialog.getByRole('status')).toHaveCount(0);
    expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `output/controle-gasto/projecao-popup-${viewport.width}.png` });
    await dialog.getByRole('button', { name: 'Fechar projeção do mês' }).click();
    await expect(page.getByRole('tab', { name: 'Projeção', exact: true })).toHaveAttribute('aria-selected', 'true');
    for (const label of ['Resumo', 'Gastos', 'Instituições', 'Pagamentos', 'Quitadas']) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
});

test('pagamentos abre instituição e consulta outro mês sem mudar mês principal', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Pagamentos banco ' + stamp, active: true, due_day: 10, color: '#336699' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Cartão pagamento ' + stamp, active: true })).body;
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const created = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Compra paga ' + stamp, recurrence: 'once', responsibility: 'one', percent_one: 100, amount_cents: 10000, installment_count: 1, first_number: 1, start_month: month, due_day: 10 });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  expect((await api(page, '/expense-control/operations', 'POST', { request_key: crypto.randomUUID(), installment_ids: [created.body.installments[0].id], kind: 'payment', target: 'one', paid_by: 1, occurred_on: new Date().toLocaleDateString('sv-SE') })).status).toBe(201);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Pagamentos', exact: true }).click();
  const bankCard = page.locator('.cg-payment-bank').filter({ hasText: bank.name });
  await expect(bankCard).toContainText('100,00');
  await expect(bankCard.locator('.cg-payment-types')).toHaveCount(0);
  await bankCard.getByRole('button', { name: 'Ver pagamentos de ' + bank.name }).click();
  await bankCard.locator('.cg-payment-types>div>button').click();
  await expect(bankCard.locator('.cg-paid-purchase')).toHaveCount(1);
  await bankCard.locator('.cg-paid-purchase').click();
  await expect(bankCard.locator('.cg-entry')).toHaveCount(1);
  await page.locator('.cg-payment-month').getByRole('button', { name: 'Próximo mês do controle' }).click();
  await expect(bankCard).toContainText('0,00');
  await expect(bankCard.locator('.cg-entry')).toHaveCount(0);
  await expect(page.locator('.cgm-header .cg-month-trigger,.page-header .cg-month-trigger,.cg-page .cg-month-trigger').first()).toHaveAttribute('data-month', month);
  await page.locator('.cg-payment-month').getByRole('button', { name: 'Mês anterior do controle' }).click();
  await expect(bankCard).toContainText('100,00');
  await page.screenshot({ path: 'output/controle-gasto/pagamentos-consulta-mes.png', fullPage: true });
});
