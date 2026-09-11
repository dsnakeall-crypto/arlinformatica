import { expect, test } from '@playwright/test';
import { login } from './helpers';

const expectedGroups = {
  'Operação': ['Painel', 'Ordens de Serviço'],
  'Cadastros': ['Clientes', 'Serviços'],
  'Gestão': ['Financeiro', 'Pós-Venda'],
  'Administração': ['Usuários', 'Configurações'],
};

test('menu agrupa destinos, destaca Nova OS e mostra contadores vindos do backend nos dois layouts', async ({ page }) => {
  await page.route('**/api/navigation-summary', route => route.fulfill({ json: { open_orders: 7, available_post_sales: 3 } }));
  await login(page);
  const aside = page.locator('aside');

  for (const [groupName, items] of Object.entries(expectedGroups)) {
    const group = aside.locator('.nav-group').filter({ has: page.getByRole('heading', { name: groupName, exact: true }) });
    await expect(group).toBeVisible();
    for (const item of items) await expect(group.getByRole('button', { name: new RegExp(`^${item}(?: \\d+)?$`) })).toBeVisible();
  }
  const newOrder = aside.getByRole('button', { name: 'Nova OS', exact: true });
  await expect(newOrder).toHaveClass(/new-order-shortcut/);
  await expect(aside.getByRole('button', { name: /Ordens de Serviço/ }).locator('.nav-badge')).toHaveText('7');
  await expect(aside.getByRole('button', { name: /Pós-Venda/ }).locator('.nav-badge')).toHaveText('3');
  await newOrder.click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS', exact: true })).toBeVisible();

  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  for (const groupName of Object.keys(expectedGroups)) await expect(aside.getByRole('heading', { name: groupName, exact: true })).toBeVisible();
  await expect(aside.getByRole('button', { name: /Ordens de Serviço/ }).locator('.nav-badge')).toHaveText('7');
});

test('menu recolhe, revela nomes no hover, libera largura e persiste após recarregar', async ({ page }) => {
  await login(page);
  const shell = page.locator('.shell');
  const main = page.getByRole('main');
  const expanded = await main.boundingBox();
  await page.getByRole('button', { name: 'Recolher menu lateral' }).click();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  const collapsed = await main.boundingBox();
  expect(collapsed?.width).toBeGreaterThan(expanded?.width ?? 0);

  const orders = page.locator('aside').getByRole('button', { name: /Ordens de Serviço/ });
  await orders.hover();
  await expect(orders.locator('.nav-label')).toBeVisible();
  await expect(orders.locator('.nav-count')).toBeVisible();
  await page.reload();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await page.getByRole('button', { name: 'Expandir menu lateral' }).click();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
});
