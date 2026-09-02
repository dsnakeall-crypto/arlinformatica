import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('painel e mesa expõem o fluxo operacional real', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByText('OS abertas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova OS' })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Mesa de Chamados' }).click();
  await expect(page.getByRole('heading', { name: 'Mesa de Chamados' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Em Análise' })).toBeVisible();
});

test('layout é persistido por dispositivo e os três modos alteram o shell', async ({ page }) => {
  await login(page);
  const selector = page.getByLabel('Layout neste dispositivo');
  await selector.selectOption('mobile');
  await expect(page.locator('.shell')).toHaveClass(/layout-mobile/);
  await page.reload();
  await expect(selector).toHaveValue('mobile');
  await selector.selectOption('desktop');
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await page.reload();
  await expect(selector).toHaveValue('desktop');
  await selector.selectOption('automatic');
  await expect(page.locator('.shell')).toHaveClass(/layout-automatic/);
});
