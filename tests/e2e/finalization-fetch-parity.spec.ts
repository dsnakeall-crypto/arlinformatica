import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument, validServiceItem } from './helpers';

test('fetch preserva os itens explícitos ao finalizar pela API do navegador', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const client = await api(page, '/clients', 'POST', {
    name: `Paridade Fetch ${stamp}`,
    document: uniqueDocument(stamp),
    phone: '35999999999',
    street: 'Rua Paridade',
  });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipment.body[0].id,
    attendance_type: 'bench',
    reported_problem: 'Validar preservação dos itens no fetch.',
    items: [],
    checklist: [],
  });
  expect(order.status).toBe(201);
  const serviceItem = await validServiceItem(page);
  const networkRequest = page.waitForRequest((request) =>
    request.url().endsWith(`/api/orders/${order.body.id}/finalize`) && request.method() === 'POST',
  );

  const finalized = await api(page, `/orders/${order.body.id}/finalize`, 'POST', {
    technical_report: 'Finalização enviada diretamente pela API do navegador.',
    items: [serviceItem],
    discount_cents: 0,
    photo_ids: [],
  });
  const sentPayload = (await networkRequest).postDataJSON();

  expect(sentPayload.items).toEqual([serviceItem]);
  expect(sentPayload).not.toHaveProperty('approved_budget_id');
  expect(finalized.status, JSON.stringify(finalized.body)).toBe(201);
  const persisted = await api(page, `/orders/${order.body.id}`);
  expect(persisted.body.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ catalog_id: serviceItem.catalog_id, quantity: 1 }),
  ]));
});
