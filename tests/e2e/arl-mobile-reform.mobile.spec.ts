import { expect, test } from '@playwright/test';
import { api, login, password } from './helpers';

test('barra mobile de cinco itens e Controle de Gastos com navegação independente', async ({ page }) => {
  await login(page);
  const menu = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(menu.locator('button')).toHaveCount(5);
  for (const name of ['Painel', 'Clientes', 'Abrir OS', 'Financeiro', 'Gestor de Gasto']) {
    await expect(menu.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.dashboard-cards.status-cards')).toHaveCount(0);
  await expect(page.locator('.dashboard-orders')).toHaveCount(0);

  await menu.getByRole('button', { name: 'Gestor de Gasto' }).click();
  await expect(page.locator('.arl-expense-independent.cg-mobile')).toBeVisible();
  await expect(page.locator('.app-head')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Voltar à ARL' })).toBeVisible();
  const expenses = page.getByRole('navigation', { name: 'Menu do Controle de Gastos' });
  await expect(expenses.locator('button')).toHaveCount(5);
  await expenses.getByRole('button', { name: 'Gastos' }).click();
  await expect(page.getByRole('button', { name: 'Quitadas' })).toBeVisible();
  await expenses.getByRole('button', { name: 'Projeção' }).click();
  await expect(page.getByRole('button', { name: 'Pagamentos' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajustes' }).first().click();
  await expect(page.locator('.arl-expense-own-header button[aria-current=page]')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à ARL' }).click();
  await page.getByRole('dialog', { name: 'Confirmar retorno para o aplicativo da ARL?', exact: true }).getByRole('button', { name: 'Confirmar retorno', exact: true }).click();
  await expect(menu).toBeVisible();
  await expect(page.locator('.app-head')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('preferência do menu mobile por usuário alterna barra inferior e lateral compacta', async ({ page }) => {
  await login(page);
  // Na barra inferior o menu é o trilho flutuante, não a sidebar desktop.
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  const drawer = page.getByRole('navigation', { name: 'Menu lateral compacto' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('.layout-mobile > aside#arl-main-sidebar')).toBeHidden();
  await drawer.getByRole('button', { name: 'Configurações' }).click();
  // Configurações mobile agora abre em cartões; a escolha de layout é visual.
  await page.getByRole('navigation', { name: 'Categorias de Configurações' }).getByRole('button', { name: /Layouts/ }).click();
  await expect(page.getByRole('group', { name: 'Opções de layout' })).toBeVisible();
  await page.getByRole('button', { name: 'Mobile — menu lateral compacto' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })).toHaveCount(0);
  const aside = page.locator('.shell aside');
  await expect(aside).toBeVisible();
  const width = await aside.evaluate(el => Math.round(el.getBoundingClientRect().width));
  expect(width).toBe(58);
  await aside.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.shell.arl-mobile-compact-mode aside')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('administrador simples tem preferências locais e acesso individual a gastos', async ({ page }) => {
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
  await expect(nav.locator('button')).toHaveCount(4);
  await expect(nav.getByRole('button', { name: 'Gestor de Gasto' })).toHaveCount(0);
  expect((await api(page, '/expense-control/configuration')).status).toBe(403);
  expect((await api(page, '/users')).status).toBe(403);
  expect((await api(page, '/backups')).status).toBe(403);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('navigation', { name: 'Menu lateral compacto' })
    .getByRole('button', { name: 'Configurações' }).click();
  // Administrador simples: opções locais de layout + informações protegidas em abas próprias.
  await expect(page.getByRole('group', { name: 'Opções de layout' })).toBeVisible();
  await page.getByRole('tab', { name: 'Informações' }).click();
  await expect(page.getByRole('heading', { name: /Informações gerais.*somente leitura/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Layouts' }).click();
  await expect(page.getByRole('group', { name: 'Opções de layout' })).toBeVisible();

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
  await expect(authorized.getByRole('button', { name: 'Gestor de Gasto' })).toBeVisible();
  expect((await api(page, '/expense-control/configuration')).status).toBe(200);
  expect((await api(page, '/users')).status).toBe(403);
});
