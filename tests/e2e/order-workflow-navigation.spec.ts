import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function fixture(page: Page) {
  const suffix = Date.now();
  const client = await api(page, '/clients', 'POST', {
    name: `Abas Ownership ${suffix}`, document: uniqueDocument(suffix), phone: '35988887777',
    postal_code: '37160000', street: 'Rua Teste', number: '12', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const orders = [];
  for (const state of ['analysis', 'completed', 'interrupted']) {
    const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: state === 'completed' ? 'external' : 'bench', reported_problem: `Teste ${state}`, items: [], checklist: [] });
    expect(order.status).toBe(201);
    if (state === 'completed') {
      expect((await api(page, `/orders/${order.body.id}/finalize`, 'POST', { result: 'no_fault', technical_report: 'Sem defeito constatado nos testes.', items: [], discount_cents: 0, photo_ids: [] })).status).toBe(201);
    } else if (state === 'interrupted') {
      expect((await api(page, `/orders/${order.body.id}/status`, 'PATCH', { status: state, interruption_reason: 'Interrompida para o teste de abas.' })).status).toBe(200);
    }
    orders.push(order.body);
  }
  return { client: client.body, orders };
}

test('Mesa redireciona e as quatro abas React são a única fonte do filtro de Ordens', async ({ page }) => {
  await login(page);
  const { client, orders } = await fixture(page);
  await expect(page.locator('aside').getByRole('button', { name: 'Mesa de Chamados' })).toHaveCount(0);
  await page.goto('/desk');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  const requests: URL[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/orders') requests.push(url); });
  await page.locator('aside').getByRole('button', { name: 'Ordens' }).click();
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill(client.name);
  const tabs = page.getByRole('tablist', { name: 'Filtrar ordens' });
  await expect(tabs.getByRole('button')).toHaveText(['Todas', 'Em Andamento', 'Finalizadas', 'Interrompidas']);
  await expect(page.locator('.order-row.head')).toContainText('# OS');
  await expect(page.locator('.order-row.head')).toContainText('CLIENTE / DISPOSITIVO');
  await expect(page.locator('.order-row.head')).toContainText('STATUS');
  await expect(page.locator('.order-row.head')).toContainText('RELATO CLIENTE');
  await expect(page.locator('.order-row.head')).toContainText('AÇÕES');
  const analysisRow = page.locator('.order-row').filter({ hasText: `#${orders[0].number}` });
  await expect(analysisRow.locator('.order-client-report')).toHaveText('Teste analysis');
  await expect(analysisRow.locator('.order-client-report')).toHaveAttribute('title', 'Teste analysis');
  await expect(analysisRow.getByRole('button', { name: 'Ver OS' })).toBeVisible();
  const rows = page.locator('.order-row:not(.head)');
  for (const [label, tab, indices] of [
    ['Todas', 'all', [0, 1, 2]], ['Em Andamento', 'progress', [0]], ['Finalizadas', 'finalized', [1]], ['Interrompidas', 'interrupted', [2]], ['Todas', 'all', [0, 1, 2]],
  ] as const) {
    await tabs.getByRole('button', { name: label, exact: true }).click();
    await expect(rows).toHaveCount(indices.length);
    for (const index of indices) await expect(rows.filter({ hasText: `#${orders[index].number}` })).toBeVisible();
    expect(requests.some(url => url.searchParams.get('tab') === tab)).toBe(true);
    await expect(page.locator('.arl-finalized-toggle')).toHaveCount(0);
  }
  expect(requests.every(url => !url.searchParams.has('finalized'))).toBe(true);
});

test('lápis da lista abre edição completa ou o fluxo existente de reabertura', async ({ page }) => {
  await login(page);
  const { client, orders } = await fixture(page);
  await page.goto('/orders');
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill(client.name);
  await page.locator('.order-row').filter({ hasText: `#${orders[0].number}` }).getByRole('button', { name: 'Editar OS', exact: true }).click();
  const editor = page.getByRole('dialog', { name: `Editar OS #${orders[0].number}` });
  await expect(editor.getByLabel('Cliente da OS')).toHaveCount(0);
  await expect(editor).not.toContainText('Cliente, equipamento, atendimento, relato, checklist e serviços são salvos juntos nesta OS');
  await expect(editor.locator('.arl-unified-editor-close')).toHaveCSS('border-radius', '50%');
  await expect(editor.locator('.arl-unified-editor-fields textarea').first()).toHaveCSS('background-color', 'rgb(250, 250, 251)');
  await expect(editor.getByLabel('Equipamento / Modelo / Acessórios')).toBeVisible();
  await expect(editor.getByText('Serviços / Produtos', { exact: true })).toBeVisible();
  await expect(page.locator('.arl-maintenance-modal')).toHaveCount(0);
  await editor.getByLabel('Equipamento / Modelo / Acessórios').fill('Equipamento corrigido pelo lápis da lista');
  await editor.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(editor).toHaveCount(0);
  const editedOpenOrder = (await api(page, `/orders/${orders[0].id}`)).body;
  expect(editedOpenOrder.equipment_description).toBe('Equipamento corrigido pelo lápis da lista');
  expect(Number(editedOpenOrder.client_id)).toBe(Number(client.id));

  const beforePayments = await api(page, `/orders/${orders[1].id}/payments`);
  const beforeDocuments = await api(page, `/orders/${orders[1].id}/documents`);
  await page.goto('/orders');
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill(client.name);
  await page.locator('.order-row').filter({ hasText: `#${orders[1].number}` }).getByRole('button', { name: 'Reabrir como garantia' }).click();
  const reopen = page.getByRole('dialog', { name: `Reabrir OS #${orders[1].number}` });
  await expect(reopen).toBeVisible();
  await expect(page.locator('.arl-maintenance-modal')).toHaveCount(0);
  await reopen.getByLabel('Motivo da reabertura').fill('Retorno em garantia pelo lápis da lista');
  const response = page.waitForResponse(response => response.url().endsWith(`/api/orders/${orders[1].id}/reopen`) && response.request().method() === 'POST');
  await reopen.getByRole('button', { name: 'Confirmar reabertura' }).click();
  expect((await response).status()).toBe(200);
  await expect(reopen).toHaveCount(0);
  const after = await api(page, `/orders/${orders[1].id}`);
  expect(after.body.status).toBe('analysis');
  expect(after.body.reopened).toBe(true);
  expect(Number(after.body.client_id)).toBe(Number(client.id));
  expect(after.body.histories.some((history: any) => history.from_status === 'completed' && history.to_status === 'analysis')).toBe(true);
  expect((await api(page, `/orders/${orders[1].id}/payments`)).body).toEqual(beforePayments.body);
  expect((await api(page, `/orders/${orders[1].id}/documents`)).body).toEqual(beforeDocuments.body);

  await page.goto('/orders');
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill(client.name);
  const reopenedRow = page.locator('.order-row').filter({ hasText: `#${orders[1].number}` });
  await expect(reopenedRow.getByText('Reaberta', { exact: true }), 'Contrato visual: a OS reaberta deve ser identificável na lista').toBeVisible();
  await reopenedRow.getByRole('button', { name: 'Ver OS' }).click();
  const reopenedRoot = page.locator('[data-arl-order-detail-react="1"]');
  await expect(reopenedRoot.getByText('Reaberta', { exact: true }), 'Contrato visual: a OS reaberta deve ser identificável no detalhe').toBeVisible();
  await expect(reopenedRoot.locator('.contact-links.external-actions')).toHaveCount(0);
  await reopenedRoot.getByRole('button', { name: 'Editar OS', exact: true }).click();
  const reopenedEditor = page.getByRole('dialog', { name: `Editar OS #${orders[1].number}` });
  await expect(reopenedEditor.getByLabel('Cliente da OS')).toHaveCount(0);
  await expect(reopenedEditor.getByRole('heading', { name: 'Estado físico na entrada', exact: true })).toBeVisible();
  await expect(reopenedEditor.getByLabel('Estado físico na entrada')).toBeVisible();
  await expect(reopenedEditor.getByLabel('Pesquisar Serviço / Produto no editor')).toBeVisible();
  await reopenedEditor.getByLabel('Equipamento / Modelo / Acessórios').fill('Equipamento corrigido após reabertura');
  await reopenedEditor.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(reopenedEditor).toHaveCount(0);
  const editedReopenedOrder = (await api(page, `/orders/${orders[1].id}`)).body;
  expect(editedReopenedOrder.equipment_description).toBe('Equipamento corrigido após reabertura');
  expect(Number(editedReopenedOrder.client_id)).toBe(Number(client.id));
});
