import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('pós-venda React não injeta controles legados ao navegar para outra aba', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Pós-Venda', exact: true }).click();
  await expect(page.locator('[data-arl-post-sale-react="1"]')).toBeVisible();
  await expect(page.locator('.arl-post-sale-editor, .arl-post-toolbar')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Buscar por cliente ou OS' })).toBeVisible();

  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
  await expect(page.locator('[data-arl-post-sale-react="1"], .arl-post-sale-editor, .arl-post-toolbar')).toHaveCount(0);
});
