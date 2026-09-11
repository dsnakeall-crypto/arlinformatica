import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('mobile possui home própria, ações tocáveis e inputs sem zoom forçado', async ({ page }) => {
  await login(page);
  const home = page.getByRole('region', { name: 'Início mobile com Ordens de Serviço abertas' });
  await expect(home).toBeVisible();

  const viewportSize = page.viewportSize();
  expect(viewportSize).not.toBeNull();
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportSize!.width);

  const client = await api(page, '/clients', 'POST', {
    name: 'Cliente Mobile Navegação',
    document: uniqueDocument(81234568),
    phone: '34999996666',
    postal_code: '38400000',
    street: 'Rua Mobile',
    number: '56',
    district: 'Centro',
    city: 'Uberlândia',
    state: 'MG',
  });
  expect(client.status).toBe(201);

  const bottomNavigation = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  const homeButtons = await bottomNavigation.locator('button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(homeButtons.length).toBeGreaterThanOrEqual(3);
  for (const box of homeButtons) {
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await bottomNavigation.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  const firstClient = page.locator('.clients-list-panel .client-list article').filter({ hasText: 'Cliente Mobile Navegação' });
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

  await bottomNavigation.getByRole('button', { name: 'Nova OS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  const manual = page.getByLabel('Equipamento / Modelo / Acessórios *');
  await expect(manual).toBeVisible();
  const manualFontSize = await manual.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(manualFontSize).toBeGreaterThanOrEqual(16);
  const fontSize = await page.getByLabel('Problema relatado *').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  await expect(page.locator('input[type=file]')).toHaveAttribute('capture', 'environment');
  await expect(page.getByRole('button', { name: /Usar câmera/ })).toBeVisible();
});

test('OS externa no mobile é somente leitura com WhatsApp e Rota, sem Foto, Status ou Finalizar', async ({ page }) => {
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
  const damage = checklist.body.find((item: { label: string }) => item.label === 'Carcaça Trincada');
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

  await page.reload();
  const card = page.locator('.arl-mobile-order-card').filter({ hasText: 'Cliente Mobile Externo' });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole('heading', { name: `OS #${order.body.number}`, exact: true })).toBeVisible();

  const detail = page.locator('[data-mobile-read-only="1"]');
  await expect(detail.getByText('Somente leitura · edite pelo PC')).toBeVisible();
  const whatsapp = detail.getByRole('link', { name: 'WhatsApp' });
  const maps = detail.getByRole('link', { name: 'Rota' });
  await expect(whatsapp).toHaveAttribute('target', '_blank');
  await expect(maps).toHaveAttribute('href', /google\.com\/maps/);
  const whatsappHref = await whatsapp.getAttribute('href');
  expect(whatsappHref).toContain('wa.me');
  const decoded = decodeURIComponent(whatsappHref ?? '');
  expect(decoded).toContain(`Ordem de Serviço nº ${order.body.number}`);
  await expect(detail.getByText('Carcaça Trincada', { exact: false })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Adicionar foto' })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Status', exact: true })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Finalizar' })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Ver histórico do cliente' })).toHaveCount(0);
  await expect(detail.locator('input[type=file]')).toHaveCount(0);

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

});
