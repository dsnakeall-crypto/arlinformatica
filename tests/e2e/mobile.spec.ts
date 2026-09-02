import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('mobile possui navegação própria, ações tocáveis e inputs sem zoom forçado', async ({ page }) => {
  await login(page);
  await expect(page.locator('.menu-toggle')).toBeVisible();
  await page.locator('.menu-toggle').click();
  await expect(page.locator('aside.open')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  const fontSize = await page.getByLabel('Problema relatado *').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  await expect(page.locator('input[type=file]')).toHaveAttribute('capture', 'environment');
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
  await whatsapp.evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    (element as HTMLElement).click();
  });
  await page.waitForTimeout(100);
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
