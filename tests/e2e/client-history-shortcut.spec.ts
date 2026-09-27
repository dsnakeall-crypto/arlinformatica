import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

async function openOrder(page: Page, orderNumber: string) {
  await page.getByRole('button', { name: 'Ordens' }).click();
  await page.getByRole('tablist', { name: 'Filtrar ordens' }).getByRole('button', { name: 'Todas', exact: true }).click();
  const row = page.locator('.order-row').filter({ hasText: orderNumber });
  await expect(row, `A OS #${orderNumber} deve aparecer na listagem`).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}`, exact: true })).toBeVisible();
}

async function finalizeThroughUi(page: Page, order: { id: number; number: string }, discountCents: number) {
  await openOrder(page, order.number);
  await page.getByLabel('Laudo Final').fill('Serviço concluído para validação do histórico do cliente.');
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('.finish-item input').first()).toHaveValue('Formatação E2E');
  await modal.getByLabel('Desconto (R$)').fill((discountCents / 100).toFixed(2).replace('.', ','));

  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.id}/finalize` && response.request().method() === 'POST'
  );
  await modal.getByRole('button', { name: 'Salvar e concluir OS' }).click();
  const response = await responsePromise;
  expect(response.status(), `A finalização da OS #${order.number} pela interface deve retornar 201`).toBe(201);
  await expect(page.locator('.completion').getByText('Finalizado', { exact: true })).toBeVisible();

  const share = page.getByRole('status', { name: 'Compartilhar fechamento da OS' });
  await expect(share).toBeVisible();
  await expect(share.getByRole('button', { name: 'Fechar' })).toHaveCount(0);
}

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
  expect(service, 'Catálogo deve conter Formatação E2E para preparar a OS pelo padrão E2E').toBeDefined();

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

  await finalizeThroughUi(page, discountedOrder, 1250);
  await finalizeThroughUi(page, zeroDiscountOrder, 0);
  await openOrder(page, discountedOrder.number);

  const detail = page.locator('[data-arl-order-detail-react="1"]');
  await detail.getByRole('button', { name: 'Histórico', exact: true }).click();

  await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
  const discountedHistory = page.locator('.clients-history-order').filter({ hasText: `OS #${discountedOrder.number}` });
  const zeroHistory = page.locator('.clients-history-order').filter({ hasText: `OS #${zeroDiscountOrder.number}` });
  const persistedHistory = await api(page, `/clients/${client.body.id}`);
  expect(persistedHistory.body.orders.find((order: any) => order.id === discountedOrder.id)?.discount_cents).toBe(1250);
  expect(persistedHistory.body.orders.find((order: any) => order.id === zeroDiscountOrder.id)?.discount_cents).toBe(0);
  await expect(discountedHistory.getByText('Equipamento: Notebook', { exact: true })).toBeVisible();
  await expect(discountedHistory.getByText(`Total: ${money(Number(service.price_cents) - 1250)}`, { exact: true })).toBeVisible();
  await expect(zeroHistory.getByText(`Total: ${money(Number(service.price_cents))}`, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Desconto:/)).toHaveCount(0);
  await expect(page.locator('.clients-history-services')).toHaveCount(0);

  await page.getByRole('button', { name: 'Voltar para a OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${discountedOrder.number}`, exact: true })).toBeVisible();
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  const mobileDetail = page.locator('[data-mobile-read-only="1"]');
  await expect(mobileDetail).toBeVisible();
  await expect(mobileDetail.getByRole('button', { name: 'Histórico', exact: true })).toHaveCount(0);
});
