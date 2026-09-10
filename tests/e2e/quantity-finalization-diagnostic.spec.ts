import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createOrderWithOneItem(page: Page) {
  await login(page);
  const suffix = Date.now();
  const clientName = `Cliente Quantidade ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '35999998888',
    postal_code: '37160000',
    street: 'Rua Quantidade',
    number: '80',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, JSON.stringify(client.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const equipmentType = equipment.body?.[0];
  const service = services.body?.find((row: any) => row.name === 'Formatação E2E') ?? services.body?.[0];
  expect(equipmentType).toBeTruthy();
  expect(service).toBeTruthy();

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: 'Contrato de quantidade maior que 1',
    checklist: [],
    items: [{ catalog_id: service.id, quantity: 1 }],
  });
  expect(order.status, JSON.stringify(order.body)).toBe(201);
  return { clientName, order: order.body, service };
}

async function openOrder(page: Page, clientName: string, orderNumber: string) {
  await page.getByRole('button', { name: 'Ordens de Serviço' }).click();
  const row = page.locator('.order-row').filter({ hasText: clientName });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}`, exact: true })).toBeVisible();
  return page.locator('[data-arl-order-detail-react="1"]');
}

const formattedMoney = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

test('finalização persiste quantidade pendente antes de gerar snapshot, financeiro, PDF e WhatsApp', async ({ page }) => {
  const { clientName, order, service } = await createOrderWithOneItem(page);
  const root = await openOrder(page, clientName, order.number);

  const quantity = root.getByLabel(`Quantidade de ${service.name}`);
  await quantity.fill('4');
  const expectedTotal = Number(service.price_cents) * 4;
  const expectedMoney = formattedMoney(expectedTotal);
  await expect(root.locator('.arl-od-foot')).toContainText(`Subtotal: ${expectedMoney}`);

  const pendingSaveResponse = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${order.id}` || request.method() !== 'PATCH') return false;
    const body = request.postDataJSON();
    return Array.isArray(body?.items) && body.items.some((item: any) => Number(item.catalog_id) === Number(service.id) && Number(item.quantity) === 4);
  });

  await root.getByRole('button', { name: 'Concluir OS' }).click();
  const saved = await pendingSaveResponse;
  expect(saved.status()).toBe(200);

  const persistedBeforeFinalization = await api(page, `/orders/${order.id}`);
  expect(persistedBeforeFinalization.status).toBe(200);
  const activeItem = persistedBeforeFinalization.body?.items?.find((row: any) => !row.finalization_id && Number(row.catalog_id) === Number(service.id));
  expect(Number(activeItem?.quantity)).toBe(4);
  expect(Number(activeItem?.subtotal_cents)).toBe(expectedTotal);
  expect(Number(persistedBeforeFinalization.body?.total_cents)).toBe(expectedTotal);

  const modal = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(modal).toBeVisible();
  const listedItems = modal.locator('[data-finalization-item="true"]');
  await expect(listedItems).toHaveCount(1);
  await expect(listedItems.getByLabel('Descrição do item 1')).toHaveValue(service.name);
  await expect(listedItems.getByLabel(`Quantidade de ${service.name}`)).toHaveValue('4');
  await expect(listedItems.getByLabel(`Valor unitário de ${service.name}`)).toHaveValue((Number(service.price_cents) / 100).toFixed(2));
  await expect(listedItems).toContainText(expectedMoney);
  await expect(modal.locator('.money')).toContainText(`Subtotal ${expectedMoney}`);
  await expect(modal.locator('.money')).toContainText(`Total ${expectedMoney}`);

  const finalizeResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.id}/finalize` && response.request().method() === 'POST'
  );
  await modal.getByRole('button', { name: 'Salvar e concluir OS' }).click();
  const response = await finalizeResponse;
  expect(response.status()).toBe(201);
  const finalizePayload = response.request().postDataJSON();
  expect(Number(finalizePayload?.items?.[0]?.quantity)).toBe(4);
  const finalized = await response.json();
  const finalizedTotal = Number(finalized.finalization?.total_cents ?? -1);
  expect(finalizedTotal).toBe(expectedTotal);

  const payment = await api(page, `/orders/${order.id}/payments`);
  expect(payment.status).toBe(200);
  expect(Number(payment.body?.total_cents)).toBe(expectedTotal);
  expect(Number(payment.body?.balance_cents)).toBe(expectedTotal);

  const persisted = await api(page, `/orders/${order.id}`);
  expect(persisted.status).toBe(200);
  const finalItem = persisted.body?.items?.find((row: any) => row.finalization_id && Number(row.catalog_id) === Number(service.id));
  expect(Number(finalItem?.quantity)).toBe(4);
  expect(Number(finalItem?.subtotal_cents)).toBe(expectedTotal);
  expect(Number(persisted.body?.total_cents)).toBe(expectedTotal);

  await expect(root.getByText(`Total: ${expectedMoney}`, { exact: true })).toBeVisible();
  const share = page.getByRole('status', { name: 'Compartilhar fechamento da OS' });
  await expect(share).toBeVisible();

  const pdfHref = await share.getByRole('link', { name: 'Abrir PDF' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  const pdfResponse = await page.request.get(pdfHref!);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
  expect((await pdfResponse.body()).byteLength).toBeGreaterThan(1000);

  const whatsappHref = await share.getByRole('link', { name: 'Enviar PDF pelo WhatsApp' }).getAttribute('href');
  expect(whatsappHref).toBeTruthy();
  const whatsappText = decodeURIComponent(new URL(whatsappHref!).searchParams.get('text') ?? '');
  expect(whatsappText).toContain(`- Valor: ${expectedMoney}`);
});
