import { expect, test } from '@playwright/test';
import { login } from './helpers';

const screens = [
  ['Painel', 'Painel'],
  ['Ordens de Serviço', 'Ordens de Serviço'],
  ['Nova OS', 'Abertura de Chamado / Nova OS'],
  ['Clientes', 'Gestão de Clientes'],
  ['Financeiro', 'Financeiro'],
  ['Pós-Venda', 'Pós-Venda & Reputação'],
  ['Serviços', 'Serviços e Produtos'],
  ['Usuários', 'Usuários e Permissões'],
  ['Configurações', 'Configurações'],
] as const;

test('cabeçalho compartilhado preserva heading, etiqueta e ícone em todas as telas', async ({ page }) => {
  await login(page);

  for (const [navigation, heading] of screens) {
    if (navigation !== 'Painel') {
      await page.locator('aside').getByRole('button', { name: navigation, exact: true }).click();
    }
    const header = page.getByTestId('page-header');
    await expect(header.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(header.locator('.arl-eyebrow')).not.toBeEmpty();
    await expect(header.locator('.arl-page-header-icon svg')).toHaveCount(1);
  }
});

test('ações e contador integram a linha compacta do título', async ({ page }) => {
  await login(page);
  const panelHeader = page.getByTestId('page-header');
  const titleBox = await panelHeader.getByRole('heading', { name: 'Painel', exact: true }).boundingBox();
  const actionBox = await panelHeader.getByRole('button', { name: 'Nova OS', exact: true }).boundingBox();
  expect(titleBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(Math.abs((titleBox?.y ?? 0) - (actionBox?.y ?? 0))).toBeLessThan(20);

  await page.locator('aside nav').getByRole('button', { name: 'Clientes', exact: true }).click();
  const clientsHeader = page.getByTestId('page-header');
  await expect(clientsHeader.locator('.arl-page-header-counter')).toHaveText(/clientes? encontrados?/);
  await expect(clientsHeader.getByRole('button', { name: 'Novo cliente', exact: true })).toBeVisible();
});

test('cabeçalho se adapta ao modo Mobile / Tablet sem overflow', async ({ page }) => {
  await login(page);
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  const header = page.getByTestId('page-header');
  await expect(header.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  const [headerBox, viewport] = await Promise.all([header.boundingBox(), page.evaluate(() => ({ width: document.documentElement.clientWidth }))]);
  expect(headerBox).not.toBeNull();
  expect((headerBox?.x ?? 0) + (headerBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).last().click();
  await expect(page.getByTestId('page-header').getByRole('heading', { name: 'Abertura de Chamado / Nova OS', exact: true })).toBeVisible();
});
