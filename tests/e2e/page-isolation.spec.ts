import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('navegação mantém cada página isolada sem conteúdo da página anterior', async ({ page }) => {
  await login(page);

  const stamp = Date.now();
  const createdClient = await api(page, '/clients', 'POST', {
    name: `Cliente Isolamento ${stamp}`,
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

  const equipment = await api(page, '/catalogs/equipment');
  expect(equipment.status).toBe(200);
  expect(equipment.body.length).toBeGreaterThan(0);

  const createdOrder = await api(page, '/orders', 'POST', {
    client_id: createdClient.body.id,
    equipment_type_id: equipment.body[0].id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: 'Teste de isolamento entre páginas',
    checklist: [],
    items: [],
  });
  expect(createdOrder.status).toBe(201);
  const orderNumber = createdOrder.body.number;

  const sidebar = page.locator('aside');
  const openOrder = async () => {
    await sidebar.getByRole('button', { name: 'Ordens de Serviço' }).click();
    await expect(page.getByRole('heading', { name: 'Ordens de Serviço' })).toBeVisible();
    const row = page.locator('.order-row').filter({ hasText: `#${orderNumber}` });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Ver OS' }).click();
    await expect(page.getByRole('heading', { name: `OS #${orderNumber}` })).toBeVisible();
    await expect(page.getByText('Abertura do chamado', { exact: true })).toBeVisible();
  };

  const assertOrderArtifactsGone = async () => {
    await expect(page.getByRole('heading', { name: `OS #${orderNumber}` })).toHaveCount(0);
    await expect(page.getByText('Abertura do chamado', { exact: true })).toHaveCount(0);
    await expect(page.locator('.arl-od-sharebar, .arl-order-quick-actions')).toHaveCount(0);
  };

  const destinations = [
    ['Painel', () => page.getByRole('heading', { name: 'Painel' })],
    ['Nova OS', () => page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })],
    ['Clientes', () => page.getByRole('heading', { name: /Gestão de Clientes|Cadastro de Clientes/ })],
    ['Financeiro', () => page.getByRole('heading', { name: 'Financeiro' })],
    ['Pós-Venda', () => page.getByRole('heading', { name: 'Pós-Venda' })],
    ['Serviços', () => page.locator('main .admin-list h2').filter({ hasText: /Serviços e Produtos|Novo serviço ou produto/ })],
    ['Usuários', () => page.getByRole('heading', { name: 'Usuários e Permissões' })],
    ['Configurações', () => page.getByRole('heading', { name: 'Configurações' })],
  ] as const;

  for (const [menu, destination] of destinations) {
    await openOrder();
    await sidebar.getByRole('button', { name: menu, exact: true }).click();
    await expect(destination()).toBeVisible();
    await assertOrderArtifactsGone();
  }

  await sidebar.getByRole('button', { name: 'Nova OS', exact: true }).click();
  await expect(page.locator('.os-form')).toBeVisible();
  await sidebar.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Gestão de Clientes|Cadastro de Clientes/ })).toBeVisible();
  await expect(page.locator('.os-form, .arl-deep-combobox, .arl-checklist-categories')).toHaveCount(0);

  await sidebar.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('.arl-settings-tabs')).toBeVisible();
  await sidebar.getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.locator('.arl-settings-tabs, .arl-opening-message-panel, .arl-finance-settings-note')).toHaveCount(0);
});
