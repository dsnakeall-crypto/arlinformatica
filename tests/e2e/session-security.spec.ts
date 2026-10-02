import { expect, test } from '@playwright/test';
import { api, login, password } from './helpers';

test('CSRF expirado mantém a entrada e só salva após nova ação explícita', async ({ page }) => {
  await login(page);
  const before = await api(page, '/finance/month');
  await page.locator('aside').getByRole('button', { name: 'Financeiro', exact: true }).click();
  await page.getByRole('button', { name: 'Entrada Rápida', exact: true }).click();
  const modal = page.locator('.quick-entry');
  await modal.getByLabel('Descrição curta (opcional)').fill('Entrada preservada após expiração');
  await modal.getByLabel('Valor recebido (R$)').fill('12,34');
  let writes = 0;
  page.on('request', request => {
    if (request.url().endsWith('/api/finance/quick-entry') && request.method() === 'POST') writes++;
  });
  await page.evaluate(() => { document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content = 'expired-token'; });
  const rejected = page.waitForResponse(response => response.url().endsWith('/api/finance/quick-entry'));
  await modal.getByRole('button', { name: 'Registrar entrada avulsa' }).click();
  expect((await rejected).status()).toBe(419);
  const notice = page.locator('#arl-session-notice');
  await expect(notice.getByText('Sessão expirada', { exact: true })).toBeVisible();
  await expect(modal.getByLabel('Valor recebido (R$)')).toHaveValue('12,34');
  await expect(modal.getByLabel('Descrição curta (opcional)')).toHaveValue('Entrada preservada após expiração');
  expect((await api(page, '/finance/month')).body.quick_entries_cents).toBe(before.body.quick_entries_cents);
  await page.screenshot({ path: 'test-results/session-expired-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await notice.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/session-expired-narrow.png' });
  await notice.getByRole('button', { name: 'Verificar sessão' }).click();
  await expect(notice.getByText('Sessão verificada', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  await notice.getByRole('button', { name: 'Fechar aviso' }).click();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/finance/quick-entry'));
  await modal.getByRole('button', { name: 'Registrar entrada avulsa' }).click();
  expect((await saved).status()).toBe(201);
  await expect(modal).toHaveCount(0);
  expect(writes).toBe(2);
  expect((await api(page, '/finance/month')).body.quick_entries_cents).toBe(before.body.quick_entries_cents + 1234);
});

test('headers personalizados recebem o CSRF da sessão', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/finance/quick-entry', {
      method: 'POST', headers: new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ amount_cents: 100, description: 'Headers personalizados' }),
    });
    return response.status;
  });
  expect(result).toBe(201);
});

test('desativação em outra sessão bloqueia funcionário já conectado', async ({ page, browser }) => {
  await login(page);
  const roles = (await api(page, '/users')).body.roles;
  const role = roles.find((item: { name: string }) => item.name === 'Funcionário');
  const account = { name: 'Sessão E2E', login: `session-e2e-${Date.now()}`, role_id: role.id, active: true };
  const created = await api(page, '/users', 'POST', { ...account, password, password_confirmation: password });
  expect(created.status).toBe(201);
  const context = await browser.newContext();
  try {
    const employee = await context.newPage();
    await login(employee, account.login);
    expect((await api(employee, '/clients')).status).toBe(200);
    expect((await api(page, `/users/${created.body.id}`, 'PUT', { ...account, active: false })).status).toBe(200);
    const denied = await api(employee, '/clients');
    expect(denied.status).toBe(401);
    expect(denied.body.code).toBe('ACCOUNT_INACTIVE');
    await expect(employee.locator('#arl-session-notice')).toBeVisible();
    expect((await api(employee, '/clients', 'POST', { name: 'Não deve salvar' })).status).not.toBe(201);
    expect((await api(employee, '/me')).status).toBe(401);
    await employee.goto('/');
    await expect(employee.locator('#login')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('login expirado renova token e mantém campos sem repetir credenciais', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login').fill('e2e.master');
  await page.locator('#password').fill(password);
  await page.evaluate(() => { document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content = 'expired-login-token'; });
  let submissions = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/login' && request.method() === 'POST') submissions++;
  });
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login-error')).toContainText('Seus campos foram mantidos');
  await expect(page.locator('#login')).toHaveValue('e2e.master');
  await expect(page.locator('#password')).toHaveValue(password);
  expect(submissions).toBe(1);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('main')).toBeVisible();
  expect(submissions).toBe(2);
});
