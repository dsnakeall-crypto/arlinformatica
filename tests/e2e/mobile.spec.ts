import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('mobile possui navegação própria, filtros contidos, ações tocáveis e inputs sem zoom forçado', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByText('Carregando painel...')).toHaveCount(0);

  const viewportSize = page.viewportSize();
  expect(viewportSize).not.toBeNull();
  const filterBoxes = await page.locator('.dashboard-cards + .panel > .filters input, .dashboard-cards + .panel > .filters select').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height };
  }));
  expect(filterBoxes).toHaveLength(3);
  for (const box of filterBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewportSize!.width);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportSize!.width);

  await expect(page.locator('.menu-toggle')).toBeVisible();
  await page.locator('.menu-toggle').click();
  await expect(page.locator('aside.open')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  const firstClient = page.locator('.clients-list-panel .client-list article').first();
  await expect(firstClient).toBeVisible();
  const clientBounds = await firstClient.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  });
  const clientActionBoxes = await firstClient.locator('.contact-links a, .contact-links button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, height: rect.height };
  }));
  expect(clientActionBoxes.length).toBeGreaterThan(0);
  for (const box of clientActionBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(clientBounds.left);
    expect(box.right).toBeLessThanOrEqual(clientBounds.right);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const phoneWhiteSpace = await firstClient.locator(':scope > span').first().evaluate((element) => getComputedStyle(element).whiteSpace);
  expect(phoneWhiteSpace).toBe('nowrap');
  const clientsDocumentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(clientsDocumentWidth).toBeLessThanOrEqual(viewportSize!.width);

  await page.locator('.menu-toggle').click();
  await expect(page.locator('aside.open')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  const fontSize = await page.getByLabel('Problema relatado *').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  await expect(page.locator('input[type=file]')).toHaveAttribute('capture', 'environment');
  await expect(page.getByRole('button', { name: /Usar câmera/ })).toBeVisible();
});

test('OS externa no mobile expõe WhatsApp, Maps, Foto, Status e Finalizar sem marcar WhatsApp como enviado', async ({ page }) => {
  await login(page);
  const client = await api(page, '/clients', 'POST', {
    name: 'Cliente Mobile Externo',
    document: uniqueDocument(81234567),
    phone: '34999997777',
    postal_code: '38400000',
    street: 'Rua Mobile',
    number: '55',
    district: 'Centro',
    city: 'Uberlândia',
    state: 'MG',
  });
  expect(client.status).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const notebook = equipment.body.find((item: { name: string }) => item.name === 'Notebook');
  expect(notebook).toBeTruthy();
  const checklist = await api(page, `/catalogs/checklist?equipment_type_id=${notebook.id}`);
  const damage = checklist.body.find((item: { label: string }) => item.label === 'Tela riscada');
  expect(damage).toBeTruthy();

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: notebook.id,
    manufacturer_id: null,
    attendance_type: 'external',
    reported_problem: 'Atendimento externo criado pelo teste mobile',
    checklist: [{ template_id: damage.id }],
  });
  expect(order.status).toBe(201);

  await page.locator('.menu-toggle').click();
  await page.locator('aside').getByRole('button', { name: 'Ordens de Serviço' }).click();
  const row = page.locator('.order-row').filter({ hasText: 'Cliente Mobile Externo' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${order.body.number}` })).toBeVisible();

  const actions = page.locator('[aria-label="Atalhos do atendimento externo"]');
  await expect(actions).toBeVisible();
  const actionBoxes = await actions.locator(':scope > a, :scope > label, :scope > button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  for (let i = 0; i < actionBoxes.length; i += 1) {
    for (let j = i + 1; j < actionBoxes.length; j += 1) {
      const a = actionBoxes[i];
      const b = actionBoxes[j];
      const overlaps = Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
      expect(overlaps).toBeFalsy();
    }
  }
  const whatsapp = actions.getByRole('link', { name: 'WhatsApp' });
  const maps = actions.getByRole('link', { name: 'Maps' });
  await expect(whatsapp).toHaveAttribute('target', '_blank');
  await expect(maps).toHaveAttribute('href', /google\.com\/maps/);
  const whatsappHref = await whatsapp.getAttribute('href');
  expect(whatsappHref).toContain('wa.me');
  const decoded = decodeURIComponent(whatsappHref ?? '');
  expect(decoded).toContain(`OS #${order.body.number}`);
  expect(decoded).toContain('Tela riscada');

  const apiWrites: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/') && request.method() !== 'GET') apiWrites.push(`${request.method()} ${pathname}`);
  });
  await page.context().route('https://wa.me/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>WhatsApp mock</title>' });
  });
  const popupPromise = page.waitForEvent('popup');
  await whatsapp.click();
  const popup = await popupPromise;
  await popup.close();
  expect(apiWrites).toEqual([]);

  const photo = actions.getByLabel('Foto do atendimento externo');
  await expect(photo).toHaveAttribute('capture', 'environment');
  await page.locator('#external-status-action').click();
  await expect(page.locator('.status-picker select')).toBeFocused();
  await actions.getByRole('button', { name: 'Finalizar' }).click();
  const finalModal = page.locator('.modal-card').filter({ hasText: 'FINALIZAÇÃO DA OS' });
  await expect(finalModal).toBeVisible();
  await finalModal.locator('.modal-close').click();
});
