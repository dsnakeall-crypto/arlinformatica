import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('Painel Desktop carrega OS abertas e contador agregado, sem registros encerrados', async ({ page }) => {
  let deskRequests = 0;
  let closedWeekRequests = 0;
  let summaryRequests = 0;
  await page.route('**/api/orders/dashboard-summary', async route => {
    summaryRequests++;
    await route.continue();
  });
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
  await expect.poll(() => summaryRequests).toBeGreaterThan(0);
  await expect(page.locator('.dashboard-orders table')).toBeVisible();
  expect(closedWeekRequests).toBe(0);
  await expect(page.locator('.dashboard-closed-orders')).toHaveCount(0);
});
