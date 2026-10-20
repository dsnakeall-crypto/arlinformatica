import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('Painel Mobile evita consultas duplicadas', async ({ page }) => {
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
  await expect(page.locator('.shell')).toHaveClass(/layout-mobile/);
  await expect(page.locator('.arl-mobile-home')).toBeVisible();
  await expect(page.locator('.arl-mobile-home-loading')).toHaveCount(0);
  // Uma requisição da Home mobile; o Dashboard React não duplica nem busca encerradas.
  expect(deskRequests).toBe(1);
  expect(closedWeekRequests).toBe(0);
  expect(summaryRequests).toBe(0);

});
