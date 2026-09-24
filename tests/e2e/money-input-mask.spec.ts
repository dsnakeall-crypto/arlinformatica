import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('campos monetários recebem dígitos da direita para a esquerda', async ({ page }) => {
  await login(page);
  await page.locator('aside nav').getByRole('button', { name: 'Serviços', exact: true }).click();

  const value = page.getByLabel('Valor em R$');
  await expect(value).toHaveValue('0,00');
  await value.focus();
  await value.press('End');

  for (const expected of ['0,08', '0,88', '8,88', '88,88', '888,88', '8.888,88']) {
    await value.press('8');
    await expect(value).toHaveValue(expected);
  }

  await value.press('Backspace');
  await expect(value).toHaveValue('888,88');

  await value.fill('80,50');
  await expect(value).toHaveValue('80,50');
  await value.fill('80.50');
  await expect(value).toHaveValue('80,50');
});
