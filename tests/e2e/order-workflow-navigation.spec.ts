import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('ordens usa OS Finalizadas no lugar da Mesa de Chamados', async ({ page }) => {
  await login(page);

  await expect(page.locator('aside').getByRole('button', { name: 'Mesa de Chamados' })).toHaveCount(0);
  await page.locator('aside').getByRole('button', { name: 'Ordens de Serviço' }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'OS FINALIZADAS' })).toBeVisible();

  await page.getByRole('button', { name: 'OS FINALIZADAS' }).click();
  await expect(page.getByText('OS pagas, retiradas e preservadas no histórico.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'OS EM ANDAMENTO' })).toBeVisible();
});
