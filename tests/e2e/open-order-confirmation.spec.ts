import { expect, test } from '@playwright/test';
import { api, login, selectNewOrderClient, uniqueDocument } from './helpers';

test('Alterar status no Painel atualiza as listas uma vez, sem recarga duplicada', async ({ page }) => {
  await login(page);
  const client = await api(page, '/clients', 'POST', { name: 'Cliente Atualização Painel', document: uniqueDocument(), phone: '35999999999', street: 'Rua Teste', number: '1', district: 'Centro', city: 'Campos Gerais', state: 'MG', postal_code: '37160000' });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench', reported_problem: 'Teste de atualização do Painel.' });
  expect(order.status).toBe(201);
  await page.reload();
  const row = page.locator('.dashboard-orders .order-row').filter({ hasText: order.body.number });
  await expect(row).toBeVisible();
  let desk = 0, closed = 0;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/orders/desk') desk++;
    if (url.pathname === '/api/orders' && url.searchParams.get('tab') === 'closed_week') closed++;
  });
  await row.getByRole('combobox').selectOption('waiting_part');
  await expect(row.getByRole('combobox')).toHaveValue('waiting_part');
  expect(desk).toBe(1);
  expect(closed).toBe(1);
  expect((await api(page, `/orders/${order.body.id}`)).body.status).toBe('waiting_part');
});

for (const width of [1366, 390]) {
test(`Nova OS avisa com relato, cancela sem gravação e confirma segundo chamado (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await login(page);
  const client = await api(page, '/clients', 'POST', { name: 'Cliente Chamado Aberto', document: uniqueDocument(), phone: '35999999999', street: 'Rua Teste', number: '1', district: 'Centro', city: 'Campos Gerais', state: 'MG', postal_code: '37160000' });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const first = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench', reported_problem: 'Notebook não liga após queda.' });
  expect(first.status).toBe(201);
  if (width < 1024) await page.locator('.arl-global-mobile-nav').getByRole('button', { name: 'Nova OS', exact: true }).click();
  else await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  await selectNewOrderClient(page, client.body.id, false);
  const popup = page.getByRole('dialog', { name: 'Cliente com chamado em aberto' });
  await expect(popup).toContainText(first.body.number);
  await expect(popup).toContainText('Notebook não liga após queda.');
  await popup.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const before = await api(page, `/clients/${client.body.id}/open-orders`);
  expect(before.body.data).toHaveLength(1);
  await page.locator('.arl-manual-equipment-field input').fill('Monitor');
  await page.getByLabel('Sem senha', { exact: true }).check();
  await page.locator('.arl-new-order textarea').first().fill('Monitor sem imagem.');
  await page.getByRole('button', { name: 'Criar ordem de serviço', exact: true }).click();
  await expect(popup).toBeVisible();
  const rect = await popup.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.width).toBeLessThanOrEqual(width);
  await popup.screenshot({ path: test.info().outputPath('confirmacao-os.png') });
  await popup.getByRole('button', { name: 'Confirmar novo chamado', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  const after = await api(page, `/clients/${client.body.id}/open-orders`);
  expect(after.body.data).toHaveLength(2);
  await expect(page.getByText('Monitor sem imagem.', { exact: true }).first()).toBeVisible();
});
}

test('Retorno da aba verifica sessão em uma consulta e Painel fresco não repete listas', async ({ page }) => {
  await login(page);
  await expect(page.locator('.dashboard-orders').first()).not.toContainText('Carregando painel');
  let desk = 0, closed = 0, identity = 0, token = 0;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/orders/desk') desk++;
    if (url.pathname === '/api/orders' && url.searchParams.get('tab') === 'closed_week') closed++;
    if (url.pathname === '/api/me') identity++;
    if (url.pathname === '/session/csrf-token') token++;
  });
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.locator('[data-arl-clients-react="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.locator('.dashboard-orders').first()).toBeVisible();
  expect(desk).toBe(0); expect(closed).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => identity).toBe(1);
  await expect(page.locator('.dashboard-orders').first()).toBeVisible();
  expect(token).toBe(0); expect(desk).toBe(0); expect(closed).toBe(0);
});
