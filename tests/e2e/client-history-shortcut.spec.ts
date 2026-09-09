import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('histórico do cliente exibe equipamento e somente descontos aplicados, com ida e volta pela OS', async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const clientName = `Cliente Histórico Atalho ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '34999995555',
    postal_code: '37160000',
    street: 'Rua Histórico',
    number: '42',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, `Cliente do histórico não foi criado: ${JSON.stringify(client.body)}`).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const notebook = equipment.body.find((item: { name: string }) => item.name === 'Notebook');
  const service = services.body.find((item: { name: string }) => item.name === 'Formatação E2E');
  expect(notebook, 'Catálogo deve conter Notebook para validar o equipamento no histórico').toBeDefined();
  expect(service, 'Catálogo deve conter Formatação E2E para finalizar a OS pelo fluxo real').toBeDefined();

  const createOrder = async (problem: string) => {
    const response = await api(page, '/orders', 'POST', {
      client_id: client.body.id,
      equipment_type_id: notebook.id,
      manufacturer_id: null,
      attendance_type: 'bench',
      reported_problem: problem,
      checklist: [],
      items: [{ catalog_id: service.id, quantity: 1 }],
    });
    expect(response.status, `OS do histórico não foi criada: ${JSON.stringify(response.body)}`).toBe(201);
    return response.body;
  };
  const discountedOrder = await createOrder('OS com desconto visível');
  const zeroDiscountOrder = await createOrder('OS sem desconto');

  for (const [order, discount] of [[discountedOrder, 1250], [zeroDiscountOrder, 0]] as const) {
    const finalized = await api(page, `/orders/${order.id}/finalize`, 'POST', {
      result: 'repair_completed',
      technical_report: 'Serviço concluído para validar o histórico.',
      discount_cents: discount,
      approved_budget_id: null,
      photo_ids: [],
      items: [{
        catalog_id: service.id,
        description: service.name,
        quantity: 1,
        unit_price_cents: service.price_cents,
        warranty_enabled: Boolean(service.warranty_enabled),
        warranty_term: service.warranty_enabled ? service.warranty_term : null,
        warranty_unit: service.warranty_enabled ? service.warranty_unit : null,
      }],
    });
    expect(finalized.status, `OS ${order.number} não foi finalizada: ${JSON.stringify(finalized.body)}`).toBe(201);
  }

  await page.getByRole('button', { name: 'Ordens de Serviço' }).click();
  const orderRow = page.locator('.order-row').filter({ hasText: discountedOrder.number });
  await expect(orderRow).toBeVisible();
  await orderRow.getByRole('button', { name: 'Ver OS' }).click();

  const detail = page.locator('[data-arl-order-detail-react="1"]');
  await expect(detail.getByRole('heading', { name: `OS #${discountedOrder.number}`, exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Ver histórico do cliente' }).click();

  await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
  const discountedHistory = page.locator('.clients-history-order').filter({ hasText: `OS #${discountedOrder.number}` });
  const zeroHistory = page.locator('.clients-history-order').filter({ hasText: `OS #${zeroDiscountOrder.number}` });
  await expect(discountedHistory.getByText('Equipamento: Notebook', { exact: true })).toBeVisible();
  await expect(discountedHistory.getByText('Desconto: R$ 12,50', { exact: true })).toBeVisible();
  await expect(discountedHistory.getByText('Total: R$ 137,50', { exact: true })).toBeVisible();
  await expect(zeroHistory.getByText(/^Desconto:/)).toHaveCount(0);
  await expect(zeroHistory.getByText('Total: R$ 150,00', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Voltar para a OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${discountedOrder.number}`, exact: true })).toBeVisible();
});
