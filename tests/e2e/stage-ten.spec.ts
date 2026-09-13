import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

test('painel mantém a consulta operacional e o menu oculta Mesa de Chamados', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  const counters = page.locator('.status-cards');
  await expect(counters.getByText('Em Análise', { exact: true })).toBeVisible();
  await expect(counters.getByText('Aguardando Peça', { exact: true })).toBeVisible();
  await expect(counters.getByText('Em Serviço', { exact: true })).toBeVisible();
  await expect(counters.getByText('Concluídos', { exact: true })).toBeVisible();
  await expect(counters.locator('strong')).toHaveCount(4);
  await expect(page.getByRole('main').getByRole('button', { name: 'Nova OS' })).toBeVisible();

  const nav = page.locator('aside nav');
  await expect(nav.getByRole('button', { name: 'Mesa de Chamados', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Ordens', exact: true })).toBeVisible();
});

test('Painel alinha cabeçalho e linha nas seis colunas operacionais', async ({ page }) => {
  await login(page);
  const client = await api(page, '/clients', 'POST', {
    name: 'Allan Rabelo Luttembarck', document: '52998224725', phone: '35999999999',
    postal_code: '37160000', street: 'Rua do Painel', number: '10', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench',
    equipment_description: 'Notebook com descrição extensa para validar contenção',
    reported_problem: 'Relato longo do cliente para validar duas linhas e contenção dentro da coluna própria.', checklist: [],
  });
  expect(order.status).toBe(201);
  await page.goto('/');
  const table = page.locator('.dashboard-order-list');
  await expect(table).toBeVisible();
  await expect(table.locator('.order-row.head > span')).toHaveText(['# OS', 'CLIENTE', 'DISPOSITIVO', 'STATUS', 'RELATO', 'AÇÕES']);
  const row = table.locator('.order-row:not(.head)').filter({ hasText: `#${order.body.number}` });
  await expect(row).toBeVisible();
  const alignment = await row.evaluate((element) => {
    const header = element.parentElement?.querySelector('.order-row.head');
    const starts = (node: Element) => Array.from(node.children).map((child) => Math.round(child.getBoundingClientRect().left));
    return { header: header ? starts(header) : [], row: starts(element) };
  });
  expect(alignment.header).toHaveLength(6);
  expect(alignment.row).toHaveLength(6);
  alignment.row.forEach((start, index) => expect(Math.abs(start - alignment.header[index])).toBeLessThanOrEqual(1));
  await expect(row.locator('.order-customer strong')).toContainText('Allan Rabelo Luttembarck');
  await expect(row.locator('.order-device')).toHaveAttribute('title', 'Notebook com descrição extensa para validar contenção');
  await expect(row.locator('.order-client-report')).toHaveAttribute('title', /Relato longo do cliente/);
});

test('layout oferece dois modos, usa Web/PC por padrão e persiste por dispositivo', async ({ page }) => {
  await login(page);
  const selector = page.getByLabel('Layout neste dispositivo');
  await expect(selector).toHaveValue('desktop');
  await expect(selector.locator('option')).toHaveCount(2);
  await expect(selector.locator('option', { hasText: 'Automático' })).toHaveCount(0);
  await selector.selectOption('mobile');
  await expect(page.locator('.shell')).toHaveClass(/layout-mobile/);
  await page.reload();
  await expect(selector).toHaveValue('mobile');
  await selector.selectOption('desktop');
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await page.reload();
  await expect(selector).toHaveValue('desktop');
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'automatic'));
  await page.reload();
  await expect(selector).toHaveValue('desktop');
});

test('Funcionário vê somente operação e o backend continua sendo a autoridade', async ({ page }) => {
  await login(page, 'e2e.funcionario');
  const me = await api(page, '/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('Funcionário');
  const nav = page.locator('aside nav');
  await expect(page.locator('aside').getByRole('button', { name: 'Nova OS' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Financeiro' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Serviços' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Usuários' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Configurações' })).toHaveCount(0);
  expect((await api(page, '/settings')).status).toBe(403);
  expect((await api(page, '/finance/overview')).status).toBe(403);
  expect((await api(page, '/users')).status).toBe(403);
  expect((await api(page, '/catalogs/services', 'POST', {})).status).toBe(403);

  const clients = await api(page, '/clients', 'POST', {
    name: 'Cliente Funcionário E2E', document: '11144477735', phone: '35999999999',
    postal_code: '37160000', street: 'Rua Operacional', number: '6', district: 'Centro',
    city: 'Cidade', state: 'MG',
  });
  expect(clients.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', {
    client_id: clients.body.id, equipment_type_id: equipment.body[0].id,
    attendance_type: 'bench', reported_problem: 'Teste das permissões do funcionário.', checklist: [],
  });
  expect(order.status).toBe(201);
  await page.goto(`/orders/${order.body.id}`);
  await expect(page.getByRole('heading', { name: `OS #${order.body.number}` })).toBeVisible();
  await expect(page.getByRole('button', { name: /Registrar pagamento/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finalizar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reabrir OS' })).toHaveCount(0);
  const orderStatus = page.locator('.status-picker select');
  await expect(orderStatus.locator('option', { hasText: 'Interrompido' })).toHaveCount(0);
  await expect(orderStatus.locator('option', { hasText: 'Finalizado' })).toHaveCount(0);
  expect((await api(page, `/orders/${order.body.id}`, 'DELETE')).status).toBe(403);
  expect((await api(page, `/orders/${order.body.id}/finalize`, 'POST', {})).status).toBe(403);
  expect((await api(page, `/orders/${order.body.id}/reopen`, 'POST', { note: 'retorno' })).status).toBe(403);
  expect((await api(page, `/orders/${order.body.id}/status`, 'PATCH', { status: 'interrupted', interruption_reason: 'pausa' })).status).toBe(403);
  expect((await api(page, `/orders/${order.body.id}/payment`, 'POST', { amount_cents: 100, method: 'pix' })).status).toBe(403);
});

test('Administrador acessa administração permitida sem funções exclusivas do Master', async ({ page }) => {
  await login(page, 'e2e.admin');
  const me = await api(page, '/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('Administrador');
  const nav = page.locator('aside nav');
  await expect(nav.getByRole('button', { name: 'Serviços' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Configurações' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Usuários' })).toHaveCount(0);
  expect((await api(page, '/settings')).status).toBe(200);
  expect((await api(page, '/users')).status).toBe(403);

  await nav.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  const tabs = page.locator('.arl-settings-tabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('button', { name: /Backup e Restauração/ })).toBeHidden();
  await expect(tabs.getByRole('button', { name: /Sistema e Diagnóstico/ })).toBeHidden();
});

test('Financeiro carrega o mês no topo e reaproveita os dados na aba mensal', async ({ page }) => {
  await login(page);
  const monthRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/finance/month') monthRequests.push(request.url());
  });

  await page.locator('aside').getByRole('button', { name: 'Financeiro' }).click();
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
  await expect(page.getByText('RECEBIDO NO MÊS')).toBeVisible();
  await expect.poll(() => monthRequests.length).toBe(2);

  await page.getByRole('button', { name: 'Mensal', exact: true }).click();
  await expect(page.getByText('Faturamento', { exact: true })).toBeVisible();
  expect(monthRequests).toHaveLength(2);
});

test('Financeiro renderiza gráfico com eixos, valores e mais de um dia sem vazar do card', async ({ page }) => {
  await login(page);
  await page.route('**/api/finance/month?period=*', async (route) => {
    await route.fulfill({
      json: {
        period: '2026-09', total_cents: 47500, service_orders_cents: 47500,
        quick_entries_cents: 0, paid_orders: 3, average_ticket_cents: 15833,
        discount_cents: 0, expense_cents: 7500, outflow_cents: 7500, refund_cents: 0, daily: { '2026-09-03': 15000, '2026-09-04': 32500 },
        daily_expenses: { '2026-09-04': 7500 }, expenses: [], refunds: [], methods: {}, transactions: [], items: [],
      },
    });
  });

  await page.locator('aside').getByRole('button', { name: 'Financeiro' }).click();
  const overviewMethods = page.getByRole('heading', { name: 'Formas de pagamento' }).locator('..');
  await expect(overviewMethods.getByText('Dinheiro', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
  const chart = page.getByTestId('daily-revenue-chart');
  await expect(chart).toBeVisible();
  await expect(chart.getByTestId('daily-revenue-column')).toHaveCount(30);
  await expect(chart.locator('.revenue-y-axis span')).toHaveCount(3);
  await expect(chart.locator('.revenue-column').filter({ hasText: 'R$ 150,00' })).toBeVisible();
  await expect(chart.locator('.revenue-column').filter({ hasText: 'R$ 325,00' })).toBeVisible();
  await expect(chart.getByText('03/09/2026', { exact: true })).toBeVisible();
  await expect(chart.getByText('04/09/2026', { exact: true })).toBeVisible();
  const expenseBar = chart.getByTestId('daily-expense-bar');
  await expect(expenseBar).toHaveCount(1);
  await expect(expenseBar).toHaveCSS('background-color', 'rgb(201, 0, 28)');
  await expect(expenseBar).toHaveAttribute('title', /04\/09\/2026 — saída: R\$ 75,00/);
  const reports = page.getByRole('region', { name: 'Indicadores gerenciais' });
  await expect(reports.getByText('Despesas', { exact: true }).locator('..')).toContainText('R$ 75,00');
  await expect(reports.getByText('Lucro Líquido', { exact: true }).locator('..')).toContainText('R$ 400,00');
  await expect(page.getByText('RECEBIDO NO MÊS').locator('..')).toContainText('R$ 475,00');

  const panel = page.getByRole('heading', { name: 'Receita vs Despesas por dia' }).locator('..');
  const [panelBox, chartBox] = await Promise.all([panel.boundingBox(), chart.boundingBox()]);
  expect(panelBox).not.toBeNull();
  expect(chartBox).not.toBeNull();
  expect(chartBox!.x).toBeGreaterThanOrEqual(panelBox!.x);
  expect(chartBox!.x + chartBox!.width).toBeLessThanOrEqual(panelBox!.x + panelBox!.width + 1);
  expect(chartBox!.y + chartBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height + 1);
  const overflow = await chart.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test('seletor de mês troca protagonistas, visão geral e gráfico', async ({ page }) => {
  await login(page);
  await page.route('**/api/finance/month?period=*', async (route) => {
    const period = new URL(route.request().url()).searchParams.get('period');
    const september = period === '2026-09';
    await route.fulfill({ json: {
      period, total_cents: september ? 91000 : 42000, service_orders_cents: september ? 91000 : 42000,
      quick_entries_cents: 0, paid_orders: 1, average_ticket_cents: september ? 91000 : 42000,
      discount_cents: 0, outflow_cents: 0, refund_cents: 0, daily: { [`${period}-01`]: september ? 91000 : 42000 }, methods: {}, transactions: [], expenses: [], refunds: [], items: [],
    }});
  });
  await page.locator('aside').getByRole('button', { name: 'Financeiro' }).click();
  const selector = page.getByLabel('Mês exibido');
  await selector.fill('2026-09');
  await expect(page.getByText('RECEBIDO NO MÊS').locator('..')).toContainText('R$ 910,00');
  const totals = page.getByRole('region', { name: 'Totais do período' });
  await expect(totals.getByText('Total Entradas', { exact: true }).locator('..')).toContainText('R$ 910,00');
  await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
  await expect(page.getByTestId('daily-revenue-chart').getByText('01/09/2026', { exact: true })).toBeVisible();
  await selector.fill('2026-08');
  await expect(page.getByText('RECEBIDO NO MÊS').locator('..')).toContainText('R$ 420,00');
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  await expect(totals.getByText('Total Entradas', { exact: true }).locator('..')).toContainText('R$ 420,00');
  await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
  await expect(page.getByTestId('daily-revenue-chart').getByText('01/08/2026', { exact: true })).toBeVisible();
});

test('Serviços e Produtos cria e edita tipo, preço e garantia adicional', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Serviços', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Serviços e Produtos', exact: true })).toBeVisible();
  const catalog = page.getByTestId('services-page');
  await expect(catalog).toBeVisible();

  await catalog.getByLabel('Nome ou descrição do serviço').fill('Garantia E2E');
  await catalog.getByLabel('Valor em R$').fill('89,90');
  await catalog.getByLabel('Tipo do item').selectOption('product');
  await catalog.getByRole('checkbox', { name: /Garantia adicional/ }).check();
  await catalog.getByLabel('Duração da garantia').fill('6');
  await catalog.getByLabel('Unidade da garantia').selectOption('months');
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/catalogs/services') && response.request().method() === 'POST');
  await catalog.getByRole('button', { name: 'Adicionar', exact: true }).click();
  expect((await createResponsePromise).status()).toBe(201);

  const row = page.locator('.services-row').filter({ hasText: 'Garantia E2E' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Produto');
  await expect(row).toContainText('Garantia 6 meses');

  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Editar serviço ou produto' });
  await expect(modal).toBeVisible();
  await modal.getByLabel('Tipo').selectOption('service');
  await modal.getByLabel('Valor (R$)').fill('99,90');
  await modal.getByLabel('Duração').fill('2');
  await modal.getByLabel('Unidade').selectOption('years');
  const updateResponsePromise = page.waitForResponse((response) => response.url().includes('/api/catalogs/services/') && response.request().method() === 'PATCH');
  await modal.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  expect((await updateResponsePromise).status()).toBe(200);

  await expect(row).toContainText('Serviço');
  await expect(row).toContainText('R$ 99,90');
  await expect(row).toContainText('Garantia 2 anos');
});

test('Configurações usa sanfona exclusiva e salva Garantia Geral', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.getByText('Disponível', { exact: true })).toHaveCount(0);

  const tabs = page.locator('.arl-settings-tabs');
  await expect(tabs).toBeVisible();
  const company = tabs.getByRole('tab', { name: 'Empresa', exact: true });
  const identity = tabs.getByRole('tab', { name: 'Identidade', exact: true });
  const warranty = tabs.getByRole('tab', { name: 'Garantia', exact: true });
  await expect(company).toHaveClass(/active/);
  await identity.click();
  await expect(identity).toHaveClass(/active/);
  await expect(company).not.toHaveClass(/active/);
  await warranty.click();
  await expect(warranty).toHaveClass(/active/);
  await expect(identity).not.toHaveClass(/active/);

  const form = page.locator('form.settings-form');
  await expect(form.locator('[name="layout_mode"]')).toHaveCount(0);
  await expect(page.getByLabel('Layout neste dispositivo')).toBeVisible();
  const toggle = form.getByLabel('Mostrar garantia geral no PDF final');
  await expect(toggle).toBeVisible();
  if (!(await toggle.isChecked())) await toggle.check();
  const text = form.getByLabel('Texto da garantia geral');
  await text.fill('Garantia geral configurada pelo E2E.');

  const save = form.getByRole('button', { name: 'Salvar configurações' });
  const savedResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
  await save.click();
  expect((await savedResponsePromise).status()).toBe(200);
  const saved = await api(page, '/settings');
  expect(saved.body.warranty_general_enabled).toBe('1');
  expect(saved.body.warranty_general_text).toBe('Garantia geral configurada pelo E2E.');
  expect(saved.body.layout_mode).toBeUndefined();

  await text.fill('');
  await toggle.uncheck();
  const resetResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
  await save.click();
  expect((await resetResponsePromise).status()).toBe(200);
  const reset = await api(page, '/settings');
  expect(reset.body.warranty_general_enabled).toBe('0');
});

test('logoff encerra a sessão no Web/PC e leva ao login', async ({ page }) => {
  await login(page);
  await page.locator('aside .profile').getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  expect((await api(page, '/me')).status).toBe(401);
});

test('logoff encerra a sessão pelo menu Mobile/Tablet', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page);
  await page.locator('.menu-toggle').click();
  await page.locator('aside .profile').getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
});
