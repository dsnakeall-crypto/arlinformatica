import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createOrder(page: Page) {
  await login(page);
  const stamp = Date.now();
  const clientName = `Cliente Layout OS ${stamp}`;
  const equipmentDescription = `Notebook Layout ${stamp}`;
  const equipmentDetails = 'Dell Inspiron + carregador exclusivo do teste';
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(stamp),
    phone: '35999995555',
    postal_code: '37160000',
    street: 'Rua Layout',
    number: '606',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, JSON.stringify(client.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const equipmentType = equipment.body?.[0];
  expect(equipmentType, 'Contrato do layout: catálogo de equipamentos precisa ter ao menos um item').toBeTruthy();

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    equipment_description: equipmentDescription,
    equipment_details: equipmentDetails,
    attendance_type: 'external',
    reported_problem: 'Problema usado para validar a ficha condensada',
    checklist: [],
  });
  expect(order.status, JSON.stringify(order.body)).toBe(201);
  return { clientName, equipmentDescription, equipmentDetails, order: order.body };
}

async function openOrder(page: Page, clientName: string, number: string, equipmentDescription: string, equipmentDetails: string) {
  await page.getByRole('button', { name: 'Ordens' }).click();
  const row = page.locator('.order-row').filter({ hasText: clientName });
  await expect(row).toBeVisible();
  await expect(row.locator('.order-device')).toHaveText(equipmentDescription);
  await expect(row.locator('.order-device')).not.toContainText(equipmentDetails);
  await row.getByRole('button', { name: 'Ver OS' }).click();
  const root = page.locator('[data-arl-order-detail-react="1"]');
  await expect(root.getByRole('heading', { name: `OS #${number}`, exact: true })).toBeVisible();
  return root;
}

test('Ver OS segue fluxo linear sem remover ações, dados ou registro histórico', async ({ page }) => {
  const { clientName, equipmentDescription, equipmentDetails, order } = await createOrder(page);
  const root = await openOrder(page, clientName, order.number, equipmentDescription, equipmentDetails);

  const header = root.locator('.arl-order-sticky-header');
  await expect(header).toBeVisible();
  expect(await header.evaluate((node) => getComputedStyle(node).position), 'Cabeçalho da OS deve permanecer sticky durante a rolagem').toBe('sticky');
  await expect(header.getByText(clientName, { exact: true })).toBeVisible();
  await expect(header.getByText(equipmentDescription, { exact: true })).toBeVisible();
  await expect(header.getByText(equipmentDetails, { exact: true })).toHaveCount(0);
  await expect(header.locator('.status-picker')).toBeVisible();
  await expect(header.getByRole('button', { name: 'Histórico', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Orçamento', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Pagamento', exact: true })).toHaveCount(0);

  await expect(root.locator('.contact-links.external-actions')).toHaveCount(0);

  const opening = header.locator('.arl-opening-call');
  await expect(opening.getByRole('button', { name: "PDF's", exact: true })).toBeVisible();
  await opening.getByRole('button', { name: "PDF's", exact: true }).click();
  await expect(opening.getByRole('link', { name: 'Mensagem de abertura' })).toBeVisible();
  await expect(opening.getByRole('link', { name: 'Termo de Recebimento PDF' })).toBeVisible();
  await expect(opening.getByText('Relatório Técnico Final', { exact: true })).toBeVisible();
  await expect(opening.getByText('Reabrir OS', { exact: true })).toBeVisible();

  const rail = root.locator('.arl-order-stage-rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('li')).toHaveCount(5);
  await expect(rail.locator('li').nth(0)).toContainText('Entrada');
  await expect(rail.locator('li').nth(1)).toContainText('Aguardando');
  await expect(rail.locator('li').nth(2)).toContainText('Execução');
  await expect(rail.locator('li').nth(3)).toContainText('Finalização');
  await expect(rail.locator('li').nth(4)).toContainText('Pagamento');
  await expect(rail.locator('li').nth(0)).toHaveAttribute('data-stage-state', 'completed');
  await expect(rail.locator('li').nth(1)).toHaveAttribute('data-stage-state', 'current');
  await expect(rail.locator('li').nth(2)).toHaveAttribute('data-stage-state', 'future');
  await expect(rail.locator('a,button')).toHaveCount(0);

  const intake = root.locator('.arl-intake-card');
  await expect(intake.getByRole('heading', { name: 'Ficha de entrada', exact: true })).toBeVisible();
  for (const label of ['Cliente', 'Equipamento', 'Fabricante / Modelo / Acessórios', 'Problema relatado', 'Estado físico na entrada', 'Fotos']) {
    await expect(intake.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  await expect(intake.getByText(equipmentDescription, { exact: true })).toBeVisible();
  await expect(intake.getByText(equipmentDetails, { exact: true })).toBeVisible();
  await expect(intake.getByRole('button', { name: 'Editar ficha' })).toBeVisible();
  await expect(intake.locator('.arl-order-photo-tools label')).toContainText('Enviar foto');
  await expect(intake.getByRole('button', { name: '◉ Usar câmera' })).toBeVisible();
  await expect(intake.getByText('Nenhuma foto anexada.', { exact: true })).toBeVisible();

  const workflow = root.locator('.arl-order-workflow');
  const headerActions = root.locator('.arl-order-header-actions');
  await expect(headerActions.getByRole('button', { name: 'Concluir', exact: true })).toBeVisible();
  const actionLabels = await headerActions.locator(':scope > button, :scope > .arl-header-pdf-actions > button').allTextContents();
  expect(actionLabels).toEqual(['Histórico', 'Editar', 'Orçamento', "PDF's", 'Concluir']);
  const headings = await workflow.locator(':scope > section h2').allTextContents();
  const position = (name: string) => headings.findIndex((value) => value.trim() === name);
  const ordered = ['Serviços / Produtos', 'Laudo Final', 'Orçamentos', 'Pagamento'];
  ordered.forEach((name) => expect(position(name), `Bloco ${name} não apareceu no fluxo`).toBeGreaterThanOrEqual(0));
  for (let index = 1; index < ordered.length; index += 1) {
    expect(position(ordered[index]), `Ordem do fluxo incorreta entre ${ordered[index - 1]} e ${ordered[index]}`).toBeGreaterThan(position(ordered[index - 1]));
  }
  await expect(workflow.getByRole('heading', { name: 'Laudos técnicos', exact: true }), 'O fluxo reativável de laudos técnicos deve ficar oculto').toHaveCount(0);
  await expect(workflow.getByRole('button', { name: 'GERAR LAUDO TÉCNICO' })).toHaveCount(0);
  await expect(workflow.getByRole('heading', { name: 'Laudo Final', exact: true }), 'O texto livre usado no PDF final deve continuar disponível').toBeVisible();
  await expect(workflow.getByRole('heading', { name: 'Finalização da OS', exact: true }), 'O bloco antigo de finalização não deve permanecer no fim do fluxo').toHaveCount(0);

  const paymentCard = workflow.locator('section').filter({ has: page.getByRole('heading', { name: 'Pagamento', exact: true }) }).first();
  await expect(paymentCard.getByText('Pagamento ainda não registrado.', { exact: true })).toBeVisible();

  const serviceSearch = root.getByLabel('Pesquisar Serviço / Produto');
  const services = await api(page, '/catalogs/services');
  const service = services.body?.[0];
  expect(service, 'Contrato do layout: catálogo ativo precisa ter ao menos um Serviço / Produto').toBeTruthy();
  await serviceSearch.fill(service.name);
  const addResult = root.getByRole('button', { name: `Adicionar ${service.name}` });
  await expect(addResult).toBeVisible();
  await expect(addResult).toBeEnabled();
  expect(await addResult.evaluate((node) => getComputedStyle(node).backgroundColor), 'Resultado ativo da busca não pode parecer um botão desabilitado').not.toBe('rgba(0, 0, 0, 0)');
  await serviceSearch.fill('');
  await expect(root.getByRole('button', { name: 'Salvar serviços' })).toBeEnabled();
  await expect(root.getByRole('button', { name: 'Salvar serviços' })).toHaveClass(/primary/);
  await expect(root.getByRole('button', { name: 'Salvar Laudo Final' })).toBeEnabled();
  await expect(root.getByRole('button', { name: 'Salvar Laudo Final' })).toHaveClass(/primary/);

  const record = workflow.locator('.arl-order-record');
  await expect(record.getByRole('heading', { name: 'Registro da OS', exact: true })).toBeVisible();
  const accordions = record.locator(':scope > details');
  await expect(accordions).toHaveCount(3);
  expect(await accordions.locator('summary').allTextContents()).toEqual(['Histórico de status', 'Histórico de alterações', 'Documentos']);
  for (let index = 0; index < 3; index += 1) await expect(accordions.nth(index)).not.toHaveAttribute('open', '');
  await expect(record.locator('[role="tab"]')).toHaveCount(0);
  await accordions.nth(2).locator('summary').click();
  await expect(record.getByRole('link', { name: 'Termo de recebimento' })).toHaveCount(1);

  const layoutText = await page.locator('.device-layout').innerText();
  expect((layoutText.match(/Layout/g) ?? []).length, 'Cabeçalho global não pode renderizar "Layout Layout"').toBe(1);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(header).toBeVisible();
  const fitsTablet = await root.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  expect(fitsTablet, 'Ver OS não deve provocar overflow horizontal da página em tablet').toBe(true);

  await headerActions.getByRole('button', { name: 'Concluir', exact: true }).click();
  const finalization = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(finalization).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const finalizationFitsMobile = await finalization.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  expect(finalizationFitsMobile, 'Modal de finalização não deve cortar nem provocar overflow em mobile').toBe(true);
  await expect(finalization.getByRole('button', { name: 'Fechar finalização' })).toBeVisible();
});

test('OS externa reaberta não recria atalhos removidos do detalhe', async ({ page }) => {
  const { clientName, equipmentDescription, equipmentDetails, order } = await createOrder(page);
  const finalized = await api(page, `/orders/${order.id}/finalize`, 'POST', {
    result: 'no_fault',
    technical_report: 'Finalização usada para validar os atalhos após reabertura.',
    items: [],
    discount_cents: 0,
    photo_ids: [],
  });
  expect([200, 201], JSON.stringify(finalized.body)).toContain(finalized.status);

  const root = await openOrder(page, clientName, order.number, equipmentDescription, equipmentDetails);
  await root.getByRole('button', { name: 'Reabrir OS', exact: true }).click();
  const modal = page.getByRole('dialog', { name: `Reabrir OS #${order.number}` });
  await modal.getByLabel('Motivo da reabertura').fill('Retorno externo em garantia.');
  await modal.getByRole('button', { name: 'Confirmar reabertura' }).click();

  await expect(root.getByText('Reaberta', { exact: true })).toBeVisible();
  await expect(root.locator('.contact-links.external-actions')).toHaveCount(0);
});
