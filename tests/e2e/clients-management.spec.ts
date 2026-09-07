import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('Gestão de Clientes carrega uma vez, filtra localmente, ordena e usa os cinco ícones oficiais', async ({ page }) => {
  await login(page);

  const zulu = await api(page, '/clients', 'POST', {
    name: 'Ordena E2E Zulu',
    document: uniqueDocument(26090711),
    phone: '35988881111',
    postal_code: '37160000',
    street: 'Rua Zulu',
    number: '91',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
    complement: '',
  });
  const alpha = await api(page, '/clients', 'POST', {
    name: 'Ordena E2E Alpha',
    document: uniqueDocument(26090712),
    phone: '35988882222',
    postal_code: '37160000',
    street: 'Rua Alpha',
    number: '12',
    district: 'Jardim',
    city: 'Campos Gerais',
    state: 'MG',
    complement: '',
  });
  expect(zulu.status).toBe(201);
  expect(alpha.status).toBe(201);
  expect(zulu.body.id).toBeLessThan(alpha.body.id);

  const clientGets: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/clients') clientGets.push(url.search);
  });

  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.getByText('Ordena E2E Alpha', { exact: true })).toBeVisible();
  await expect.poll(() => clientGets.filter(value => value.includes('all=1')).length).toBe(1);

  const search = page.getByLabel('Buscar clientes');
  await search.fill('Ordena E2E');
  const rows = page.locator('.client-list article');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Ordena E2E Alpha');
  await expect(rows.nth(1)).toContainText('Ordena E2E Zulu');
  expect(clientGets).toEqual(['?all=1']);

  await page.getByLabel('Ordenar clientes').selectOption('id');
  await expect(rows.nth(0)).toContainText('Ordena E2E Zulu');
  await expect(rows.nth(0)).toContainText(`Cliente Nº ${zulu.body.id}`);
  await expect(rows.nth(1)).toContainText(`Cliente Nº ${alpha.body.id}`);
  expect(clientGets).toEqual(['?all=1']);

  await search.fill('35988882222');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Ordena E2E Alpha');
  await expect(rows.first()).toContainText('Rua Alpha, 12 · Jardim');
  await expect(rows.first()).toContainText('Campos Gerais - MG');
  expect(clientGets).toEqual(['?all=1']);

  const actionSources = await rows.first().locator('.clients-actions img').evaluateAll(images => images.map(image => image.getAttribute('src')));
  expect(actionSources).toEqual([
    '/arl-assets/icons/icon-whatsapp.png',
    '/arl-assets/icons/icon-maps.png',
    '/arl-assets/icons/icon-visualizar.png',
    '/arl-assets/icons/icon-editar.png',
    '/arl-assets/icons/icon-lixeira.png',
  ]);
});
