import { expect, type Page } from '@playwright/test';

export const password = 'E2e-Segura-2026!';

export async function login(page: Page, login = 'e2e.master') {
  await page.goto('/');
  const result = await page.evaluate(async ({ login, password }) => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch('/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
      body: JSON.stringify({ login, password }),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }, { login, password });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible();
}

export async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  const requestBody = path === '/orders' && method === 'POST' && body && typeof body === 'object' && !Array.isArray(body)
    ? { system_password_absent: true, ...(body as Record<string, unknown>) }
    : body;
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const send = (payload: unknown) => fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    let response = await send(body);
    let result = await response.json().catch(() => null);
    // Fixture creation explicitly acknowledges existing calls. UI confirmation is tested separately.
    if (path === '/orders' && method === 'POST' && response.status === 409 && result?.code === 'CLIENT_HAS_OPEN_ORDERS' && !(body as any)?.confirmed_open_order_ids) {
      response = await send({ ...(body as any), confirmed_open_order_ids: result.open_orders.map((order: any) => order.id) });
      result = await response.json().catch(() => null);
    }
    return { status: response.status, body: result };
  }, { path, method, body: requestBody });
}

export async function validServiceItem(page: Page) {
  const catalog = await api(page, '/catalogs/services');
  let service = catalog.body?.find((row: any) => Number(row.price_cents) > 0);
  if (!service) {
    const created = await api(page, '/catalogs/services', 'POST', {
      name: `Serviço válido E2E ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      price_cents: 10000,
      warranty_enabled: false,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    service = created.body;
  }

  return {
    catalog_id: service.id,
    description: service.name,
    quantity: 1,
    unit_price_cents: Number(service.price_cents),
    warranty_enabled: false,
  };
}

export function uniqueDocument(seed = Date.now()) {
  const raw = String(seed).replace(/\D/g, '');
  const digits = raw.padStart(9, '0').slice(-9);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  const d1 = ((sum * 10) % 11) % 10;
  sum = 0;
  const ten = digits + d1;
  for (let i = 0; i < 10; i++) sum += Number(ten[i]) * (11 - i);
  return ten + (((sum * 10) % 11) % 10);
}

// Select through the React search rather than the retired hidden select.
export async function selectNewOrderClient(page: Page, id: number, confirmExisting = true) {
  const client = await api(page, '/clients/' + id);
  expect(client.status).toBe(200);
  await page.locator('.arl-client-search input').fill(client.body.client.name);
  const preview = page.waitForResponse(response => new URL(response.url()).pathname === `/api/clients/${id}/open-orders`);
  await page.locator('.arl-client-results button[data-id="' + id + '"]').click();
  const open = await (await preview).json();
  // Existing UI fixtures deliberately open another call; exercise the actual confirmation button.
  if (confirmExisting && open.data?.length) {
    await page.getByRole('dialog', { name: 'Cliente com chamado em aberto' })
      .getByRole('button', { name: 'Confirmar novo chamado', exact: true }).click();
  }
}

/**
 * Test utility for E2E scenarios that need to switch device modes without
 * testing the settings form itself. The retired select was replaced by
 * Settings > Layouts preview cards. Reopening the same URL exercises the
 * persisted browser preference and never modifies production settings.
 */
export async function setDeviceLayout(page: Page, next: 'desktop' | 'mobile') {
  await page.evaluate(mode => {
    localStorage.setItem('arl-layout-mode', mode);
  }, next);
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(next === 'mobile' ? /layout-mobile/ : /layout-desktop/);
}

/** Select current Expense Control navigation in desktop or mobile UI. */
export async function openExpenseSection(page: Page, name: string) {
  // ExpenseControlPage is lazy loaded; do not inspect navigation before mount.
  await expect(page.locator('.cg-page')).toBeVisible();
  const desktop = page.getByRole('tab', { name, exact: true });
  if (await desktop.isVisible()) {
    await desktop.click();
    return;
  }
  if (name === 'Ajustes') {
    const settings = page.getByRole('navigation', { name: 'Navegação do Controle de Gastos' })
      .getByRole('button', { name: 'Ajustes', exact: true });
    await settings.click();
    return;
  }
  const mobile = page.getByRole('navigation', { name: 'Menu do Controle de Gastos' });
  const direct = mobile.getByRole('button', { name, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
    return;
  }
  if (name === 'Pagamentos' || name === 'Quitadas' || name === 'Histórico') {
    await mobile.getByRole('button', { name: name === 'Histórico' ? 'Projeção' : 'Gastos', exact: true }).click();
    await page.getByRole('button', { name: name === 'Histórico' ? 'Histórico de gastos' : name, exact: true }).click();
    return;
  }
  throw new Error('Seção de gastos indisponível no layout atual: ' + name);
}

/** Open the actual new-expense form, including the mobile manual/photo choice. */
export async function openNewExpenseDebt(page: Page) {
  await expect(page.locator('.cg-page')).toBeVisible();
  const desktop = page.getByRole('button', { name: 'Nova dívida', exact: true });
  if (await desktop.isVisible()) {
    await desktop.click();
    return;
  }
  await page.getByRole('navigation', { name: 'Menu do Controle de Gastos' })
    .getByRole('button', { name: 'Adicionar dívida' }).click();
  await page.getByRole('button', { name: 'Cadastro manual' }).click();
}
