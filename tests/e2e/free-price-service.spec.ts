import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('serviço de preço livre permite informar o valor somente na OS', async ({ page }) => {
  await login(page);
  await page.locator('aside nav').getByRole('button', { name: 'Serviços', exact: true }).click();

  const name = `Serviço preço livre E2E ${Date.now()}`;
  await page.getByLabel('Nome ou descrição do serviço').fill(name);
  await page.getByLabel('Preço livre').check();
  await expect(page.getByLabel('Valor em R$')).toBeDisabled();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();

  const row = page.locator('.services-row').filter({ hasText: name });
  await expect(row).toContainText('Preço livre');
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar serviço' });
  await expect(dialog.getByLabel('Preço livre')).toBeChecked();
  await expect(dialog.getByLabel('Valor (R$)')).toBeDisabled();
});
