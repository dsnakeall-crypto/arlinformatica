import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

const externalBackground = 'rgb(209, 213, 219)';
const reopenedRed = 'rgb(169, 0, 26)';

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

  return { clientName };
}

async function expectExternalRow(row: ReturnType<Page['locator']>) {
  await expect(row).toBeVisible();
  await expect(row.getByText('Externo', { exact: true })).toHaveCount(0);
  await expect(row.locator('.order-customer strong')).not.toHaveCSS('color', reopenedRed);
  await expect(row.locator('td').first()).toHaveCSS('background-color', externalBackground);
}

test('Painel e Ordens destacam atendimento externo somente pelo fundo cinza', async ({ page }) => {
  await login(page, 'e2e.master');
  const suffix = Date.now();
  const external = await createOrder(page, 'external', suffix);
  const bench = await createOrder(page, 'bench', suffix + 1);
  await page.reload();

  const dashboardRow = page.locator('.dashboard-order-list .order-row').filter({ hasText: external.clientName });
  await expectExternalRow(dashboardRow);
  const dashboardBench = page.locator('.dashboard-order-list .order-row').filter({ hasText: bench.clientName });
  await expect(dashboardBench).toBeVisible();
  await expect(dashboardBench).not.toHaveClass(/order-row-external/);

  await page.getByRole('button', { name: 'Ordens' }).click();
  await page.getByRole('tablist', { name: 'Filtrar ordens' }).getByRole('button', { name: 'Todas', exact: true }).click();
  const ordersRow = page.locator('.orders-order-list .order-row').filter({ hasText: external.clientName });
  await expectExternalRow(ordersRow);
});

test('home Mobile destaca atendimento externo somente pelo fundo cinza', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page, 'e2e.master');
  const { clientName } = await createOrder(page, 'external', Date.now());
  await page.reload();

  const card = page.locator('.arl-mobile-order-card').filter({ hasText: clientName });
  await expect(card).toBeVisible();
  await expect(card).toHaveClass(/arl-mobile-order-external/);
  await expect(card).toHaveCSS('background-color', externalBackground);
  await expect(card.getByText('Externo', { exact: true })).toHaveCount(0);
  await expect(card.locator('.arl-mobile-order-info strong')).not.toHaveCSS('color', reopenedRed);
});
