import { selectNewOrderClient } from './helpers';
import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('abertura da OS vai direto à ficha e mantém a mensagem fixa no menu de PDFs', async ({ page }) => {
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
  await selectNewOrderClient(page, createdClient.body.id);
  await page.getByLabel('Equipamento *').fill('Notebook homologação WhatsApp');
  await page.getByLabel('Problema relatado *').fill('Teste da mensagem fixa de abertura');
  const createdResponse = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
  const order = await (await createdResponse).json();

  await expect(page.locator('.arl-order-opened-modal')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `OS #${order.number}`, exact: true })).toBeVisible();
  await expect(page.locator('.arl-od-modal, .arl-od-sharebar')).toHaveCount(0);
  await expect(page.getByText('Compartilhar Termo PDF', { exact: true })).toHaveCount(0);

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

  const pdfMenu = page.locator('.arl-header-pdf-actions');
  await pdfMenu.getByRole('button', { name: "PDF's", exact: true }).click();
  const openingMessage = pdfMenu.getByRole('link', { name: 'Mensagem de abertura', exact: true });
  await expect(openingMessage).toBeVisible();
  const href = await openingMessage.getAttribute('href');
  expect(href).toBeTruthy();
  const url = new URL(href!);
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/5534999998888');
  expect(url.searchParams.get('text')).toBe(expectedMessage);

  const term = await page.request.get(`/api/orders/${order.id}/term`);
  expect(term.status()).toBe(200);
});

test('Configurações não oferece mais edição da mensagem de abertura', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('.arl-settings-tabs')).toBeVisible();

  const messages = page.locator('.arl-settings-tab[data-section="messages"]');
  await expect(messages).toHaveCount(0);
  await expect(page.locator('.arl-message-subnav [data-msg-tab="opening"]')).toHaveCount(0);
  await expect(page.locator('.arl-opening-message-panel')).toBeHidden();
  await expect(page.locator('.arl-message-subnav')).toBeHidden();
  const postMessagePanels = page.locator('.arl-post-message-panel');
  await expect(postMessagePanels).toHaveCount(0);
  await expect(page.locator('.arl-opening-message-panel').getByText('Mensagem de abertura da OS', { exact: true })).toBeHidden();
});
