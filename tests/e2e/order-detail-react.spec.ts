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

test('OS finalizada permanece imutável e Editar OS mostra somente o aviso de preservação', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 2);
  const services = await api(page, '/catalogs/services');
  const service = services.body?.[0];
  expect(service, 'Contrato imutabilidade: catálogo de serviços precisa ter um item para finalizar a OS').toBeTruthy();
  const finalized = await api(page, `/orders/${order.id}/finalize`, 'POST', {
    result: 'repair_completed',
    result_other: null,
    technical_report: 'Laudo histórico imutável E2E',
    discount_cents: 0,
    approved_budget_id: null,
    photo_ids: [],
    items: [{
      catalog_id: service.id,
      description: service.name,
      quantity: 1,
      unit_price_cents: service.price_cents,
      warranty_enabled: Boolean(service.warranty_enabled),
      warranty_term: service.warranty_term ?? null,
      warranty_unit: service.warranty_unit ?? null,
      warranty_description: service.warranty_description ?? null,
    }],
  });
  expect([200, 201], `Contrato imutabilidade: backend não finalizou a OS; status=${finalized.status} body=${JSON.stringify(finalized.body)}`).toContain(finalized.status);

  const root = await openOrder(page, clientName, order.number);
  await root.getByRole('button', { name: 'Editar OS' }).click();
  const dialog = page.getByRole('dialog', { name: `Editar OS #${order.number}` });
  await expect(dialog, 'Contrato imutabilidade: Editar OS finalizada deveria abrir o aviso de preservação').toBeVisible();
  await expect(dialog.getByText(/conteúdo histórico não pode ser alterado/i), 'Contrato imutabilidade: mensagem clara de bloqueio da OS finalizada desapareceu').toBeVisible();
  const editableFields = await dialog.locator('input:not([type=hidden]), textarea, select').count();
  expect(editableFields, `Contrato imutabilidade: aviso de OS finalizada expôs ${editableFields} campo(s) editável(is)`).toBe(0);
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

  const preexistingFingerprints = await root.evaluate((node) => {
    const fingerprints = [
      { selector: '.arl-od-tools[data-id]', enhancer: 'order-detail-actions.ts' },
      { selector: '.arl-od-services[data-sig]', enhancer: 'order-detail-editor.ts' },
      { selector: '.arl-od-report[data-sig]', enhancer: 'order-detail-editor.ts' },
    ];
    return fingerprints.filter((item) => node.querySelector(item.selector)).map((item) => `${item.enhancer}: ${item.selector}`);
  });
  expect(preexistingFingerprints, `Contrato guard já estava furado antes do estímulo: ${preexistingFingerprints.join(' | ') || 'nenhum fingerprint'}`).toEqual([]);

  await root.evaluate((node) => {
    const mutationLog: string[] = [];
    const elementLabel = (element: Element | null) => {
      if (!element) return 'nó não-elemento';
      const id = element.id ? `#${element.id}` : '';
      const classes = element.classList.length ? `.${Array.from(element.classList).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const likelyEnhancer = (target: Element | null) => {
      if (!target) return 'enhancer desconhecido';
      if (target.closest('.arl-od-services, .arl-od-report')) return 'order-detail-editor.ts';
      if (target.closest('.arl-od-tools, .arl-pay-edit')) return 'order-detail-actions.ts/record-management.ts';
      if (target.closest('.arl-order-quick-actions, [data-arl-quick-source]')) return 'ui-final-polish.ts';
      if (target.closest('.status-picker, .arl-interruption-note')) return 'order-workflow.ts/ui-regression-guard.ts';
      const section = target.closest('section');
      if (section?.querySelector('h2')?.textContent?.trim() === 'Fotos') return 'brand2026.ts';
      return 'enhancer legado não identificado';
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const added = Array.from(record.addedNodes).map((addedNode) => addedNode instanceof Element ? elementLabel(addedNode) : '#text').join(',');
        mutationLog.push(`${likelyEnhancer(target)} :: ${record.type} em ${elementLabel(target)}${record.attributeName ? ` atributo=${record.attributeName}` : ''}${added ? ` adicionou=${added}` : ''}`);
      }
    });
    observer.observe(node, { subtree: true, childList: true, attributes: true, characterData: true });
    (window as any).__arlOrderGuardObserver = observer;
    (window as any).__arlOrderGuardMutations = mutationLog;
  });

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

  const mutations = await page.evaluate(() => {
    (window as any).__arlOrderGuardObserver?.disconnect();
    return (window as any).__arlOrderGuardMutations as string[];
  });
  expect(mutations, `Contrato guard furado — enhancer(s) tocaram a árvore React: ${mutations.join(' | ') || 'nenhuma mutação registrada'}`).toEqual([]);
});

test('Unmount do Ver OS limpa os oito resíduos desacoplados sem depender de page-isolation legado', async ({ page }) => {
  const { clientName, order } = await createActiveOrder(page, 5);
  await openOrder(page, clientName, order.number);
  const residueClasses = [
    'arl-od-modal',
    'arl-status-modal',
    'arl-photo-choice',
    'arl-camera-modal',
    'arl-final-share-host',
    'arl-od-sharebar',
    'arl-order-quick-actions',
    'arl-order-opened-modal',
  ];
  await page.evaluate((classes) => {
    classes.forEach((className) => {
      const residue = document.createElement('div');
      residue.className = className;
      residue.dataset.testOrderResidue = className;
      document.body.append(residue);
    });
  }, residueClasses);
  const injected = await page.locator('[data-test-order-residue]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.testOrderResidue));
  expect(injected, `Pré-condição resíduos: deveriam existir exatamente os 8 resíduos sintéticos; encontrados=${injected.join(', ')}`).toEqual(residueClasses);

  await page.locator('aside').getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel', exact: true }), 'Contrato unmount: navegação para Painel não concluiu').toBeVisible();
  const remaining = await page.locator('[data-test-order-residue]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.testOrderResidue));
  expect(remaining, `Contrato limpeza no unmount falhou — resíduos restantes: ${remaining.join(', ') || 'nenhum'}`).toEqual([]);
});
