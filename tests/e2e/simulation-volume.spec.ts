import { test, expect } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('volume integrado: 30 clientes/OS, 30 fornecedores/compras e 48 dívidas na interface', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const stamp = Date.now();
  const prefix = 'Volume ' + stamp;
  const equipment = (await api(page, '/catalogs/equipment')).body.filter((row: any) => row.active);
  const product = await api(page, '/catalogs/products', 'POST', { name: prefix + ' SSD', price_cents: 48000, stock_quantity: 100, warranty_enabled: false, active: true });
  expect(product.status).toBe(201);
  const first = { client: 0, order: 0, supplier: 0, purchase: 0 };
  const day = new Date().toLocaleDateString('sv-SE');
  for (let i = 0; i < 30; i++) {
    const common = { document: uniqueDocument(stamp + i), phone: '35999991234', postal_code: '37160000', street: 'Rua fictícia de teste', number: String(i + 1), district: 'Centro', city: 'Campos Gerais', state: 'MG' };
    const client = await api(page, '/clients', 'POST', { ...common, name: prefix + ' cliente ' + i });
    expect(client.status).toBe(201);
    const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment[i % equipment.length].id, equipment_description: 'Equipamento fictício ' + i, attendance_type: i % 2 ? 'external' : 'bench', reported_problem: 'Falha fictícia para homologação ' + i, system_password_absent: true, checklist: [], items: [{ catalog_id: product.body.id, quantity: 1 }] });
    expect(order.status).toBe(201);
    if (i % 3 === 0) expect((await api(page, '/orders/' + order.body.id + '/status', 'PATCH', { status: 'waiting_part' })).status).toBe(200);
    if (i % 3 === 1) expect((await api(page, '/orders/' + order.body.id + '/status', 'PATCH', { status: 'in_service' })).status).toBe(200);
    const supplier = await api(page, '/suppliers', 'POST', { ...common, document: uniqueDocument(stamp + 100 + i), name: prefix + ' fornecedor ' + i, trade_name: 'Parceiro fictício ' + i, whatsapp: '35999991234' });
    expect(supplier.status).toBe(201);
    const purchase = await api(page, '/suppliers/' + supplier.body.id + '/purchases', 'POST', { request_key: crypto.randomUUID(), purchased_on: day, received_now: i % 2 === 0, items: [{ product_id: product.body.id, quantity: 2, unit_cost_cents: 20000 + i }], payment_terms: 'installments', payment_method: 'boleto', installments: [{ amount_cents: 20000 + i, due_on: day }, { amount_cents: 20000 + i, due_on: day }] });
    expect(purchase.status).toBe(201);
    if (!i) Object.assign(first, { client: client.body.id, order: order.body.id, supplier: supplier.body.id, purchase: purchase.body.id });
  }
  const banks: any[] = [];
  for (let i = 0; i < 8; i++) {
    const created = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: prefix + ' banco ' + i, due_day: 10 + i, color: '#234567', active: true });
    expect(created.status).toBe(200); banks.push(created.body);
  }
  const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: prefix + ' cartão', active: true });
  expect(type.status).toBe(200);
  let firstDebt = 0;
  for (let i = 0; i < 48; i++) {
    const created = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: banks[i % 8].id, type_id: type.body.id, name: prefix + ' compra ' + i, recurrence: 'installments', responsibility: ['one', 'two', 'shared'][i % 3], percent_one: 50, amount_cents: 10001 + i, installment_count: i % 12 + 1, first_number: 1, start_month: day.slice(0, 7), due_day: 10, notes: 'Fictício' });
    expect(created.status).toBe(201);
    if (!i) firstDebt = created.body.debt.id;
  }
  const checkWidth = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes', exact: true })).toBeVisible();
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-clients.png' });
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-orders.png' });
  await page.goto('/suppliers');
  await page.getByLabel('Buscar fornecedor').fill(prefix);
  await expect(page.locator('.supplier-directory-row')).toHaveCount(20);
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-suppliers.png' });
  await page.goto('/suppliers?supplier=' + first.supplier);
  await page.getByRole('tab', { name: 'Financeiro', exact: true }).click();
  await expect(page.locator('.supplier-page')).toContainText('Compra');
  await expect(page.getByText('Carregando informações...', { exact: true })).toHaveCount(0);
  await expect(page.locator('.supplier-page')).toContainText('Compra #' + first.purchase);
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-supplier-finance.png' });
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.locator('.cg-institution').filter({ hasText: banks[0].name })).toBeVisible();
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-expenses.png' });
  await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.cg-mobile-summary')).toBeVisible();
  await checkWidth(); await page.screenshot({ path: 'output/homologacao-geral/volume-mobile-summary.png', fullPage: true });
  await page.getByRole('tab', { name: 'Pagamentos', exact: true }).click();
  await checkWidth();
  expect(errors).toEqual([]);
  expect((await api(page, '/expense-control/debts/' + firstDebt)).status).toBe(200);
});
