import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('editor de pós-venda não permanece ao navegar para outra aba', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Pós-Venda', exact: true }).click();
  await expect(page.locator('.arl-post-sale-editor')).toBeVisible();
  await expect(page.locator('.arl-post-toolbar')).toBeVisible();

  await page.getByRole('button', { name: 'Ordens de Serviço', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
  await expect(page.locator('.arl-post-sale-editor')).toHaveCount(0);
  await expect(page.locator('.arl-post-toolbar')).toHaveCount(0);
});
