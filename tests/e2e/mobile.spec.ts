import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('mobile possui navegação própria, ações tocáveis e inputs sem zoom forçado', async ({ page }) => {
  await login(page);
  await expect(page.locator('.menu-toggle')).toBeVisible();
  await page.locator('.menu-toggle').click();
  await expect(page.locator('aside.open')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  const fontSize = await page.getByLabel('Problema relatado *').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  await expect(page.locator('input[type=file]')).toHaveAttribute('capture', 'environment');
});
