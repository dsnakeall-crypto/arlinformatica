import { test, expect } from '@playwright/test';
import { api, login } from './helpers';

test('controle: corrigir cartão e mês em lote preserva valores e mostra observação', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Nubank ' + stamp, due_day: 10, active: true, color: '#773399' })).body;
  const other = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Samsung ' + stamp, due_day: 20, active: true, color: '#222222' })).body;
  const type = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Crédito ' + stamp, active: true })).body;
  const name = 'Monitor ' + stamp;
  const created = (await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: type.id, name, recurrence: 'installments', responsibility: 'shared', percent_one: 50, split_mode: 'amount', share_one_cents: 30000, share_two_cents: 10000, amount_cents: 40000, installment_count: 3, first_number: 1, start_month: '2026-10', due_day: 10, notes: null })).body;
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.getByLabel('Pesquisar compra ou instituição').fill(name);
  await page.locator('.cg-debt-row').filter({ hasText: name }).click();
  await page.getByRole('button', { name: 'Editar identificação', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Cartão ou instituição', exact: true }).selectOption(String(other.id));
  await dialog.getByLabel('Primeiro vencimento em', { exact: true }).fill('2026-11');
  await dialog.getByLabel('Dia de vencimento', { exact: true }).fill('20');
  await dialog.getByLabel('Observação opcional', { exact: true }).fill('Compra referente ao monitor da oficina');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  if (await dialog.getByRole('button', { name: 'Confirmar alteração', exact: true }).isVisible()) {
    await dialog.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  }
  await expect(dialog).not.toBeVisible();
  const detail = (await api(page, '/expense-control/debts/' + created.debt.id)).body;
  expect(detail.debt.institution_id).toBe(other.id);
  expect(detail.installments.map((i: any) => i.due_on)).toEqual(['2026-11-20', '2026-12-20', '2027-01-20']);
  expect(detail.installments.map((i: any) => i.id)).toEqual(created.installments.map((i: any) => i.id));
  for (const row of detail.installments) expect(row).toMatchObject({ share_one_cents: 30000, share_two_cents: 10000 });
  await expect(page.locator('.cg-table-wrap .cg-purchase-note')).toHaveCount(3);
});

for (const mobile of [false, true]) {
  test(`controle: aparência acessível em Ajustes ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.addInitScript(mode => localStorage.setItem('arl-layout-mode', mode), mobile ? 'mobile' : 'desktop');
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 });
    await login(page);
    await page.goto('/expense-control');
    await page.getByRole('tab', { name: 'Ajustes', exact: true }).click();
    await page.locator('.cg-appearance-panel').getByRole('button', { name: 'Clean', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
    await expect(page.getByRole('button', { name: 'Salvar responsáveis', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.cg-appearance-panel').getByRole('button', { name: 'Original', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'original');
  });
}
