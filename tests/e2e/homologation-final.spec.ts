import { expect, test } from '@playwright/test';
import { api, login, selectNewOrderClient, uniqueDocument } from './helpers';

test('homologação final: itens da abertura, clientes desktop e fechamento real do menu mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  const clientResponse = await api(page, '/clients', 'POST', {
    name: 'Cliente Homologação Final',
    document: uniqueDocument(26090311),
    phone: '35999887766',
    postal_code: '37160000',
    street: 'Rua da Homologação',
    number: '25',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
    complement: '',
  });
  expect(clientResponse.status).toBe(201);

  const services = await api(page, '/catalogs/services');
  expect(services.status).toBe(200);
  expect(services.body.length).toBeGreaterThan(0);
  const service = services.body[0];

  const nav = page.locator('aside nav');
  await nav.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.locator('.clients-react-page')).toBeVisible();
  await expect(page.locator('.clients-list-panel')).toBeVisible();
  await expect(page.getByTestId('client-modal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
  const clientModal = page.getByTestId('client-modal');
  await expect(clientModal).toBeVisible();
  await expect(clientModal.getByTestId('client-form')).toBeVisible();
  await expect(clientModal.getByRole('heading', { name: 'Novo cliente' })).toBeVisible();
  await clientModal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(clientModal).toHaveCount(0);

  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  const form = page.locator('form.os-form');
  await expect(form.getByRole('heading', { name: 'Serviços / Itens da OS' })).toBeVisible();
  await selectNewOrderClient(page, clientResponse.body.id);
  await expect(form.getByPlaceholder('Buscar por nome, telefone ou CPF/CNPJ')).toHaveValue(clientResponse.body.name);
  await expect(form.locator('.arl-client-results button')).toHaveCount(0);
  await form.getByLabel('Equipamento *').fill('Notebook');
  await form.getByLabel('Fabricante / Modelo / Acessórios').fill('Dell Inspiron 15 + carregador');
  await form.getByLabel('Problema relatado *').fill('Teste final de itens opcionais na abertura.');
  await form.locator('.opening-catalog button').filter({ hasText: service.name }).click();
  await expect(form.locator('.opening-item').filter({ hasText: service.name })).toBeVisible();

  const orderResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Criar ordem de serviço' }).click();
  const orderResponse = await orderResponsePromise;
  expect(orderResponse.status()).toBe(201);
  const requestBody = orderResponse.request().postDataJSON();
  expect(requestBody.client_id).toBe(clientResponse.body.id);
  expect(requestBody.items).toEqual([{ catalog_id: service.id, quantity: 1 }]);
  expect(requestBody.equipment_description).toBe('Notebook');
  expect(requestBody.equipment_details).toBe('Dell Inspiron 15 + carregador');
  const created = await orderResponse.json();

  await expect(page.getByRole('heading', { name: `OS #${created.number}`, exact: true })).toBeVisible();
  const detail = await api(page, `/orders/${created.id}`);
  expect(detail.status).toBe(200);
  expect(detail.body.client.id).toBe(clientResponse.body.id);
  expect(detail.body.equipment_description).toBe('Notebook');
  expect(detail.body.equipment_details).toBe('Dell Inspiron 15 + carregador');
  expect(detail.body.items).toHaveLength(1);
  expect(detail.body.items[0].description).toBe(service.name);
  expect(detail.body.items[0].unit_price_cents).toBe(service.price_cents);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.locator('.menu-toggle').click();
  const mobileAside = page.locator('aside');
  await expect(mobileAside).toHaveClass(/open/);
  await mobileAside.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.locator('.clients-react-page')).toBeVisible();
  await expect(mobileAside).not.toHaveClass(/open/);
  const box = await mobileAside.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(0);
});
