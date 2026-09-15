import { expect, test, type Page } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

type StatusCase = {
  code: 'analysis' | 'waiting_part' | 'in_service' | 'interrupted' | 'completed';
  label: string;
};

const statuses: StatusCase[] = [
  { code: 'analysis', label: 'Em Análise' },
  { code: 'waiting_part', label: 'Aguardando Peça' },
  { code: 'in_service', label: 'Em Serviço' },
  { code: 'interrupted', label: 'Interrompido' },
  { code: 'completed', label: 'Finalizado' },
];

async function createOrder(page: Page, index: number, label: string) {
  await login(page);
  const clientName = `Contrato Status ${index} ${label}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(20260907120 + index),
    phone: `3598877${String(8100 + index).slice(-4)}`,
    postal_code: '37160000',
    street: 'Rua Contrato Status',
    number: String(200 + index),
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(client.status, `Criação do cliente para ${label}: ${JSON.stringify(client.body)}`).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const equipmentType = equipment.body?.[0];
  expect(equipmentType, `Criação da OS para ${label}: catálogo de equipamentos vazio`).toBeTruthy();

  const created = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentType.id,
    manufacturer_id: null,
    attendance_type: 'bench',
    reported_problem: `Contrato de status ${label}`,
    checklist: [],
  });
  expect(created.status, `Criação da OS para ${label}: ${JSON.stringify(created.body)}`).toBe(201);
  expect(created.body.status, `Toda OS deve nascer em Em Análise antes da transição para ${label}`).toBe('analysis');

  return { clientName, order: created.body };
}

async function moveToStatus(page: Page, order: any, status: StatusCase) {
  if (status.code === 'analysis') return;

  if (status.code === 'completed') {
    const finalized = await api(page, `/orders/${order.id}/finalize`, 'POST', {
      result: 'no_fault',
      result_other: null,
      technical_report: 'Contrato E2E: finalização sem defeito constatado.',
      discount_cents: 0,
      approved_budget_id: null,
      photo_ids: [],
      items: [],
    });
    expect(finalized.status, `Transição para Finalizado: ${JSON.stringify(finalized.body)}`).toBe(201);
    return;
  }

  const payload: Record<string, unknown> = { status: status.code };
  if (status.code === 'interrupted') {
    payload.interruption_reason = 'Contrato E2E: atendimento interrompido.';
    payload.interruption_work_done = 'Contrato E2E: nenhum reparo foi realizado.';
  }
  const changed = await api(page, `/orders/${order.id}/status`, 'PATCH', payload);
  expect(changed.status, `Transição para ${status.label}: ${JSON.stringify(changed.body)}`).toBe(200);
  expect(changed.body.status, `Resposta da transição deveria permanecer em ${status.code}`).toBe(status.code);
}

for (const [index, status] of statuses.entries()) {
  test(`status ${status.label}: criação, persistência e exibição preservam o estado operacional`, async ({ page }) => {
    const { clientName, order } = await createOrder(page, index + 1, status.label);
    await moveToStatus(page, order, status);

    const persisted = await api(page, `/orders/${order.id}`);
    expect(persisted.status, `Persistência de ${status.label}: GET da OS falhou`).toBe(200);
    expect(persisted.body.status, `Persistência de ${status.label}: backend devolveu outro estado`).toBe(status.code);

    if (status.code === 'interrupted') {
      expect(persisted.body.completed_at, 'Interrupção deve preencher a data de fechamento').toBeTruthy();
      expect(persisted.body.total_cents, 'Interrupção deve zerar o total').toBe(0);
      expect(persisted.body.items, 'Interrupção deve remover os serviços da OS').toEqual([]);
      const finalized = await api(page, `/orders?tab=finalized&q=${encodeURIComponent(clientName)}`);
      expect(finalized.body.data.some((row: any) => row.id === order.id), 'OS interrompida deve ficar junto das finalizadas').toBe(true);
      const reopened = await api(page, `/orders/${order.id}/reopen`, 'POST', { note: 'Tentativa proibida pelo contrato E2E.' });
      expect(reopened.status, 'Backend deve recusar reabertura de OS interrompida').toBe(422);
    }

    if (status.code === 'in_service') {
      const desk = await api(page, '/orders/desk');
      expect(desk.status, 'Mesa de Chamados deveria aceitar consulta com OS Em Serviço').toBe(200);
      expect(desk.body.some((row: any) => row.id === order.id), 'OS Em Serviço desapareceu da Mesa de Chamados').toBe(true);
    }

    await page.getByRole('button', { name: 'Ordens' }).click();
    const tabs = page.getByRole('tablist', { name: 'Filtrar ordens' });
    await expect(tabs.getByRole('button', { name: 'Todas', exact: true })).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Em Andamento', exact: true })).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Finalizadas', exact: true })).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Interrompidas', exact: true })).toBeVisible();

    const search = page.getByPlaceholder('Número da OS ou nome do cliente…');
    const dashboardResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/orders' && url.searchParams.get('q') === clientName && response.request().method() === 'GET';
    });
    await search.fill(clientName);
    expect((await dashboardResponse).status(), `Painel não concluiu a busca da OS em ${status.label}`).toBe(200);

    const dashboardRow = page.locator('.order-row').filter({ hasText: clientName });
    await expect(dashboardRow, `Painel não exibiu a OS em ${status.label} após filtrar pelo cliente`).toBeVisible();
    if (status.code === 'interrupted') {
      await expect(dashboardRow.getByText('Interrompida', { exact: true })).toBeVisible();
    }
    const rowStatus = dashboardRow.getByLabel(new RegExp(`Status da OS`));
    await expect(rowStatus.locator('option:checked'), `Lista mentiu sobre o estado ${status.code}`).toHaveText(status.code === 'completed' ? 'Concluído' : status.code === 'waiting_part' ? 'Aguardando Peça' : status.label);
    if (!['completed', 'interrupted'].includes(status.code)) {
      await expect(rowStatus.locator('option[value="completed"]')).toHaveCount(0);
      await expect(rowStatus.locator('option[value="paid"]')).toHaveCount(0);
    } else if (status.code === 'completed') {
      await expect(rowStatus.locator('option[value="paid"]'), 'PAGO só pode aparecer quando existe valor pendente').toHaveCount(0);
    }
    await dashboardRow.getByRole('button', { name: 'Ver OS' }).click();

    const root = page.locator('[data-arl-order-detail-react="1"]');
    await expect(root, `Detalhe React não abriu para ${status.label}`).toHaveCount(1);
    const picker = root.locator('.status-picker select');
    await expect(picker, `Seletor do detalhe não persistiu ${status.code}`).toHaveValue(status.code);
    await expect(picker.locator('option:checked'), `Seletor do detalhe exibiu rótulo errado para ${status.code}`).toHaveText(status.label);
    if (status.code === 'interrupted') {
      await expect(picker).toBeDisabled();
      await expect(root.getByText('Interrompida', { exact: true })).toBeVisible();
      await expect(root.getByRole('button', { name: 'Reabrir OS', exact: true })).toHaveCount(0);
    }

    if (!['completed', 'interrupted'].includes(status.code)) {
      await expect(picker.locator('option[value="analysis"]')).toHaveText('Em Análise');
      await expect(picker.locator('option[value="waiting_part"]')).toHaveText('Aguardando Peça');
      await expect(picker.locator('option[value="in_service"]'), 'Detalhe React perdeu Em Serviço como opção selecionável').toHaveText('Em Serviço');
      await expect(picker.locator('option[value="interrupted"]')).toHaveText('Interrompido');
      await expect(picker.locator('option[value="completed"]')).toHaveText('Finalizado');
    }

    const history = await api(page, `/orders/${order.id}`);
    expect(history.body.histories.some((entry: any) => entry.to_status === status.code), `Histórico preservado não registrou ${status.label}`).toBe(true);

    if (['completed', 'interrupted'].includes(status.code)) {
      await page.getByRole('button', { name: 'Painel', exact: true }).click();
      const closedPanel = page.locator('.dashboard-closed-orders');
      const closedRow = closedPanel.locator('.order-row').filter({ hasText: clientName });
      await expect(closedPanel.locator('.dashboard-list-head h2')).toHaveText('Fechadas recentemente');
      await expect(closedPanel.getByText('OS concluídas e interrompidas desta semana.', { exact: true })).toBeVisible();
      await expect(closedRow).toBeVisible();
      if (status.code === 'interrupted') {
        await expect(closedRow.getByText('Interrompida', { exact: true })).toBeVisible();
      } else {
        await expect(closedRow.getByText('Interrompida', { exact: true })).toHaveCount(0);
      }
    }
  });
}

test('OS concluída sem pagamento mostra Aguardando PGTO e exige forma para virar Pago', async ({ page }) => {
  const { clientName, order } = await createOrder(page, 90, 'Aguardando PGTO');
  const services = await api(page, '/catalogs/services');
  const service = services.body.find((row: any) => Number(row.price_cents) > 0);
  expect(service, 'O catálogo E2E precisa ter um serviço com valor para testar o recebimento').toBeTruthy();

  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const finalizedResponse = await page.request.post(`/api/orders/${order.id}/finalize`, {
    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken ?? '' },
    data: {
    result: 'repair_completed',
    technical_report: 'Serviço concluído e aguardando pagamento.',
    discount_cents: 0,
    photo_ids: [],
    items: [{
      catalog_id: service.id,
      description: service.name,
      quantity: 1,
      unit_price_cents: Number(service.price_cents),
      warranty_enabled: Boolean(service.warranty_enabled),
      warranty_term: service.warranty_enabled ? service.warranty_term : null,
      warranty_unit: service.warranty_enabled ? service.warranty_unit : null,
    }],
    is_paid: false,
    },
  });
  const finalized = await finalizedResponse.json();
  expect(finalizedResponse.status(), `Finalização sem pagamento falhou: ${JSON.stringify(finalized)}`).toBe(201);
  expect(finalized.order.display_status).toBe('awaiting_payment');

  await page.getByRole('button', { name: 'Ordens' }).click();
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill(clientName);
  const row = page.locator('.orders-order-list .order-row').filter({ hasText: clientName });
  await expect(row).toBeVisible();
  const statusSelect = row.getByLabel(`Status da OS ${order.number}`);
  await expect(statusSelect.locator('option:checked')).toHaveText('Aguardando PGTO');
  await expect(statusSelect.locator('option[value="paid"]')).toHaveText('PAGO');
  await expect(statusSelect.locator('option[value="completed"]')).toHaveCount(0);

  await statusSelect.selectOption('paid');
  const modal = page.getByRole('dialog', { name: `Registrar pagamento da OS #${order.number}` });
  await expect(modal).toBeVisible();
  await expect(modal.getByText(`O valor total da OS, R$ ${(service.price_cents / 100).toFixed(2).replace('.', ',')}, será registrado como pago.`)).toBeVisible();
  await modal.getByLabel('Forma de pagamento').selectOption('pix');
  const paidResponse = page.waitForResponse((response) => response.url().endsWith(`/api/orders/${order.id}/status`) && response.request().method() === 'PATCH');
  await modal.getByRole('button', { name: 'Confirmar pagamento' }).click();
  expect((await paidResponse).status()).toBe(200);
  await expect(modal).toHaveCount(0);
  await expect(row.getByLabel(`Status da OS ${order.number}`).locator('option:checked')).toHaveText('Pago');

  const persisted = await api(page, `/orders/${order.id}`);
  expect(persisted.body.display_status).toBe('paid');
  expect(persisted.body.archived).toBe(1);
  const payments = await api(page, `/orders/${order.id}/payments`);
  expect(payments.body.paid_cents).toBe(service.price_cents);
  expect(payments.body.balance_cents).toBe(0);
});
