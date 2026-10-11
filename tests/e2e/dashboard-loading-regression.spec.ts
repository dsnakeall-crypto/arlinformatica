import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('Painel Desktop mantém carregamento das OS abertas e encerradas', async ({ page }) => {
  let deskRequests = 0;
  let closedWeekRequests = 0;
  await page.route('**/api/orders/desk', async route => {
    deskRequests++;
    await route.continue();
  });
  await page.route('**/api/orders?*', async route => {
    if (route.request().url().includes('closed_week')) closedWeekRequests++;
    await route.continue();
  });
  await login(page);
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  await expect.poll(() => deskRequests).toBeGreaterThan(0);
  await expect.poll(() => closedWeekRequests).toBeGreaterThan(0);
});
