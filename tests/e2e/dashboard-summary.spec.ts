import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

test('Painel mantém contador semanal sem carregar ou renderizar ordens fechadas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  // Finish the initial mount before observing a reload; its pending response
  // otherwise belongs to the document that the reload will destroy.
  await expect(page.locator('.dashboard-orders table')).toBeVisible();
  const legacy = await api(page, '/orders?tab=closed_week&per_page=1&panel_light=1');
  expect(legacy.status).toBe(200);
  const calls: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/orders')) calls.push(request.url());
  });
  const summaryResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/dashboard-summary');
  await page.reload();
  const response = await summaryResponse;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ completed_week: legacy.body.total });
  await expect(page.locator('.dashboard-cards article').filter({ hasText: 'Concluídos' }).locator('strong')).toHaveText(String(legacy.body.total));
  await expect(page.getByRole('heading', { name: 'Ordens em andamento', exact: true })).toBeVisible();
  await expect(page.locator('.dashboard-closed-orders, .dashboard-section-divider')).toHaveCount(0);
  await expect(page.getByText('Fechadas recentemente', { exact: true })).toHaveCount(0);
  expect(calls.some(url => new URL(url).searchParams.get('tab') === 'closed_week')).toBe(false);
  expect(calls.filter(url => new URL(url).pathname === '/api/orders/dashboard-summary')).toHaveLength(1);
});
