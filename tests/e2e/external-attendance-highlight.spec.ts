import { expect, test, type Locator, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

const externalLabel = 'Externo';

async function createOrder(page: Page, attendanceType: 'bench' | 'external', suffix: number) {
  const clientName = `Cliente destaque externo ${attendanceType} ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '35999995555',
    postal_code: '37160000',
    street: 'Rua Destaque',
    number: '10',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, JSON.stringify(client.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  expect(equipment.status, JSON.stringify(equipment.body)).toBe(200);
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipment.body[0].id,
    attendance_type: attendanceType,
    reported_problem: 'Validação do destaque de atendimento',
    checklist: [],
  });
  expect(order.status, JSON.stringify(order.body)).toBe(201);

  return { clientName, orderId: order.body.id };
}

async function backgroundOf(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function expectExternalRow(row: Locator, standardBackground: string) {
  await expect(row).toBeVisible();
  await expect(row.getByText(externalLabel, { exact: true })).toHaveClass(/status-awaiting_payment/);
  await expect(row.locator('td').first()).toHaveCSS('background-color', standardBackground);
  await expect(row.locator('.order-customer')).toHaveCSS('text-align', 'center');
  await expect(row.locator('.arl-order-markers')).toHaveCSS('justify-content', 'center');
}

async function expectMarkersOnOneLine(markers: Locator) {
  await expect(markers.locator(':scope > span')).toHaveCount(2);
  const rows = await markers.locator(':scope > span').evaluateAll((nodes) =>
    new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().top))).size,
  );
  expect(rows, 'As etiquetas devem ocupar a mesma linha em tela de desktop').toBe(1);
}

test('Painel e Ordens exibem atendimento externo com as cores de aguardando pagamento', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, 'e2e.master');
  const suffix = Date.now();
  const external = await createOrder(page, 'external', suffix);
  const bench = await createOrder(page, 'bench', suffix + 1);
  const marked = await api(page, `/orders/${external.orderId}/closing-reference`, 'PATCH', { amount_cents: 12345 });
  expect(marked.status, JSON.stringify(marked.body)).toBe(200);
  await page.reload();

  const dashboardRow = page.locator('.dashboard-order-list .order-row').filter({ hasText: external.clientName });
  const dashboardBench = page.locator('.dashboard-order-list .order-row').filter({ hasText: bench.clientName });
  await expect(dashboardBench).toBeVisible();
  await expectExternalRow(dashboardRow, await backgroundOf(dashboardBench.locator('td').first()));
  await expectMarkersOnOneLine(dashboardRow.locator('.arl-order-markers'));
  await expect(dashboardBench.getByText(externalLabel, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Ordens' }).click();
  await page.getByRole('tablist', { name: 'Filtrar ordens' }).getByRole('button', { name: 'Todas', exact: true }).click();
  const ordersRow = page.locator('.orders-order-list .order-row').filter({ hasText: external.clientName });
  const ordersBench = page.locator('.orders-order-list .order-row').filter({ hasText: bench.clientName });
  await expect(ordersBench).toBeVisible();
  await expectExternalRow(ordersRow, await backgroundOf(ordersBench.locator('td').first()));
  await expectMarkersOnOneLine(ordersRow.locator('.arl-order-markers'));
  await expect(ordersBench.getByText(externalLabel, { exact: true })).toHaveCount(0);
});

test('home Mobile exibe atendimento externo com as cores de aguardando pagamento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page, 'e2e.master');
  const suffix = Date.now();
  const external = await createOrder(page, 'external', suffix);
  const bench = await createOrder(page, 'bench', suffix + 1);
  await page.reload();

  const card = page.locator('.arl-mobile-order-card').filter({ hasText: external.clientName });
  await expect(card).toBeVisible();
  const benchCard = page.locator('.arl-mobile-order-card').filter({ hasText: bench.clientName });
  await expect(benchCard).toBeVisible();
  await expect(card.getByText(externalLabel, { exact: true })).toHaveClass(/status-awaiting_payment/);
  await expect(card).toHaveCSS('background-color', await backgroundOf(benchCard));
  await expect(card.locator('.arl-mobile-order-info')).toHaveCSS('text-align', 'center');
  await expect(card.locator('.arl-mobile-order-info')).toHaveCSS('justify-items', 'center');
  await expect(benchCard.getByText(externalLabel, { exact: true })).toHaveCount(0);
});
