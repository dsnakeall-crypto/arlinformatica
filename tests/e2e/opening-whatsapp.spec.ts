import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('abertura da OS mostra um único popup e prepara a mensagem fixa do WhatsApp', async ({ page }) => {
  await login(page);

  const stamp = Date.now();
  const clientName = `Cliente WhatsApp ${stamp}`;
  const createdClient = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(stamp),
    phone: '34999998888',
    postal_code: '38440000',
    street: 'Rua Teste',
    number: '10',
    district: 'Centro',
    city: 'Araguari',
    state: 'MG',
    complement: '',
  });
  expect(createdClient.status).toBe(201);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  await expect(page.locator('.os-form')).toBeVisible();
  await page.locator('.os-form section').first().locator('select').selectOption(String(createdClient.body.id));
  await page.getByLabel('Equipamento / Modelo / Acessórios *').fill('Notebook homologação WhatsApp');
  await page.getByLabel('Problema relatado *').fill('Teste da mensagem fixa de abertura');
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();

  const modal = page.locator('.arl-order-opened-modal');
  await expect(modal).toHaveCount(1);
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Enviar mensagem da Abertura da OS via Whatsapp' })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  await expect(modal.getByRole('link', { name: 'Enviar' })).toBeVisible();
  await expect(page.locator('.arl-od-modal, .arl-od-sharebar')).toHaveCount(0);
  await expect(page.getByText('Compartilhar Termo PDF', { exact: true })).toHaveCount(0);

  const orders = await api(page, `/orders?q=${encodeURIComponent(clientName)}`);
  expect(orders.status).toBe(200);
  const order = orders.body.data[0];
  expect(order).toBeTruthy();

  const expectedMessage = [
    `Olá, ${clientName}`,
    '',
    `Informamos que a sua *Ordem de Serviço nº ${order.number}* foi aberta com sucesso na *ARL Informática*.`,
    '',
    'Nosso departamento técnico já iniciou os procedimentos necessários. Em breve, entraremos em contato para atualizar o status do serviço e apresentar os detalhes da verificação do seu equipamento.',
    '',
    'Permanecemos à disposição para qualquer dúvida.',
    '',
    'Atenciosamente,',
    '',
    '*ARL Informática*',
  ].join('\n');

  const href = await modal.getByRole('link', { name: 'Enviar' }).getAttribute('href');
  expect(href).toBeTruthy();
  const url = new URL(href!);
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/5534999998888');
  expect(url.searchParams.get('text')).toBe(expectedMessage);

  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `OS #${order.number}` })).toBeVisible();
  await expect(page.locator('.arl-od-modal, .arl-od-sharebar')).toHaveCount(0);
  await expect(page.getByText('Compartilhar Termo PDF', { exact: true })).toHaveCount(0);

  const term = await page.request.get(`/api/orders/${order.id}/term`);
  expect(term.status()).toBe(200);
});

test('Configurações não oferece mais edição da mensagem de abertura', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('.arl-settings-tabs')).toBeVisible();

  const messages = page.locator('.arl-settings-tab[data-section="messages"]');
  await expect(messages).toBeVisible();
  await messages.click();

  await expect(page.locator('.arl-message-subnav [data-msg-tab="opening"]')).toHaveCount(0);
  await expect(page.locator('.arl-opening-message-panel')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Avaliação Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instagram' })).toBeVisible();
  await expect(page.getByText('Mensagem de abertura da OS', { exact: true })).toBeHidden();
});
