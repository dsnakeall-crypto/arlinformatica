import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function openOrder(page: Page, clientName: string, orderNumber: string) {
  await page.getByRole('button', { name: 'Ordens' }).click();
  const row = page.locator('.order-row').filter({ hasText: clientName });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}`, exact: true })).toBeVisible();
  return page.locator('[data-arl-unified-order-editor-host="1"]');
}

async function hasUnsavedGuard(page: Page) {
  return page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test('Editar OS usa a própria ficha e preserva o cliente enquanto corrige os dados permitidos', async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const originalName = `Cliente Editor ${suffix}`;
  const original = await api(page, '/clients', 'POST', {
    name: originalName, document: uniqueDocument(suffix), phone: '35999991001', postal_code: '37160000',
    street: 'Rua Editor', number: '10', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  expect(original.status, JSON.stringify(original.body)).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const equipmentType = equipment.body?.[0];
  expect(equipmentType).toBeTruthy();

  const created = await api(page, '/orders', 'POST', {
    client_id: original.body.id,
    equipment_type_id: equipmentType.id,
    equipment_description: 'Notebook de teste',
    equipment_details: 'Carregador original',
    attendance_type: 'bench',
    reported_problem: 'Relato original do editor único',
    intake_condition: 'Risco superficial na tampa',
    checklist: [],
    items: [],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  const root = await openOrder(page, originalName, created.body.number);
  await expect(root.getByText('Atendimento Interno', { exact: true })).toBeVisible();
  await root.getByRole('button', { name: 'Editar', exact: true }).click();

  const editor = page.locator('.arl-3d-editor');
  await expect(editor).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Editar OS/ })).toHaveCount(0);
  await expect(editor.getByRole('heading', { name: 'Ficha de entrada — edição' })).toBeVisible();
  await expect(editor.getByLabel('Cliente da OS')).toHaveCount(0);
  await expect(editor.getByLabel('Equipamento')).toBeVisible();
  await expect(editor.getByLabel('Fabricante / Modelo / Acessórios')).toBeVisible();
  await expect(editor.getByLabel('Atendimento')).toBeVisible();
  await expect(editor.getByLabel('Problema relatado')).toBeVisible();
  await expect(editor.getByLabel('Estado físico na entrada')).toHaveValue('Risco superficial na tampa');
  await expect(editor.getByText('Serviços / Produtos', { exact: true })).toHaveCount(0);

  const changedEquipment = 'Notebook Dell Inspiron 15';
  const changedDetails = 'Fonte + mochila';
  const changedProblem = 'Problema corrigido na ficha';
  const changedIntakeCondition = 'Tampa com risco e pequena folga';
  await editor.getByLabel('Equipamento').fill(changedEquipment);
  await editor.getByLabel('Fabricante / Modelo / Acessórios').fill(changedDetails);
  await editor.getByLabel('Atendimento').selectOption('external');
  await editor.getByLabel('Problema relatado').fill(changedProblem);
  await editor.getByLabel('Estado físico na entrada').fill(changedIntakeCondition);
  await editor.getByLabel('Sem senha').check();

  const saveResponse = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${created.body.id}` || request.method() !== 'PATCH') return false;
    const body = request.postDataJSON();
    return !Object.prototype.hasOwnProperty.call(body || {}, 'client_id')
      && body?.equipment_description === changedEquipment
      && body?.equipment_details === changedDetails
      && body?.attendance_type === 'external'
      && body?.reported_problem === changedProblem
      && body?.intake_condition === changedIntakeCondition
      && body?.system_password_absent === true;
  });
  await editor.getByRole('button', { name: 'Salvar', exact: true }).click();
  expect((await saveResponse).status()).toBe(200);
  await expect(editor).toBeHidden();

  const persisted = await api(page, `/orders/${created.body.id}`);
  expect(persisted.status).toBe(200);
  expect(Number(persisted.body.client_id)).toBe(Number(original.body.id));
  expect(persisted.body.client.name).toBe(originalName);
  expect(persisted.body.equipment_description).toBe(changedEquipment);
  expect(persisted.body.equipment_details).toBe(changedDetails);
  expect(persisted.body.attendance_type).toBe('external');
  expect(persisted.body.reported_problem).toBe(changedProblem);
  expect(persisted.body.intake_condition).toBe(changedIntakeCondition);
  await expect(root.getByText('Atendimento Externo', { exact: true })).toBeVisible();
  await expect(root.locator('.arl-intake-client-name strong')).toHaveText(originalName);
});

test('rascunhos avisam saída e o Laudo Final é persistido antes da finalização', async ({ page }) => {
  await login(page);
  const suffix = Date.now() + 1000;
  const clientName = `Cliente Rascunho ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName, document: uniqueDocument(suffix), phone: '35999992001', postal_code: '37160000',
    street: 'Rua Rascunho', number: '30', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const service = services.body?.find((row: any) => Number(row.price_cents) > 0);
  const created = await api(page, '/orders', 'POST', {
    client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench',
    reported_problem: 'Relato inicial do teste de rascunho', checklist: [], items: [{ catalog_id: service.id, quantity: 1 }],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  const root = await openOrder(page, clientName, created.body.number);
  const report = root.locator('.arl-od-report textarea');
  const reportDraft = 'Laudo rascunho protegido antes da finalização';
  await report.fill(reportDraft);
  expect(await hasUnsavedGuard(page)).toBe(true);

  const reportFlush = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/orders/${created.body.id}`
    && response.request().method() === 'PATCH'
    && response.request().postDataJSON()?.final_report === reportDraft);
  await root.getByRole('button', { name: 'Concluir', exact: true }).click();
  expect((await reportFlush).status()).toBe(200);
  const finalization = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(finalization).toBeVisible();
  await finalization.locator('.modal-close').click();
  expect(await hasUnsavedGuard(page)).toBe(false);

  await root.getByRole('button', { name: 'Editar', exact: true }).click();
  const editor = page.locator('.arl-3d-editor');
  await editor.getByLabel('Atendimento').selectOption('external');
  await editor.getByLabel('Problema relatado').fill('Problema ainda não salvo no editor');
  await editor.getByLabel('Estado físico na entrada').fill('Risco ainda não salvo');
  await editor.getByLabel('Sem senha').check();
  expect(await hasUnsavedGuard(page)).toBe(true);

  let cancelMessage = '';
  page.once('dialog', async (dialog) => { cancelMessage = dialog.message(); await dialog.dismiss(); });
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(cancelMessage).toContain('alterações não salvas');
  await expect(editor).toBeVisible();

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(editor).toBeHidden();
  expect(await hasUnsavedGuard(page)).toBe(false);
});
