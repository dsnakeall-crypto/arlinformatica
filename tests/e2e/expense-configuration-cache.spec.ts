import { expect, test } from '@playwright/test';
import { api, login, openExpenseSection } from './helpers';

test('catalog reuse preserves its original age and refreshes external changes after thirty seconds', async ({ page }) => {
  const started = new Date('2026-10-11T15:00:00Z');
  await page.clock.setFixedTime(started);
  await login(page);
  let configurationRequests = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/expense-control/configuration' && request.method() === 'GET') configurationRequests++;
  });
  const [configuration, summary] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/expense-control/configuration' && response.request().method() === 'GET'),
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/expense-control/summary' && response.request().method() === 'GET'),
    page.getByRole('button', { name: 'Controle de Gasto', exact: true }).click(),
  ]);
  expect(configuration.status()).toBe(200);
  expect(summary.status()).toBe(200);
  await Promise.all([configuration.finished(), summary.finished()]);
  const workspace = page.locator('.cg-page');
  await expect(workspace.locator('.cg-loading')).toHaveCount(0);
  await expect(workspace.locator('.cg-mobile-summary')).toBeVisible();
  const initialConfiguration = await configuration.json();
  await expect(workspace.locator('.cgo-people')).toContainText(initialConfiguration.people[0].name);
  expect(configurationRequests).toBe(1);

  await page.clock.setFixedTime(new Date(started.getTime() + 20_000));
  await openExpenseSection(page, 'Gastos');
  await expect(workspace.locator('.cg-loading')).toHaveCount(0);
  expect(configurationRequests).toBe(1);

  const name = `Instituição externa ${Date.now()}`;
  const created = await api(page, '/expense-control/catalogs/institutions', 'POST', { name, active: true, due_day: 12, color: '#c9002c' });
  expect(created.status).toBe(200);
  await page.clock.setFixedTime(new Date(started.getTime() + 40_000));
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/expense-control/configuration' && response.request().method() === 'GET');
  await openExpenseSection(page, 'Instituições');
  expect((await refreshed).status()).toBe(200);
  await expect(workspace.locator('.cg-loading')).toHaveCount(0);
  await expect(workspace.getByRole('heading', { name, exact: true })).toBeVisible();
  expect(configurationRequests).toBe(2);

  await page.clock.setFixedTime(new Date(started.getTime() + 50_000));
  await openExpenseSection(page, 'Gastos');
  await expect(workspace.locator('.cg-loading')).toHaveCount(0);
  expect(configurationRequests).toBe(2);
});
