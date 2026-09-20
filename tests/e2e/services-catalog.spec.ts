import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { login } from './helpers';

test('catálogos de serviços e produtos são separados e preservam produtos existentes', async ({ page }) => {
  await mkdir('visual-artifacts', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  const nav = page.locator('aside nav');
  await nav.getByRole('button', { name: 'Serviços', exact: true }).click();

  await expect(page.getByTestId('services-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mais usados', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Serviços cadastrados', exact: true })).toBeVisible();

  const layoutText = await page.locator('.device-layout').innerText();
  expect((layoutText.match(/Layout/g) ?? []).length).toBe(1);
  await expect(page.locator('.device-layout .arl-layout-label')).toHaveCount(0);

  const topCardLocator = page.getByTestId('service-top-card');
  await expect(topCardLocator.first()).toBeVisible();
  const topCards = await topCardLocator.count();
  expect(topCards).toBeGreaterThan(0);
  expect(topCards).toBeLessThanOrEqual(3);

  await expect(page.getByLabel('Tipo do item')).toHaveCount(0);
  await nav.getByRole('button', { name: 'Produtos', exact: true }).click();
  await expect(page.getByTestId('products-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Produtos', exact: true })).toBeVisible();

  const itemName = `Produto E2E Catálogo ${Date.now()}`;
  await page.getByLabel('Nome ou descrição do produto').fill(itemName);
  await page.getByLabel('Valor em R$').fill('79,90');
  await page.getByLabel('Quantidade inicial em estoque').fill('4');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();

  let row = page.locator('.services-row').filter({ hasText: itemName });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Produto');
  await expect(row).toContainText('R$ 79,90');
  await expect(row).toContainText('Estoque: 4');

  await row.getByRole('button', { name: 'Entrada de estoque', exact: true }).click();
  const stockDialog = page.getByRole('dialog', { name: 'Entrada de estoque' });
  await stockDialog.getByLabel('Quantidade da entrada').fill('2');
  await stockDialog.getByLabel('Motivo da entrada').fill('Compra de mercadoria para o teste E2E');
  await stockDialog.getByRole('button', { name: 'Somar ao estoque', exact: true }).click();
  row = page.locator('.services-row').filter({ hasText: itemName });
  await expect(row).toContainText('Estoque: 6');

  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar produto' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Valor (R$)').fill('81,50');
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();

  row = page.locator('.services-row').filter({ hasText: itemName });
  await expect(row).toContainText('R$ 81,50');
  await page.screenshot({ path: 'visual-artifacts/services-catalog-desktop.png', fullPage: true });

  await row.getByRole('button', { name: 'Desativar', exact: true }).click();
  row = page.locator('.services-row').filter({ hasText: itemName });
  await expect(row).toContainText('Inativo');
  await expect(row.getByRole('button', { name: 'Reativar', exact: true })).toBeVisible();

  await page.locator('aside').getByRole('button', { name: 'Nova OS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS', exact: true })).toBeVisible();
  await expect(page.locator('.opening-catalog button').filter({ hasText: itemName })).toHaveCount(0);
});
