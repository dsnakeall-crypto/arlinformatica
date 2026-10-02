import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument, validServiceItem } from './helpers';

test('marca dez cards, confirma uma exclusão em lote e preserva OS, PDFs e o card não marcado', async ({ page }) => {
  await login(page);
  const equipment = await api(page, '/catalogs/equipment');
  const item = await validServiceItem(page);
  const seed = Date.now();
  const orders: { id: number; number: string }[] = [];
  for (let index = 0; index < 11; index++) {
    const client = await api(page, '/clients', 'POST', {
      name: `Cliente seleção ${seed} ${index}`, document: uniqueDocument(seed + index),
      phone: '35999995555', street: 'Rua Seleção',
    });
    expect(client.status, JSON.stringify(client.body)).toBe(201);
    const order = await api(page, '/orders', 'POST', {
      client_id: client.body.id, equipment_type_id: equipment.body[0].id,
      attendance_type: 'bench', reported_problem: 'Teste de exclusão de card em lote', checklist: [],
    });
    expect(order.status, JSON.stringify(order.body)).toBe(201);
    const finalized = await api(page, `/orders/${order.body.id}/finalize`, 'POST', {
      technical_report: 'Equipamento reparado e testado.', discount_cents: 0, items: [item], photo_ids: [],
    });
    expect(finalized.status, JSON.stringify(finalized.body)).toBe(201);
    orders.push({ id: order.body.id, number: order.body.number });
  }
  await page.reload();
  await page.getByRole('button', { name: 'Pós-Venda', exact: true }).click();
  const first = page.locator('.post-sale-card').filter({ hasText: `OS ${orders[0].number}` });
  await expect(page.locator('.post-sale-menu')).toHaveCount(0);
  await expect(first.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Selecionar cards', exact: true }).click();
  await first.getByRole('checkbox').check();
  const toolbar = page.getByRole('region', { name: 'Cards selecionados' });
  await expect(toolbar).toContainText('1 card selecionado');
  await toolbar.getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(toolbar).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancelar seleção', exact: true }).click();
  await expect(first.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Selecionar cards', exact: true }).click();
  await first.getByRole('checkbox').check();
  for (const order of orders.slice(1, 10)) {
    await page.getByRole('checkbox', { name: `Marcar card da OS ${order.number}`, exact: true }).check();
  }
  await expect(toolbar).toContainText('10 cards selecionados');
  const search = page.getByRole('searchbox', { name: 'Buscar por cliente ou OS' });
  await search.fill(orders[10].number);
  await expect(toolbar).toContainText('10 cards selecionados');
  await expect(page.getByRole('checkbox', { name: `Marcar card da OS ${orders[10].number}`, exact: true })).not.toBeChecked();
  await search.fill('');
  await page.screenshot({ path: 'test-results/post-sale-bulk-desktop.png', fullPage: true });
  let writes = 0;
  page.on('request', request => {
    if (request.url().endsWith('/api/post-sales/bulk-delete') && request.method() === 'POST') writes++;
  });
  await toolbar.getByRole('button', { name: 'Excluir selecionados' }).click();
  let dialog = page.getByRole('dialog', { name: 'Excluir 10 cards de Pós-Venda?' });
  await expect(dialog).toContainText('documentos e histórico de mensagens continuarão preservados');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(writes).toBe(0);
  await expect(toolbar).toContainText('10 cards selecionados');
  // Pós-Venda is a Web/PC page; the dedicated Mobile layout does not expose it.
  await page.setViewportSize({ width: 1180, height: 900 });
  const bounds = await toolbar.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1180);
  await page.screenshot({ path: 'test-results/post-sale-bulk-1180.png', fullPage: true });
  await toolbar.getByRole('button', { name: 'Excluir selecionados' }).click();
  dialog = page.getByRole('dialog', { name: 'Excluir 10 cards de Pós-Venda?' });
  const removed = page.waitForResponse(response => response.url().endsWith('/api/post-sales/bulk-delete'));
  await dialog.getByRole('button', { name: 'Excluir selecionados', exact: true }).click();
  expect((await removed).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(toolbar).toHaveCount(0);
  expect(writes).toBe(1);
  const remaining = await api(page, '/post-sales');
  for (const order of orders.slice(0, 10)) {
    expect(remaining.body.some((row: { number: string }) => row.number === order.number)).toBe(false);
    const preserved = await api(page, `/orders/${order.id}`);
    expect(preserved.status).toBe(200);
    expect(preserved.body.status).toBe('completed');
    expect((await page.request.get(`/api/orders/${order.id}/final/1/pdf`)).status()).toBe(200);
  }
  await expect(page.locator('.post-sale-card').filter({ hasText: `OS ${orders[10].number}` })).toBeVisible();
});
