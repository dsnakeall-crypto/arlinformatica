import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('gestão de clientes mostra o modal somente quando solicitado', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Novo cliente' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Novo cliente', exact: true }).first().click();
  const modal = page.getByRole('dialog', { name: 'Novo cliente' });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Novo cliente', exact: true })).toBeVisible();
  await expect(modal.locator('[name="name"]')).toBeVisible();
  await expect(modal.locator('[name="document"]')).toBeVisible();
  await expect(modal.locator('[name="phone"]')).toBeVisible();
  await expect(modal.locator('[name="postal_code"]')).toBeVisible();
  await expect(modal.locator('[name="street"]')).toBeVisible();
  await expect(modal.locator('[name="number"]')).toBeVisible();
  await expect(modal.locator('[name="district"]')).toBeVisible();
  await expect(modal.locator('[name="city"]')).toBeVisible();
  await expect(modal.locator('[name="state"]')).toBeVisible();
  await expect(modal.locator('[name="complement"]')).toBeVisible();

  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Novo cliente' })).toHaveCount(0);
});
