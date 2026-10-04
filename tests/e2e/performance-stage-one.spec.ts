import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createOrder(page: import('@playwright/test').Page) {
  const client = await api(page, '/clients', 'POST', {
    name: 'Cliente Performance', document: uniqueDocument(), phone: '35999990000', postal_code: '37160000',
    street: 'Rua Performance', number: '1', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id, equipment_type_id: equipment.body[0].id,
    attendance_type: 'bench', reported_problem: 'Teste de performance', checklist: [],
  });
  expect(order.status).toBe(201);
  return order.body;
}

test('Painel consulta a semana uma vez e usa total, não tamanho da página', async ({ page }) => {
  const calls: string[] = [];
  await page.route('**/api/orders?tab=closed_week&per_page=*', async route => {
    calls.push(route.request().url());
    await route.fulfill({ json: { data: [], total: 150 } });
  });
  await login(page);
  const completed = page.locator('.dashboard-cards article').filter({ hasText: 'Concluídos' });
  await expect(completed.locator('strong')).toHaveText('150');
  expect(calls).toHaveLength(1);
  expect(new URL(calls[0]).searchParams.get('per_page')).toBe('100');
});

test('Contadores de navegação limitam cliques a 30 segundos', async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.route('**/api/navigation-summary', async route => {
    calls++;
    await route.fulfill({ json: { open_orders: calls, available_post_sales: 0 } });
  });
  await login(page);
  await expect.poll(() => calls).toBe(1);
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.locator('[data-arl-clients-react="1"]')).toBeVisible();
  expect(calls).toBe(1);
  await page.clock.runFor(30_000);
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect.poll(() => calls).toBe(2);
});

test('Abrir OS reutiliza perfil autenticado sem novo GET me', async ({ page }) => {
  await login(page);
  const order = await createOrder(page);
  let profileCalls = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/me') profileCalls++; });
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  const row = page.locator('.order-row').filter({ hasText: order.number });
  await row.getByRole('button', { name: 'Ver OS', exact: true }).click();
  await expect(page.getByRole('heading', { name: `OS #${order.number}`, exact: true })).toBeVisible();
  await expect(page.locator('[data-arl-order-detail-react="1"] .arl-od-services')).toBeVisible();
  expect(profileCalls).toBe(0);
});

test('Ordens aguarda 300 ms, cancela busca antiga e pesquisa na página 1', async ({ page }) => {
  await login(page);
  await page.clock.install();
  const calls: string[] = [];
  let releaseOld!: () => void;
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('**/api/orders?*', async route => {
    const term = new URL(route.request().url()).searchParams.get('q');
    calls.push(route.request().url());
    if (term === 'antiga') await oldGate;
    await route.fulfill({ json: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 12, tab_counts: {} } });
  });
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByText('Nenhuma ordem de serviço encontrada.', { exact: true })).toBeVisible();
  calls.length = 0;
  const search = page.getByPlaceholder('Número da OS ou nome do cliente…');
  await search.fill('a');
  await page.clock.runFor(200);
  await search.fill('antiga');
  await expect(search).toHaveValue('antiga');
  await page.clock.runFor(299);
  expect(calls).toHaveLength(0);
  await page.clock.runFor(1);
  await expect.poll(() => calls.length).toBe(1);
  await search.fill('nova');
  await page.clock.runFor(300);
  await expect.poll(() => calls.length).toBe(2);
  await expect(page.getByText('Nenhuma ordem de serviço encontrada.', { exact: true })).toBeVisible();
  releaseOld();
  expect(new URL(calls[1]).searchParams.get('q')).toBe('nova');
  expect(new URL(calls[1]).searchParams.get('page')).toBe('1');
  await expect(search).toHaveValue('nova');
});

test('Buscar a partir da página 2 retorna à primeira página', async ({ page }) => {
  await login(page);
  const order = await createOrder(page);
  const calls: URL[] = [];
  await page.route('**/api/orders?*', async route => {
    const url = new URL(route.request().url());
    calls.push(url);
    const currentPage = Number(url.searchParams.get('page'));
    await route.fulfill({ json: { data: [order], total: 13, current_page: currentPage, last_page: 2, per_page: 12, from: currentPage === 1 ? 1 : 13, to: currentPage === 1 ? 12 : 13, next_page_url: currentPage === 1 ? '/api/orders?page=2' : null, tab_counts: {} } });
  });
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.locator('.order-row').filter({ hasText: order.number })).toBeVisible();
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.searchParams.get('page')).toBe('2');
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill('Cliente Performance');
  await expect.poll(() => calls.at(-1)?.searchParams.get('q')).toBe('Cliente Performance');
  expect(calls.at(-1)?.searchParams.get('page')).toBe('1');
  await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled();
});
