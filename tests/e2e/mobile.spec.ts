import { selectNewOrderClient } from './helpers';
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
  const intakeCondition = 'Carcaça trincada no lado esquerdo';

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: notebook.id,
    manufacturer_id: null,
    attendance_type: 'external',
    reported_problem: 'Atendimento externo criado pelo teste mobile',
    intake_condition: intakeCondition,
    checklist: [],
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
  await expect(detail.getByRole('heading', { name: 'Estado físico na entrada', exact: true })).toBeVisible();
  await expect(detail.getByText(intakeCondition, { exact: true })).toBeVisible();
  expect(decoded).toContain(intakeCondition);
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

test('shell mobile mantém cabeçalho, formulários, listas e modais livres da barra fixa', async ({ page }) => {
  await login(page);

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  await expect(page.locator('.app-head .mobile-logo img')).toHaveCount(0);
  await expect(page.locator('.app-head .mobile-logo')).toBeHidden();

  const layout = page.getByLabel('Layout neste dispositivo');
  const bell = page.getByRole('button', { name: 'Notificações', exact: true });
  const [layoutBox, bellBox] = await Promise.all([layout.boundingBox(), bell.boundingBox()]);
  expect(layoutBox).not.toBeNull();
  expect(bellBox).not.toBeNull();
  expect(layoutBox!.x + layoutBox!.width).toBeLessThanOrEqual(bellBox!.x);

  const bottom = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  const assertAboveBottomBar = async (locator: ReturnType<typeof page.locator>) => {
    await locator.scrollIntoViewIfNeeded();
    const [targetBox, bottomBox] = await Promise.all([locator.boundingBox(), bottom.boundingBox()]);
    expect(targetBox).not.toBeNull();
    expect(bottomBox).not.toBeNull();
    expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(bottomBox!.y);
    const hit = await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element
        || element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    });
    expect(hit).toBe(true);
  };

  const suffix = Date.now();
  const clientName = `Cliente Bloco Mobile ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName, document: uniqueDocument(suffix), phone: '34999995555', postal_code: '38400000',
    street: 'Rua Mobile', number: '91', district: 'Centro', city: 'Uberlândia', state: 'MG',
  });
  expect(client.status).toBe(201);

  await bottom.getByRole('button', { name: 'Nova OS', exact: true }).click();
  const fields = page.locator('.os-form input:not([type="hidden"]), .os-form select, .os-form textarea');
  const fontSizes = await fields.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)));
  expect(fontSizes.length).toBeGreaterThan(0);
  for (const fontSize of fontSizes) expect(fontSize).toBeGreaterThanOrEqual(16);

  await selectNewOrderClient(page, client.body.id);
  const manualDescription = 'Notebook para validação mobile';
  await page.getByLabel('Equipamento / Modelo / Acessórios *').fill(manualDescription);
  await page.getByLabel('Problema relatado *').fill('Validação do botão de salvar no mobile');
  const createOrder = page.getByRole('button', { name: 'Criar ordem de serviço' });
  await assertAboveBottomBar(createOrder);
  const createdResponse = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await createOrder.click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const createdOrder = await created.json();
  const persisted = await api(page, `/orders/${createdOrder.id}`);
  expect(persisted.status).toBe(200);
  expect(persisted.body.equipment_description).toBe(manualDescription);

  const openedModal = page.locator('.arl-order-opened-modal');
  await expect(openedModal).toBeVisible();
  await openedModal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(openedModal).toHaveCount(0);

  await bottom.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const modal = page.getByRole('dialog', { name: 'Novo cliente' });
  const modalFields = modal.locator('input, select, textarea');
  const modalFontSizes = await modalFields.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)));
  for (const fontSize of modalFontSizes) expect(fontSize).toBeGreaterThanOrEqual(16);
  await assertAboveBottomBar(modal.getByRole('button', { name: 'Salvar cliente' }));
  await modal.getByRole('button', { name: 'Fechar' }).click();

  const longListNames: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    const name = `ZZ Lista Mobile ${suffix}-${String(index).padStart(2, '0')}`;
    longListNames.push(name);
    const response = await api(page, '/clients', 'POST', {
      name, document: uniqueDocument(suffix + index + 1), phone: '34999994444', postal_code: '38400000',
      street: 'Rua Lista', number: String(index + 1), district: 'Centro', city: 'Uberlândia', state: 'MG',
    });
    expect(response.status).toBe(201);
  }
  await page.reload();
  const lastItem = page.locator('.clients-list-panel .client-list article').filter({ hasText: longListNames.at(-1)! });
  await expect(lastItem).toBeVisible();
  await assertAboveBottomBar(lastItem);
});
