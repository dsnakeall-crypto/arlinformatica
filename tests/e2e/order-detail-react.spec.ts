import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createActiveOrder(page: Page, suffix: number, attendance: 'bench' | 'external' = 'bench') {
  await login(page);
  const clientName = `Cliente React OS ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(202609070 + suffix),
    phone: `3499999${String(7000 + suffix).slice(-4)}`,
    postal_code: '37160000',
    street: 'Rua React',
    number: String(100 + suffix),
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, `Contrato fixture: cliente ${suffix} deveria ser criado; resposta=${JSON.stringify(client.body)}`).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const equipmentType = equipment.body?.[0];
  expect(equipmentType, 'Contrato fixture: catálogo de equipamentos precisa ter ao menos um tipo para criar a OS React').toBeTruthy();

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: attendance,
    reported_problem: `Problema React ${suffix}`,
    checklist: [],
  });
  expect(order.status, `Contrato fixture: OS ${suffix} deveria ser criada; resposta=${JSON.stringify(order.body)}`).toBe(201);
  return { clientName, order: order.body };
}

async function openOrder(page: Page, clientName: string, orderNumber: string) {
  await page.getByRole('button', { name: 'Ordens de Serviço' }).click();
  const row = page.locator('.order-row').filter({ hasText: clientName });
  await expect(row, `Contrato navegação: linha da OS de ${clientName} não apareceu na lista`).toBeVisible();
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderNumber}`, exact: true }), `Contrato navegação: detalhe da OS #${orderNumber} não abriu`).toBeVisible();
  const root = page.locator('[data-arl-order-detail-react="1"]');
  await expect(root, `Contrato React: raiz data-arl-order-detail-react da OS #${orderNumber} não foi montada`).toHaveCount(1);
  return root;
}

test('Ver OS React possui uma única raiz e blocos funcionais sem duplicação legada', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 1);
  const root = await openOrder(page, clientName, order.number);

  const cardinality = await root.evaluate((node) => ({
    detailGrid: node.querySelectorAll('.detail-grid').length,
    services: node.querySelectorAll('.arl-od-services').length,
    finalReport: node.querySelectorAll('.arl-od-report').length,
    quickActions: node.querySelectorAll('.arl-order-quick-actions').length,
    editButtons: Array.from(node.querySelectorAll('button')).filter((button) => button.textContent?.trim().includes('Editar OS')).length,
    finalizationSections: Array.from(node.querySelectorAll('section h2')).filter((heading) => heading.textContent?.trim() === 'Finalização da OS').length,
  }));
  expect(cardinality, `Contrato React duplicado: esperado 1 de cada bloco principal; recebido=${JSON.stringify(cardinality)}`).toEqual({
    detailGrid: 1,
    services: 1,
    finalReport: 1,
    quickActions: 1,
    editButtons: 1,
    finalizationSections: 1,
  });
});

test('OS finalizada/paga permite equipamento, atendimento e relato e preserva campos históricos explicitamente', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 2);
  const finalized = await api(page, `/orders/${order.id}/finalize`, 'POST', {
    result: 'no_fault',
    result_other: null,
    technical_report: 'Laudo histórico imutável E2E',
    discount_cents: 0,
    approved_budget_id: null,
    photo_ids: [],
    items: [],
  });
  expect([200, 201], `Contrato imutabilidade: backend não finalizou a OS; status=${finalized.status} body=${JSON.stringify(finalized.body)}`).toContain(finalized.status);

  const root = await openOrder(page, clientName, order.number);
  await root.getByRole('button', { name: 'Editar OS' }).click();
  const dialog = page.getByRole('dialog', { name: `Editar OS #${order.number}` });
  await expect(dialog, 'Contrato imutabilidade: Editar OS finalizada deveria abrir o editor administrativo').toBeVisible();
  await expect(
    dialog.getByText(/fechamento, valores, cliente, laudo final, checklist e serviços permanecem preservados/i),
    'Contrato imutabilidade: aviso explícito de preservação histórica desapareceu',
  ).toBeVisible();

  await expect(dialog.getByLabel('Equipamento / Modelo / Acessórios'), 'Contrato administrativo: equipamento deve permanecer corrigível').toBeVisible();
  await expect(dialog.getByLabel('Equipamento / Modelo / Acessórios'), 'Contrato administrativo: equipamento deve permanecer habilitado').toBeEnabled();
  await expect(dialog.getByLabel('Atendimento'), 'Contrato administrativo: attendance_type deve permanecer corrigível').toBeVisible();
  await expect(dialog.getByLabel('Atendimento'), 'Contrato administrativo: attendance_type deve permanecer habilitado').toBeEnabled();
  await expect(dialog.getByLabel('Problema relatado'), 'Contrato administrativo: reported_problem deve permanecer corrigível').toBeVisible();
  await expect(dialog.getByLabel('Problema relatado'), 'Contrato administrativo: reported_problem deve permanecer habilitado').toBeEnabled();

  await expect(dialog.getByLabel('Cliente da OS'), 'Contrato protegido: client_id não pode ser exposto para edição após finalização').toHaveCount(0);
  await expect(dialog.getByRole('heading', { name: 'Checklist', exact: true }), 'Contrato protegido: checklist não pode ser exposto para edição após finalização').toHaveCount(0);
  await expect(dialog.getByLabel('Serviço para adicionar no editor'), 'Contrato protegido: itens/serviços não podem ser expostos para edição após finalização').toHaveCount(0);
  await expect(dialog.getByText('Laudo Final', { exact: true }), 'Contrato protegido: laudo final não pode ser exposto para edição após finalização').toHaveCount(0);

  const protectedAttempts = [
    ['client_id', { client_id: order.client_id }],
    ['items', { items: [] }],
    ['final_report', { final_report: 'Laudo pós-fechamento indevido' }],
    ['checklist', { checklist: [] }],
  ] as const;
  for (const [field, payload] of protectedAttempts) {
    const response = await api(page, `/orders/${order.id}`, 'PATCH', payload);
    expect(response.status, `Contrato protegido em Finalizado: ${field} foi aceito; body=${JSON.stringify(response.body)}`).toBe(422);
  }

  await dialog.getByLabel('Equipamento / Modelo / Acessórios').fill('Equipamento administrativo corrigido após finalização');
  await dialog.getByLabel('Atendimento').selectOption('external');
  await dialog.getByLabel('Problema relatado').fill('Problema administrativo corrigido após finalização');
  const saveResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.id}` && response.request().method() === 'PATCH'
  );
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  const saved = await saveResponse;
  expect(saved.status(), 'Contrato administrativo: PATCH permitido de equipamento/atendimento/problema falhou').toBe(200);

  const persisted = await api(page, `/orders/${order.id}`);
  expect(persisted.status).toBe(200);
  expect(persisted.body?.equipment_description, 'Contrato administrativo: equipamento corrigido não persistiu').toBe('Equipamento administrativo corrigido após finalização');
  expect(persisted.body?.attendance_type, 'Contrato administrativo: attendance_type corrigido não persistiu').toBe('external');
  expect(persisted.body?.reported_problem, 'Contrato administrativo: reported_problem corrigido não persistiu').toBe('Problema administrativo corrigido após finalização');
  expect(Number(persisted.body?.client_id), 'Contrato protegido: client_id mudou indevidamente').toBe(Number(order.client_id));
  expect(persisted.body?.final_report ?? null, 'Contrato protegido: laudo final mudou indevidamente').toBe(order.final_report ?? null);
  expect(persisted.body?.checklists ?? [], 'Contrato protegido: checklist mudou indevidamente').toEqual([]);

  const paid = await api(page, `/orders/${order.id}/status`, 'PATCH', { status: 'paid' });
  expect(paid.status, `Contrato Pago: não foi possível arquivar OS de total zero; body=${JSON.stringify(paid.body)}`).toBe(200);

  const paidEquipment = await api(page, `/orders/${order.id}`, 'PATCH', {
    equipment_description: 'Equipamento administrativo corrigido após pagamento',
  });
  expect(paidEquipment.status, `Contrato Pago: equipamento deveria ser corrigível; body=${JSON.stringify(paidEquipment.body)}`).toBe(200);

  for (const [field, payload] of protectedAttempts) {
    const response = await api(page, `/orders/${order.id}`, 'PATCH', payload);
    expect(response.status, `Contrato protegido em Pago: ${field} foi aceito; body=${JSON.stringify(response.body)}`).toBe(422);
  }

  const paidPersisted = await api(page, `/orders/${order.id}`);
  expect(paidPersisted.status).toBe(200);
  expect(paidPersisted.body?.display_status, 'Contrato Pago: OS deveria permanecer arquivada').toBe('paid');
  expect(paidPersisted.body?.equipment_description, 'Contrato Pago: correção de equipamento não persistiu').toBe('Equipamento administrativo corrigido após pagamento');
  expect(Number(paidPersisted.body?.client_id), 'Contrato protegido em Pago: client_id mudou indevidamente').toBe(Number(order.client_id));
  expect(paidPersisted.body?.final_report ?? null, 'Contrato protegido em Pago: laudo final mudou indevidamente').toBe(order.final_report ?? null);
  expect(paidPersisted.body?.checklists ?? [], 'Contrato protegido em Pago: checklist mudou indevidamente').toEqual([]);
});

test('Laudo Final usa estado compartilhado painel↔modal e fechar não grava PATCH nem finaliza', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 3);
  const root = await openOrder(page, clientName, order.number);
  const panel = root.locator('.arl-od-report textarea');

  await panel.fill('Rascunho A do painel');
  await root.getByRole('button', { name: 'Concluir OS' }).click();
  let modal = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(modal.locator('textarea'), 'Contrato laudo painel→modal: cada abertura deve receber o rascunho atual do painel').toHaveValue('Rascunho A do painel');
  await modal.locator('.modal-close').click();

  await panel.fill('Rascunho B alterado depois de fechar');
  await root.getByRole('button', { name: 'Concluir OS' }).click();
  modal = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(modal.locator('textarea'), 'Contrato laudo reabertura: modal reutilizou valor antigo em vez do estado atual do painel').toHaveValue('Rascunho B alterado depois de fechar');

  const writes: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if ((pathname === `/api/orders/${order.id}` && request.method() === 'PATCH') || (pathname === `/api/orders/${order.id}/finalize` && request.method() === 'POST')) {
      writes.push(`${request.method()} ${pathname}`);
    }
  });
  await modal.locator('textarea').fill('Rascunho C escrito no modal');
  await modal.locator('.modal-close').click();

  await expect(panel, 'Contrato laudo modal→painel: fechar sem finalizar deve manter o rascunho digitado no estado compartilhado').toHaveValue('Rascunho C escrito no modal');
  expect(writes, `Contrato crítico de cancelamento: fechar o modal disparou gravação/finalização indevida: ${writes.join(', ') || 'nenhuma'}`).toEqual([]);
});

test('Guards impedem qualquer enhancer legado de mutar a árvore React do Ver OS', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 4);
  const root = await openOrder(page, clientName, order.number);
  await expect(root.getByText('Pagamento ainda não registrado.', { exact: true }), 'Pré-condição do guard: PaymentBox React ainda estava carregando').toBeVisible();
  await expect(root.getByText('Nenhum orçamento criado.', { exact: true }), 'Pré-condição do guard: BudgetBox React ainda estava carregando').toBeVisible();
  await expect(root.getByLabel('Serviço para adicionar').locator('option').first(), 'Pré-condição do guard: catálogo de serviços React ainda estava carregando').toBeAttached();

  const quickActions = root.locator('.arl-order-quick-actions');
  await expect(quickActions, 'Contrato guard: ações rápidas React desapareceram').toHaveCount(1);
  await expect(quickActions, 'Contrato guard: enhancer legado não pode escrever style inline nas ações rápidas React').not.toHaveAttribute('style', /.+/);

  const preexistingFingerprints = await root.evaluate((node) => {
    const fingerprints = [
      '.arl-od-tools[data-id]',
      '.arl-od-services[data-sig]',
      '.arl-od-report[data-sig]',
    ];
    return fingerprints.filter((selector) => node.querySelector(selector));
  });
  expect(preexistingFingerprints, `Contrato guard já estava furado antes do estímulo: ${preexistingFingerprints.join(' | ') || 'nenhum fingerprint'}`).toEqual([]);

  const before = await root.evaluate((node) => node.outerHTML);
  await page.evaluate(() => {
    const rootNode = document.querySelector('[data-arl-order-detail-react="1"]');
    rootNode?.querySelector('h1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
    window.dispatchEvent(new Event('arl:order-detail'));
    const wakeObservers = document.createElement('i');
    wakeObservers.dataset.arlGuardWake = '1';
    document.body.append(wakeObservers);
    wakeObservers.remove();
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const after = await root.evaluate((node) => node.outerHTML);
  expect(after, 'Contrato guard furado: estímulos de enhancers legados alteraram a árvore React do Ver OS').toBe(before);
  await expect(quickActions, 'Contrato guard: enhancer legado escreveu style inline após o estímulo').not.toHaveAttribute('style', /.+/);
});

test('Unmount do Ver OS limpa resíduos persistentes e o sharebar legado é aposentado pelo próprio observer', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 5);
  await openOrder(page, clientName, order.number);

  await page.evaluate(() => {
    const sharebar = document.createElement('div');
    sharebar.className = 'arl-od-sharebar';
    sharebar.dataset.testOrderResidue = 'arl-od-sharebar';
    document.body.append(sharebar);
  });
  await expect(page.locator('[data-test-order-residue="arl-od-sharebar"]'), 'Contrato ownership: opening-whatsapp deve aposentar sharebar legado ainda no detalhe').toHaveCount(0);

  const residueClasses = [
    'arl-od-modal',
    'arl-status-modal',
    'arl-photo-choice',
    'arl-camera-modal',
    'arl-final-share-host',
    'arl-order-quick-actions',
    'arl-order-opened-modal',
  ];
  await page.evaluate((classes) => {
    classes.forEach((className) => {
      const residue = document.createElement('div');
      residue.className = className;
      residue.dataset.testOrderResidue = className;
      residue.style.pointerEvents = 'none';
      residue.style.position = 'fixed';
      residue.style.left = '-10000px';
      residue.style.top = '-10000px';
      document.body.append(residue);
    });
  }, residueClasses);

  const injected = await page.locator('[data-test-order-residue]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.testOrderResidue));
  expect(injected, `Pré-condição resíduos: deveriam existir exatamente os 7 resíduos persistentes; encontrados=${injected.join(', ')}`).toEqual(residueClasses);

  await page.locator('aside').getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel', exact: true }), 'Contrato unmount: navegação para Painel não concluiu').toBeVisible();
  await expect(page.locator('[data-test-order-residue]'), 'Contrato limpeza: resíduos persistentes devem sumir no unmount do detalhe React').toHaveCount(0);
});
