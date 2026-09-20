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

const formattedMoney = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const warrantyUnit = (unit: string | null) => unit === 'months' ? 'meses' : unit === 'years' ? 'anos' : 'dias';

test('Editar OS usa um editor único e preserva o cliente enquanto corrige os demais dados', async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const originalName = `Cliente Editor ${suffix}`;

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
  expect(original.status, JSON.stringify(original.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const equipmentType = equipment.body?.[0];
  const service = services.body?.find((row: any) => row.name === 'Formatação E2E') ?? services.body?.[0];
  expect(equipmentType).toBeTruthy();
  expect(service).toBeTruthy();
  const availableProduct = await api(page, '/catalogs/products', 'POST', {
    name: `SSD Seletor ${suffix}`,
    price_cents: 32000,
    stock_quantity: 2,
    warranty_enabled: true,
    warranty_term: 12,
    warranty_unit: 'months',
  });
  const unavailableProduct = await api(page, '/catalogs/products', 'POST', {
    name: `Produto sem estoque ${suffix}`,
    price_cents: 10000,
    stock_quantity: 0,
    warranty_enabled: false,
  });
  expect(availableProduct.status, JSON.stringify(availableProduct.body)).toBe(201);
  expect(unavailableProduct.status, JSON.stringify(unavailableProduct.body)).toBe(201);

  await page.locator('aside').getByRole('button', { name: 'Nova OS', exact: true }).click();
  await expect(page.locator('.opening-catalog button').filter({ hasText: availableProduct.body.name }), 'A lista rápida deve continuar exclusiva de serviços').toHaveCount(0);
  await page.getByRole('button', { name: 'Produto/Serviço', exact: true }).click();
  const openingPicker = page.getByRole('dialog', { name: 'Selecionar Produto ou Serviço' });
  await expect(openingPicker.getByText(availableProduct.body.name, { exact: true })).toBeVisible();
  await openingPicker.getByRole('button', { name: 'Fechar seletor' }).click();

  const created = await api(page, '/orders', 'POST', {
    client_id: original.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: 'Relato original do editor único',
    intake_condition: 'Risco superficial na tampa',
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
  await expect(root.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(1);
  await root.getByRole('button', { name: 'Editar', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: `Editar OS #${created.body.number}` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Cliente da OS')).toHaveCount(0);
  await expect(dialog).not.toContainText('Cliente, equipamento, atendimento, relato, checklist e serviços são salvos juntos nesta OS');
  await expect(dialog.getByLabel('Equipamento')).toBeVisible();
  await expect(dialog.getByLabel('Fabricante / Modelo / Acessórios')).toBeVisible();
  await expect(dialog.getByLabel('Atendimento')).toBeVisible();
  await expect(dialog.getByLabel('Problema relatado')).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Estado físico na entrada', exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Estado físico na entrada')).toHaveValue('Risco superficial na tampa');
  await expect(dialog.getByText('Checklist', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Serviços / Produtos', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Produto/Serviço', exact: true }).click();
  let picker = page.getByRole('dialog', { name: 'Selecionar Produto ou Serviço' });
  await expect(picker.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(picker.getByRole('heading', { name: 'Produtos', exact: true })).toBeVisible();
  await expect(picker.getByText('Disponível: 2', { exact: false })).toBeVisible();
  await expect(picker.getByRole('button', { name: `Sem estoque: ${unavailableProduct.body.name}` })).toBeDisabled();
  await picker.getByLabel(`Quantidade de ${availableProduct.body.name} no seletor`).fill('2');
  await picker.getByRole('button', { name: `Adicionar ${availableProduct.body.name}` }).click();
  await expect(dialog.getByLabel(`Quantidade no editor de ${availableProduct.body.name}`)).toHaveValue('2');

  await dialog.getByRole('button', { name: 'Produto/Serviço', exact: true }).click();
  picker = page.getByRole('dialog', { name: 'Selecionar Produto ou Serviço' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(picker.getByRole('tab', { name: 'Serviços' })).toHaveAttribute('aria-selected', 'true');
  await picker.getByRole('tab', { name: 'Produtos' }).click();
  await expect(picker.getByRole('tab', { name: 'Produtos' })).toHaveAttribute('aria-selected', 'true');
  await picker.getByRole('button', { name: 'Fechar seletor' }).click();
  await page.setViewportSize({ width: 1280, height: 720 });

  const serviceSearch = dialog.getByLabel('Pesquisar Serviço / Produto no editor');
  await serviceSearch.fill(service.name);
  const serviceResult = dialog.getByRole('button', { name: `Adicionar ${service.name}` });
  await expect(serviceResult, 'Contrato busca: digitar o nome deve exibir o Serviço / Produto ativo').toBeVisible();
  await expect(serviceResult).toContainText(service.name);
  await expect(serviceResult).toContainText(formattedMoney(Number(service.price_cents)));
  await expect(serviceResult).toContainText(service.category === 'product' ? 'Produto' : 'Serviço');
  await expect(serviceResult).toContainText(service.warranty_enabled ? `Garantia ${service.warranty_term} ${warrantyUnit(service.warranty_unit)}` : 'Sem garantia');
  await expect(serviceResult).toHaveAttribute('data-category', service.category === 'product' ? 'product' : 'service');
  await expect(serviceResult.locator('svg'), 'Contrato visual: resultado deve exibir o ícone Wrench/Box').toHaveCount(1);
  await serviceResult.click();
  await expect(dialog.getByLabel(`Quantidade no editor de ${service.name}`), 'Contrato busca: selecionar item já presente deve incrementar a quantidade').toHaveValue('2');

  const changedEquipment = 'Notebook Dell Inspiron 15 + fonte + mochila';
  const changedProblem = 'Problema corrigido no editor unificado';
  const changedIntakeCondition = 'Tampa com risco e dobradiça com pequena folga';
  await dialog.getByLabel('Equipamento').fill(changedEquipment);
  await dialog.getByLabel('Atendimento').selectOption('external');
  await dialog.getByLabel('Problema relatado').fill(changedProblem);
  await dialog.getByLabel('Estado físico na entrada').fill(changedIntakeCondition);
  await dialog.getByLabel(`Quantidade no editor de ${service.name}`).fill('3');

  const saveResponse = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${created.body.id}` || request.method() !== 'PATCH') return false;
    const body = request.postDataJSON();
    return !Object.prototype.hasOwnProperty.call(body || {}, 'client_id')
      && body?.equipment_description === changedEquipment
      && body?.attendance_type === 'external'
      && body?.reported_problem === changedProblem
      && body?.intake_condition === changedIntakeCondition
      && !Object.prototype.hasOwnProperty.call(body || {}, 'checklist')
      && Array.isArray(body?.items)
      && body.items.some((row: any) => Number(row.catalog_id) === Number(service.id) && Number(row.quantity) === 3);
  });

  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  const saved = await saveResponse;
  expect(saved.status()).toBe(200);
  await expect(dialog).toBeHidden();

  const persisted = await api(page, `/orders/${created.body.id}`);
  expect(persisted.status).toBe(200);
  expect(Number(persisted.body?.client_id)).toBe(Number(original.body.id));
  expect(persisted.body?.client?.name).toBe(originalName);
  expect(persisted.body?.equipment_description).toBe(changedEquipment);
  expect(persisted.body?.attendance_type).toBe('external');
  expect(persisted.body?.reported_problem).toBe(changedProblem);
  expect(persisted.body?.intake_condition).toBe(changedIntakeCondition);
  const persistedItem = persisted.body?.items?.find((row: any) => !row.finalization_id && Number(row.catalog_id) === Number(service.id));
  expect(Number(persistedItem?.quantity)).toBe(3);

  const intakeClientField = root.locator('.arl-intake-card .arl-intake-client-field:has(> h3:text-is("Cliente"))');
  await expect(intakeClientField, 'Contrato preservação: a Ficha de entrada deve conter um único bloco de Cliente').toHaveCount(1);
  await expect(intakeClientField.locator('.arl-intake-client-name strong'), 'Contrato preservação: o cliente original deve continuar na Ficha de entrada').toHaveText(originalName);
  await expect(root.locator('.arl-intake-equipment-field .arl-intake-equipment-name strong')).toHaveText(changedEquipment);
  await expect(root.getByText(changedProblem, { exact: true })).toBeVisible();

  await root.getByRole('button', { name: 'Editar', exact: true }).click();
  const clearDialog = page.getByRole('dialog', { name: `Editar OS #${created.body.number}` });
  await clearDialog.getByLabel('Estado físico na entrada').fill('');
  const clearResponse = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/orders/${created.body.id}`
    && response.request().method() === 'PATCH'
    && response.request().postDataJSON()?.intake_condition === '');
  await clearDialog.getByRole('button', { name: 'Salvar alterações' }).click();
  expect((await clearResponse).status()).toBe(200);
  const cleared = await api(page, `/orders/${created.body.id}`);
  expect(cleared.body?.intake_condition).toBeNull();
  await expect(root.getByText('Equipamento aparentemente 100% sem avarias', { exact: true })).toBeVisible();
});

test('rascunhos avisam saída e o Laudo Final é persistido antes da finalização', async ({ page }) => {
  await login(page);
  const suffix = Date.now() + 1000;
  const clientName = `Cliente Rascunho ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '35999992001',
    postal_code: '37160000',
    street: 'Rua Rascunho',
    number: '30',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, JSON.stringify(client.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const services = await api(page, '/catalogs/services');
  const equipmentType = equipment.body?.[0];
  const service = services.body?.find((row: any) => row.name === 'Formatação E2E') ?? services.body?.[0];
  expect(equipmentType).toBeTruthy();
  expect(service).toBeTruthy();

  const created = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: 'Relato inicial do teste de rascunho',
    checklist: [],
    items: [{ catalog_id: service.id, quantity: 1 }],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  const root = await openOrder(page, clientName, created.body.number);
  const report = root.locator('.arl-od-report textarea');
  const reportDraft = 'Laudo rascunho protegido antes da finalização';
  await report.fill(reportDraft);
  expect(await hasUnsavedGuard(page), 'Contrato rascunho: recarregar/fechar deveria ser bloqueado após editar o Laudo Final').toBe(true);

  let navigationMessage = '';
  page.once('dialog', async (dialog) => {
    navigationMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.locator('aside').getByRole('button', { name: 'Painel', exact: true }).click();
  expect(navigationMessage).toContain('alterações não salvas');
  await expect(page.getByRole('heading', { name: `OS #${created.body.number}`, exact: true }), 'Contrato rascunho: cancelar saída interna deve manter a OS aberta').toBeVisible();

  let backMessage = '';
  page.once('dialog', async (dialog) => {
    backMessage = dialog.message();
    await dialog.dismiss();
  });
  await root.getByRole('button', { name: '← Voltar', exact: true }).click();
  expect(backMessage).toContain('alterações não salvas');
  await expect(page.getByRole('heading', { name: `OS #${created.body.number}`, exact: true }), 'Contrato rascunho: cancelar Voltar deve manter a OS aberta').toBeVisible();

  const reportFlush = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${created.body.id}` || request.method() !== 'PATCH') return false;
    return request.postDataJSON()?.final_report === reportDraft;
  });
  await root.getByRole('button', { name: 'Concluir', exact: true }).click();
  const reportSaved = await reportFlush;
  expect(reportSaved.status(), 'Contrato de flush: o Laudo Final pendente deve ser salvo no servidor antes de abrir a finalização').toBe(200);
  const finalization = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(finalization).toBeVisible();
  const persistedReport = await api(page, `/orders/${created.body.id}`);
  expect(persistedReport.body?.final_report).toBe(reportDraft);
  await finalization.locator('.modal-close').click();
  expect(await hasUnsavedGuard(page), 'Contrato de flush: após persistir o Laudo Final, não deve restar aviso desse rascunho').toBe(false);

  const serviceQuantity = root.getByLabel(`Quantidade de ${service.name}`);
  await serviceQuantity.fill('2');
  expect(await hasUnsavedGuard(page), 'Contrato rascunho: quantidade de serviço pendente também deve proteger saída').toBe(true);
  const serviceSave = page.waitForResponse((response) => {
    const request = response.request();
    if (new URL(response.url()).pathname !== `/api/orders/${created.body.id}` || request.method() !== 'PATCH') return false;
    const body = request.postDataJSON();
    return Array.isArray(body?.items) && body.items.some((row: any) => Number(row.catalog_id) === Number(service.id) && Number(row.quantity) === 2);
  });
  await root.getByRole('button', { name: 'Salvar serviços', exact: true }).click();
  expect((await serviceSave).status()).toBe(200);
  await expect(root.getByText('Serviços salvos.', { exact: true })).toBeVisible();
  expect(await hasUnsavedGuard(page), 'Contrato rascunho: salvar serviços deve remover o aviso de saída pendente').toBe(false);

  await root.getByRole('button', { name: 'Editar', exact: true }).click();
  const editor = page.getByRole('dialog', { name: `Editar OS #${created.body.number}` });
  await expect(editor).toBeVisible();
  await editor.getByLabel('Atendimento').selectOption('external');
  await editor.getByLabel('Problema relatado').fill('Problema ainda não salvo no editor');
  await editor.getByLabel('Estado físico na entrada').fill('Risco ainda não salvo');
  expect(await hasUnsavedGuard(page), 'Contrato rascunho: atendimento/problema/estado físico pendentes devem proteger recarga e fechamento').toBe(true);

  let cancelMessage = '';
  page.once('dialog', async (dialog) => {
    cancelMessage = dialog.message();
    await dialog.dismiss();
  });
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(cancelMessage).toContain('alterações não salvas');
  await expect(editor, 'Contrato rascunho: rejeitar o descarte deve manter o editor aberto').toBeVisible();

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(editor).toBeHidden();
  expect(await hasUnsavedGuard(page), 'Contrato rascunho: descarte confirmado deve limpar o estado pendente').toBe(false);
});
