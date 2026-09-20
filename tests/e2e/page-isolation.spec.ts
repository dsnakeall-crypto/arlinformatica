import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createIsolationOrder(page: Page, suffix: string) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const createdClient = await api(page, '/clients', 'POST', {
    name: `Cliente Isolamento ${suffix} ${stamp}`,
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
    reported_problem: `Teste de isolamento entre páginas ${suffix}`,
    checklist: [],
    items: [],
  });
  expect(createdOrder.status).toBe(201);
  return createdOrder.body.number as string;
}

async function openOrder(page: Page, orderNumber: string) {
  const sidebar = page.locator('aside');
  await sidebar.getByRole('button', { name: 'Ordens' }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço' })).toBeVisible();
  const row = page.locator('.order-row').filter({ hasText: `#${orderNumber}` });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}` })).toBeVisible();
}

async function assertOrderArtifactsGone(page: Page, orderNumber: string) {
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}` })).toHaveCount(0);
  await expect(page.locator('.arl-od-sharebar, .arl-order-quick-actions')).toHaveCount(0);
}

const groups = [
  {
    name: 'principais',
    destinations: [
      ['Painel', 'Painel'],
      ['Nova OS', 'Abertura de Chamado / Nova OS'],
      ['Clientes', /Gestão de Clientes|Cadastro de Clientes/],
    ],
  },
  {
    name: 'operacionais',
    destinations: [
      ['Financeiro', 'Financeiro'],
      ['Pós-Venda', /^Pós-Venda/],
      ['Serviços', 'Serviços'],
      ['Produtos', 'Produtos'],
    ],
  },
  {
    name: 'administrativas',
    destinations: [
      ['Usuários', 'Usuários e Permissões'],
      ['Configurações', 'Configurações'],
    ],
  },
] as const;

for (const group of groups) {
  test(`navegação mantém páginas ${group.name} isoladas da OS anterior`, async ({ page }) => {
    await login(page);
    const orderNumber = await createIsolationOrder(page, group.name);
    const sidebar = page.locator('aside');

    for (const [menu, heading] of group.destinations) {
      await openOrder(page, orderNumber);
      await sidebar.getByRole('button', { name: menu, exact: true }).click();
      const destination = typeof heading === 'string'
        ? page.getByRole('heading', { name: heading, exact: true })
        : page.getByRole('heading', { name: heading });
      await expect(destination).toBeVisible();
      await assertOrderArtifactsGone(page, orderNumber);
    }
  });
}

test('Nova OS e Configurações também são removidas por completo ao trocar de página', async ({ page }) => {
  await login(page);
  const sidebar = page.locator('aside');

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
