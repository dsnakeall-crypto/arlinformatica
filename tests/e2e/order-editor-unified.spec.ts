import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function openOrder(page: Page, clientName: string, orderNumber: string) {
  await page.getByRole('button', { name: 'Ordens de Serviço' }).click();
  const row = page.locator('.order-row').filter({ hasText: clientName });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}`, exact: true })).toBeVisible();
  return page.locator('[data-arl-unified-order-editor-host="1"]');
}

test('Editar OS usa um editor único para cliente, equipamento, atendimento, problema, checklist e serviços', async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const originalName = `Cliente Editor ${suffix}`;
  const replacementName = `Cliente Editor Novo ${suffix}`;

  const original = await api(page, '/clients', 'POST', {
    name: originalName,
    document: uniqueDocument(suffix),
    phone: '35999991001',
    postal_code: '37160000',
    street: 'Rua Editor',
    number: '10',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  const replacement = await api(page, '/clients', 'POST', {
    name: replacementName,
    document: uniqueDocument(suffix + 1),
    phone: '35999991002',
    postal_code: '37160000',
    street: 'Rua Editor',
    number: '20',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(original.status, JSON.stringify(original.body)).toBe(201);
  expect(replacement.status, JSON.stringify(replacement.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const equipmentType = equipment.body?.[0];
  const service = services.body?.find((row: any) => row.name === 'Formatação E2E') ?? services.body?.[0];
  expect(equipmentType).toBeTruthy();
  expect(service).toBeTruthy();

  const checklist = await api(page, `/catalogs/checklist?equipment_type_id=${equipmentType.id}`);
  const checklistOption = checklist.body?.[0];
  expect(checklistOption).toBeTruthy();

  const created = await api(page, '/orders', 'POST', {
    client_id: original.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: 'Relato original do editor único',
    checklist: [],
    items: [{ catalog_id: service.id, quantity: 1 }],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  const initialEquipment = 'Notebook de teste + carregador';
  const identity = await api(page, `/orders/${created.body.id}`, 'PATCH', { equipment_description: initialEquipment });
  expect(identity.status, JSON.stringify(identity.body)).toBe(200);

  const term = await api(page, `/orders/${created.body.id}/term`);
  expect(term.status).toBe(200);

  const root = await openOrder(page, originalName, created.body.number);
  await expect(root.getByRole('button', { name: 'Editar OS', exact: true })).toHaveCount(1);
  await root.getByRole('button', { name: 'Editar OS', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: `Editar OS #${created.body.number}` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Cliente da OS')).toBeVisible();
  await expect(dialog.getByLabel('Equipamento / Modelo / Acessórios')).toBeVisible();
  await expect(dialog.getByLabel('Atendimento')).toBeVisible();
  await expect(dialog.getByLabel('Problema relatado')).toBeVisible();
  await expect(dialog.getByText('Checklist', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Serviços', { exact: true })).toBeVisible();

  await dialog.getByLabel('Cliente da OS').selectOption(String(replacement.body.id));
  await expect(dialog.getByRole('alert')).toContainText(`Termo de Recebimento já emitido permanece com o cliente ${originalName}`);

  const changedEquipment = 'Notebook Dell Inspiron 15 + fonte + mochila';
  const changedProblem = 'Problema corrigido no editor unificado';
  await dialog.getByLabel('Equipamento / Modelo / Acessórios').fill(changedEquipment);
  await dialog.getByLabel('Atendimento').selectOption('external');
  await dialog.getByLabel('Problema relatado').fill(changedProblem);
  await dialog.getByLabel(checklistOption.label).check();
  if (checklistOption.allows_note) {
    await dialog.getByLabel(`Observação de ${checklistOption.label}`).fill('Avaria registrada no editor único');
  }
  await dialog.getByLabel(`Quantidade no editor de ${service.name}`).fill('3');

  const saveResponse = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${created.body.id}` || request.method() !== 'PATCH') return false;
    const body = request.postDataJSON();
    return Number(body?.client_id) === Number(replacement.body.id)
      && body?.equipment_description === changedEquipment
      && body?.attendance_type === 'external'
      && body?.reported_problem === changedProblem
      && Array.isArray(body?.checklist)
      && body.checklist.some((row: any) => Number(row.template_id) === Number(checklistOption.id))
      && Array.isArray(body?.items)
      && body.items.some((row: any) => Number(row.catalog_id) === Number(service.id) && Number(row.quantity) === 3);
  });

  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  const saved = await saveResponse;
  expect(saved.status()).toBe(200);
  await expect(dialog).toBeHidden();

  const persisted = await api(page, `/orders/${created.body.id}`);
  expect(persisted.status).toBe(200);
  expect(Number(persisted.body?.client_id)).toBe(Number(replacement.body.id));
  expect(persisted.body?.client?.name).toBe(replacementName);
  expect(persisted.body?.equipment_description).toBe(changedEquipment);
  expect(persisted.body?.attendance_type).toBe('external');
  expect(persisted.body?.reported_problem).toBe(changedProblem);
  expect(persisted.body?.checklists?.some((row: any) => row.label === checklistOption.label)).toBe(true);
  const persistedItem = persisted.body?.items?.find((row: any) => !row.finalization_id && Number(row.catalog_id) === Number(service.id));
  expect(Number(persistedItem?.quantity)).toBe(3);

  await expect(root.getByText(replacementName, { exact: true })).toBeVisible();
  await expect(root.getByText(changedEquipment, { exact: true })).toBeVisible();
  await expect(root.getByText(changedProblem, { exact: true })).toBeVisible();
});
