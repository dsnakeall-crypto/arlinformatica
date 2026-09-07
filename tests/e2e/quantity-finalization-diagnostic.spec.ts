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
    reported_problem: 'Diagnóstico de quantidade maior que 1',
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

test('diagnóstico: quantidade alterada na tela diverge da finalização quando serviços ainda não foram salvos', async ({ page }) => {
  const { clientName, order, service } = await createOrderWithOneItem(page);
  const root = await openOrder(page, clientName, order.number);

  const quantity = root.getByLabel(`Quantidade de ${service.name}`);
  await quantity.fill('4');
  const expectedScreenSubtotal = Number(service.price_cents) * 4;
  await expect(root.locator('.arl-od-foot')).toContainText(`Subtotal: R$ ${(expectedScreenSubtotal / 100).toFixed(2).replace('.', ',')}`);

  // Reproduz exatamente o sintoma: a quantidade foi alterada visualmente, mas o botão
  // "Salvar serviços" ainda não foi acionado antes de abrir a finalização.
  await root.getByRole('button', { name: 'Concluir OS' }).click();
  const modal = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(modal).toBeVisible();
  const modalTotalText = await modal.locator('.money').innerText();

  const finalizeResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.id}/finalize` && response.request().method() === 'POST'
  );
  await modal.getByRole('button', { name: 'Salvar e concluir OS' }).click();
  const response = await finalizeResponse;
  expect(response.status()).toBe(201);
  const finalized = await response.json();
  const finalizedTotal = Number(finalized.finalization?.total_cents ?? -1);

  const payment = await api(page, `/orders/${order.id}/payments`);
  expect(payment.status).toBe(200);
  const financeTotal = Number(payment.body?.total_cents ?? -1);
  const balance = Number(payment.body?.balance_cents ?? -1);

  await expect(root.getByText(`Total: R$ ${(finalizedTotal / 100).toFixed(2).replace('.', ',')}`, { exact: true })).toBeVisible();
  const share = page.getByRole('status', { name: 'Compartilhar fechamento da OS' });
  await expect(share).toBeVisible();
  const pdfHref = await share.getByRole('link', { name: 'Abrir PDF' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  const pdfResponse = await page.request.get(pdfHref!);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

  const whatsappHref = await share.getByRole('link', { name: 'Enviar PDF pelo WhatsApp' }).getAttribute('href');
  expect(whatsappHref).toBeTruthy();
  const whatsappText = decodeURIComponent(new URL(whatsappHref!).searchParams.get('text') ?? '');
  const formattedFinalTotal = `R$ ${(finalizedTotal / 100).toFixed(2).replace('.', ',')}`;
  expect(whatsappText).toContain(`- Valor: ${formattedFinalTotal}`);

  const persisted = await api(page, `/orders/${order.id}`);
  const finalItem = persisted.body?.items?.find((row: any) => row.finalization_id);

  console.log('QUANTITY_DIAGNOSTIC', JSON.stringify({
    order: order.number,
    service: service.name,
    unit_price_cents: Number(service.price_cents),
    ui_quantity: 4,
    ui_subtotal_cents: expectedScreenSubtotal,
    finalization_modal: modalTotalText.replace(/\s+/g, ' ').trim(),
    finalized_item_quantity: Number(finalItem?.quantity ?? -1),
    finalized_item_subtotal_cents: Number(finalItem?.subtotal_cents ?? -1),
    finalization_total_cents: finalizedTotal,
    finance_total_cents: financeTotal,
    balance_cents: balance,
    pdf_http_status: pdfResponse.status(),
    pdf_total_source_cents: finalizedTotal,
    whatsapp_value: formattedFinalTotal,
  }));

  expect(expectedScreenSubtotal).toBe(Number(service.price_cents) * 4);
  expect(finalizedTotal).toBe(Number(service.price_cents));
  expect(financeTotal).toBe(finalizedTotal);
  expect(balance).toBe(finalizedTotal);
  expect(Number(finalItem?.quantity)).toBe(1);
  expect(Number(finalItem?.subtotal_cents)).toBe(Number(service.price_cents));
});
