import { expect, test } from '@playwright/test';
import { api, login, password, openExpenseSection } from './helpers';

test('barra mobile de cinco itens e Controle de Gastos com navegação independente', async ({ page }) => {
  await login(page);
  const menu = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(menu.locator('button')).toHaveCount(5);
  for (const name of ['Painel', 'Clientes', 'Abrir OS', 'Gastos', 'Menu']) {
    await expect(menu.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.dashboard-cards.status-cards')).toHaveCount(0);
  await expect(page.locator('.dashboard-orders')).toHaveCount(0);

  await menu.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(page.locator('.arl-expense-independent.cg-mobile')).toBeVisible();
  await expect(page.locator('.app-head')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Voltar à ARL' })).toBeVisible();
  const expenses = page.getByRole('navigation', { name: 'Menu do Controle de Gastos' });
  await expect(expenses.locator('button')).toHaveCount(5);
  await openExpenseSection(page, 'Gastos');
  await expect(page.getByRole('button', { name: 'Quitadas' })).toBeVisible();
  await openExpenseSection(page, 'Projeção');
  await expect(page.getByRole('button', { name: 'Pagamentos' })).toBeVisible();
  await openExpenseSection(page, 'Ajustes');
  await expect(page.locator('.arl-expense-own-header button[aria-current=page]')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à ARL' }).click();
  await page.getByRole('dialog', { name: 'Confirmar retorno para o aplicativo da ARL?', exact: true }).getByRole('button', { name: 'Confirmar retorno', exact: true }).click();
  await expect(menu).toBeVisible();
  await expect(page.locator('.app-head')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('preferência mobile Premium permanece salva após navegar e recarregar', async ({ page }) => {
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(nav.locator('button')).toHaveCount(5);
  await nav.getByRole('button', { name: 'Menu', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('navigation', { name: 'Categorias de Configurações' })
    .getByRole('button', { name: /Layouts/ }).click();
  const choices = page.getByRole('group', { name: 'Opções de layout' });
  await expect(choices.locator('button.arl-layout-option')).toHaveCount(1);
  await expect(choices.getByRole('button', { name: 'Mobile Premium' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
  await expect(nav.locator('button')).toHaveCount(5);
  await nav.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: /Clientes/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('administrador simples preserva permissões de despesas e backend autoritativo', async ({ page }) => {
  await login(page);
  const roles = (await api(page, '/users')).body.roles as { id: number; name: string }[];
  const role = roles.find(item => item.name === 'Administrador Simples');
  expect(role).toBeTruthy();
  const loginName = 'e2e-simple-' + Date.now();
  const created = await api(page, '/users', 'POST', {
    name: 'Administrador Simples E2E', login: loginName, email: null,
    role_id: role!.id, active: true, expense_control_access: false,
    password, password_confirmation: password,
  });
  expect(created.status).toBe(201);
  const userId = created.body.id as number;
  const logout = () => page.evaluate(async () => {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    await fetch('/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': csrf } });
  });
  await logout();
  await login(page, loginName);
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(nav.locator('button')).toHaveCount(5);
  await expect(nav.getByRole('button', { name: /Gastos/ })).toBeDisabled();
  await nav.getByRole('button', { name: 'Menu', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawer.getByRole('button', { name: 'Financeiro' })).toBeEnabled();
  await drawer.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('group', { name: 'Opções de layout' })).toBeVisible();
  await page.getByRole('tab', { name: 'Informações' }).click();
  await expect(page.getByRole('heading', { name: /Informações gerais.*somente leitura/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Layouts' }).click();
  await expect(page.getByRole('group', { name: 'Opções de layout' })).toBeVisible();
  expect((await api(page, '/expense-control/configuration')).status).toBe(403);
  expect((await api(page, '/users')).status).toBe(403);
  expect((await api(page, '/backups')).status).toBe(403);
  await logout();
  await login(page);
  const granted = await api(page, '/users/' + userId, 'PUT', {
    name: 'Administrador Simples E2E', login: loginName, email: null,
    role_id: role!.id, active: true, expense_control_access: true,
  });
  expect(granted.status).toBe(200);
  await logout();
  await login(page, loginName);
  const authorized = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(authorized.getByRole('button', { name: 'Gastos', exact: true })).toBeEnabled();
  await authorized.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(page.locator('.cg-page')).toBeVisible();
  expect((await api(page, '/expense-control/configuration')).status).toBe(200);
  expect((await api(page, '/users')).status).toBe(403);
});
