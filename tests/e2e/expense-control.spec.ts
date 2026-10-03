import { test, expect } from '@playwright/test';
import { api, login, password } from './helpers';

async function catalogs(page: any, stamp: string) {
  const institution = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Cartão CG ' + stamp, active: true, due_day: 12, color: '#c9002c' });
  expect(institution.status).toBe(200);
  const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Crédito CG ' + stamp, active: true });
  expect(type.status).toBe(200);
  return { institution: institution.body, type: type.body };
}

test('controle: cadastro manual, parte individual, lote, quitadas e retorno aos módulos existentes', async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString();
  const catalog = await catalogs(page, stamp);
  await page.getByRole('button', { name: 'Controle de Gasto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cadastrar nova dívida', exact: true });
  await dialog.getByLabel('Nome da dívida ou compra').fill('Geladeira CG ' + stamp);
  await dialog.getByRole('combobox', { name: 'Instituição', exact: true }).selectOption({ label: catalog.institution.name });
  await dialog.getByRole('combobox', { name: 'Tipo de dívida', exact: true }).selectOption({ label: catalog.type.name });
  await dialog.getByLabel('Quem paga esta fatura?').selectOption('shared');
  await dialog.getByLabel('Valor de cada parcela (R$)').fill('10001');
  await dialog.getByLabel('Quantidade total de parcelas').fill('2');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.locator('.cg-institution').filter({ hasText: catalog.institution.name }).click();
  await page.locator('.cg-type-grid button').filter({ hasText: catalog.type.name }).click();
  await page.locator('.cg-debt-row').filter({ hasText: 'Geladeira CG ' + stamp }).click();
  await expect(page.locator('.cg-table-wrap tbody tr')).toHaveCount(2);
  await page.locator('.cg-table-wrap tbody tr').first().getByRole('button', { name: 'Pagar', exact: true }).click();
  const payment = page.getByRole('dialog', { name: 'Registrar pagamento ou abatimento' });
  await payment.getByLabel('Qual parte será abatida?').selectOption('one');
  await payment.getByLabel('Quem efetivamente pagou?').selectOption('1');
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  await expect(page.locator('.cg-table-wrap tbody tr').first()).toContainText('Parcial');
  await page.getByRole('button', { name: 'Selecionar pendentes' }).click();
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await payment.getByLabel('Quem efetivamente pagou?').selectOption('2');
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  await expect(page.locator('.cg-table-wrap .cg-status-paid')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Quitadas', exact: true }).click();
  await page.getByLabel('Pesquisar compra ou instituição').fill('Geladeira CG ' + stamp);
  await expect(page.locator('.cg-debt-row').filter({ hasText: 'Geladeira CG ' + stamp })).toBeVisible();
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
});

test('controle: perfil exclusivo não vê nem acessa dados da empresa', async ({ page }) => {
  await login(page);
  const roles = (await api(page, '/users')).body.roles;
  const loginName = 'cg.' + Date.now();
  const user = await api(page, '/users', 'POST', { name: 'Responsável CG', login: loginName, email: null, password, password_confirmation: password, active: true, role_id: roles.find((r: any) => r.name === 'Controle de Gasto').id });
  expect(user.status).toBe(201);
  await page.evaluate(async () => { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' } }); });
  await page.goto('/login');
  const response = await page.evaluate(async ({ loginName, password }) => { const r = await fetch('/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' }, body: JSON.stringify({ login: loginName, password }) }); return r.status; }, { loginName, password });
  expect(response).toBe(200);
  await page.goto('/orders/999');
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await expect(page.locator('aside nav button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Nova OS', exact: true })).toHaveCount(0);
  for (const path of ['/clients', '/orders', '/finance/overview', '/suppliers', '/settings', '/notifications']) expect((await api(page, path)).status).toBe(403);
  await expect(page.locator('main')).not.toContainText('não foi possível');
});

test('controle: visual desktop e mobile sem vazamento de layout nos popups', async ({ page }) => {
  await login(page);
  await catalogs(page, 'visual-' + Date.now());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/expense-control');
  await expect(page.getByRole('heading', { name: 'Visão geral do casal', exact: true })).toBeVisible();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/resumo-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cadastrar nova dívida' })).toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/cadastro-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Fechar formulário de gasto' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'output/controle-gasto/resumo-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cadastrar nova dívida' });
  await expect(dialog.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/cadastro-mobile.png', fullPage: true });
});
