import { test, expect } from '@playwright/test';
import { api, login, password } from './helpers';

async function catalogs(page: any, stamp: string) {
  const institution = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Cartão CG ' + stamp, active: true, due_day: 12, color: '#c9002c' });
  expect(institution.status).toBe(200);
  const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Crédito CG ' + stamp, active: true });
  expect(type.status).toBe(200);
  return { institution: institution.body, type: type.body };
}

test('controle: cadastro manual, parte individual, lote, quitadas e retorno aos módulos existentes', async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString();
  const catalog = await catalogs(page, stamp);
  await page.getByRole('button', { name: 'Controle de Gasto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cadastrar nova dívida', exact: true });
  await dialog.getByLabel('Nome da dívida ou compra').fill('Geladeira CG ' + stamp);
  await dialog.getByRole('combobox', { name: 'Instituição', exact: true }).selectOption({ label: catalog.institution.name });
  await dialog.getByRole('combobox', { name: 'Tipo de dívida', exact: true }).selectOption({ label: catalog.type.name });
  await dialog.getByLabel('Quem paga esta fatura?').selectOption('shared');
  await dialog.getByLabel('Valor de cada parcela (R$)').fill('10001');
  await dialog.getByLabel('Quantidade total de parcelas').fill('2');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.locator('.cg-institution').filter({ hasText: catalog.institution.name }).click();
  await page.locator('.cg-type-grid button').filter({ hasText: catalog.type.name }).click();
  await page.locator('.cg-debt-row').filter({ hasText: 'Geladeira CG ' + stamp }).click();
  await expect(page.locator('.cg-table-wrap tbody tr')).toHaveCount(2);
  await page.locator('.cg-table-wrap tbody tr').first().getByRole('button', { name: 'Pagar', exact: true }).click();
  const payment = page.getByRole('dialog', { name: 'Registrar pagamento ou abatimento' });
  await payment.getByRole('button', { name: /Quitar parte de Allan/ }).click();
  await payment.getByLabel('Quem efetivamente pagou?').selectOption('1');
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  await expect(page.locator('.cg-table-wrap tbody tr').first()).toContainText('Parcial');
  await page.getByRole('button', { name: 'Selecionar pendentes' }).click();
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await payment.getByLabel('Quem efetivamente pagou?').selectOption('2');
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  await expect(page.locator('.cg-table-wrap .cg-status-paid')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Quitadas', exact: true }).click();
  await page.getByLabel('Pesquisar compra ou instituição').fill('Geladeira CG ' + stamp);
  await expect(page.locator('.cg-debt-row').filter({ hasText: 'Geladeira CG ' + stamp })).toBeVisible();
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço', exact: true })).toBeVisible();
});

test('controle: quitar Allan mantém Carol pendente no resumo e aceita pagamento parcial', async ({ page }) => {
  await login(page);
  const catalog = await catalogs(page, 'pagamento-' + Date.now());
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const created = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: catalog.institution.id, type_id: catalog.type.id, name: 'Parcela casal 350', recurrence: 'once', responsibility: 'shared', percent_one: 50, amount_cents: 35000, installment_count: 1, first_number: 1, start_month: month, due_day: 12, notes: null });
  expect(created.status).toBe(201);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.getByLabel('Pesquisar compra ou instituição').fill('Parcela casal 350');
  await page.locator('.cg-debt-row').filter({ hasText: 'Parcela casal 350' }).click();
  await page.locator('.cg-table-wrap tbody tr').getByRole('button', { name: 'Pagar', exact: true }).click();
  const payment = page.getByRole('dialog', { name: 'Registrar pagamento ou abatimento' });
  await payment.getByRole('button', { name: /Quitar parte de Allan/ }).click();
  await expect(payment.locator('.cg-payment-preview strong')).toContainText('175,00');
  await expect(payment.locator('.cg-payment-split article').last()).toContainText('175,00');
  await page.screenshot({ path: 'output/controle-gasto/pagamento-parte.png', fullPage: true });
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
  const partial = page.locator('.cg-partial-summary>article').filter({ hasText: 'Parcela casal 350' });
  await expect(partial).toContainText('Parte quitada');
  await expect(partial).toContainText('Falta R$ 175,00');
  await page.screenshot({ path: 'output/controle-gasto/resumo-parcial.png', fullPage: true });
  await partial.getByRole('button', { name: 'Ver parcela' }).click();
  await page.locator('.cg-table-wrap tbody tr').getByRole('button', { name: 'Pagar', exact: true }).click();
  await payment.getByRole('button', { name: /Pagar valor parcial/ }).click();
  await payment.getByLabel('Qual parte será abatida?').selectOption('two');
  await payment.getByLabel('Quem efetivamente pagou?').selectOption('2');
  await payment.getByLabel('Valor a registrar (R$)').fill('5000');
  await expect(payment.locator('.cg-payment-split article').last()).toContainText('125,00');
  await payment.getByRole('button', { name: 'Confirmar lançamento' }).click();
  await expect(payment).not.toBeVisible();
  const detail = (await api(page, '/expense-control/debts/' + created.body.debt.id)).body;
  expect(detail.installments[0].remaining_one_cents).toBe(0);
  expect(detail.installments[0].remaining_two_cents).toBe(12500);
});

test('controle: filtro de responsável preserva cartões e contagens por tipo', async ({ page }) => {
  await login(page);
  const catalog = await catalogs(page, 'contagem-' + Date.now());
  const emptyType = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Empréstimo vazio ' + Date.now(), active: true })).body;
  for (const responsibility of ['one', 'two', 'shared']) {
    expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: catalog.institution.id, type_id: catalog.type.id, name: 'Compra ' + responsibility, recurrence: 'installments', responsibility, percent_one: responsibility === 'one' ? 100 : responsibility === 'two' ? 0 : 50, amount_cents: 35000, installment_count: 3, first_number: 1, start_month: new Date().toLocaleDateString('sv-SE').slice(0, 7), due_day: 12, notes: null })).status).toBe(201);
  }
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.getByLabel('Filtrar por responsável', { exact: true }).selectOption('one');
  const card = page.locator('.cg-bank-grid .cg-institution').filter({ hasText: catalog.institution.name });
  await expect(card.locator('.cg-institution-counts>div').filter({ hasText: catalog.type.name }).locator('b')).toHaveText('2');
  await expect(page.locator('.cg-debt-row')).toHaveCount(0);
  await page.screenshot({ path: 'output/controle-gasto/instituicoes-contagens.png', fullPage: true });
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  const row = page.locator('.cg-bank-list-row').filter({ has: page.getByRole('heading', { name: catalog.institution.name, exact: true }) });
  await expect(row.locator('.cg-type-grid button').filter({ hasText: catalog.type.name }).locator('.cg-type-count')).toContainText('2');
  await page.screenshot({ path: 'output/controle-gasto/instituicoes-lista.png', fullPage: true });
  await row.locator('.cg-institution').click();
  await expect(page.getByLabel('Filtrar por responsável' , { exact: true })).toHaveValue('one');
  const typeCard = page.locator('.cg-type-grid button').filter({ hasText: catalog.type.name });
  await expect(typeCard.locator('.cg-type-count')).toContainText('2');
  await expect(page.locator('.cg-type-grid button').filter({ hasText: emptyType.name }).locator('.cg-type-count')).toContainText('0');
  await page.screenshot({ path: 'output/controle-gasto/tipos-contagens.png', fullPage: true });
  await typeCard.click();
  await expect(page.locator('.cg-debt-row')).toHaveCount(2);
  await expect(page.locator('.cg-debt-row').filter({ hasText: 'Compra two' })).toHaveCount(0);
});

test('controle: resumo alterna responsáveis e projeção oferece lista e cards', async ({ page }) => {
  await login(page);
  await page.goto('/expense-control');
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  const month = await page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true }).getAttribute('data-month');
  const data = (await api(page, '/expense-control/summary?month=' + month)).body;
  const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
  for (const [name, key] of [['Allan', 'one'], ['Carol', 'two'], ['Casal', 'shared']]) {
    await page.locator('.cg-summary-filter').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.cg-metrics article').nth(0).locator('strong')).toHaveText(money(data.views[key].remaining_cents));
    await expect(page.locator('.cg-metrics article').nth(2).locator('strong')).toHaveText(money(data.views[key].paid_cents));
  }
  await expect(page.getByRole('button', { name: 'Meu resumo', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'output/controle-gasto/resumo-seletores.png', fullPage: true });
  await page.getByRole('tab', { name: 'Projeção', exact: true }).click();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await expect(page.locator('.cg-projection-list>article')).toHaveCount(12);
  await page.screenshot({ path: 'output/controle-gasto/projecao-lista.png', fullPage: true });
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(page.locator('.cg-projection-list')).toHaveCount(0);
  await expect(page.locator('.cg-projection-grid>article')).toHaveCount(12);
  await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
  await page.getByRole('tab', { name: 'Projeção', exact: true }).click();
  await expect(page.locator('.cg-projection-list>article')).toHaveCount(12);
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('controle: perfil exclusivo não vê nem acessa dados da empresa', async ({ page }) => {
  await login(page);
  const roles = (await api(page, '/users')).body.roles;
  const loginName = 'cg.' + Date.now();
  const user = await api(page, '/users', 'POST', { name: 'Responsável CG', login: loginName, email: null, password, password_confirmation: password, active: true, role_id: roles.find((r: any) => r.name === 'Controle de Gasto').id });
  expect(user.status).toBe(201);
  await page.evaluate(async () => { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' } }); });
  await page.goto('/login');
  const response = await page.evaluate(async ({ loginName, password }) => { const r = await fetch('/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' }, body: JSON.stringify({ login: loginName, password }) }); return r.status; }, { loginName, password });
  expect(response).toBe(200);
  await page.goto('/orders/999');
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await expect(page.locator('aside nav button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Nova OS', exact: true })).toHaveCount(0);
  for (const path of ['/clients', '/orders', '/finance/overview', '/suppliers', '/settings', '/notifications']) expect((await api(page, path)).status).toBe(403);
  await expect(page.locator('main')).not.toContainText('não foi possível');
});

test('controle: visual desktop e mobile sem vazamento de layout nos popups', async ({ page }) => {
  await login(page);
  await catalogs(page, 'visual-' + Date.now());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/expense-control');
  await expect(page.getByRole('heading', { name: 'Visão geral do casal', exact: true })).toBeVisible();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await expect(page.getByRole('tab', { name: 'Visão geral', exact: true })).toHaveCount(0);
  const month = page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true });
  await month.click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar mês e ano' });
  await calendar.getByLabel('Ano do controle').selectOption('2026');
  await page.screenshot({ path: 'output/controle-gasto/calendario-compacto.png', fullPage: true });
  await calendar.getByRole('button', { name: 'Dezembro de 2026', exact: true }).click();
  await expect(month).toHaveText('12/2026');
  await expect(calendar).not.toBeVisible();
  await page.getByRole('button', { name: 'Próximo mês do controle' }).click();
  await expect(month).toHaveAttribute('data-month', '2027-01');
  await page.getByRole('button', { name: 'Mês anterior do controle' }).click();
  await expect(month).toHaveAttribute('data-month', '2026-12');
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/resumo-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cadastrar nova dívida' })).toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/cadastro-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Fechar formulário de gasto' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Controle de Gasto', exact: true })).toBeVisible();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'output/controle-gasto/resumo-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cadastrar nova dívida' });
  await expect(dialog.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/cadastro-mobile.png', fullPage: true });
});


test('controle: pagamento da instituição simula distribuição e confirma sem baixar a outra pessoa', async ({ page }) => {
  await login(page);
  const catalog = await catalogs(page, 'instituicao-' + Date.now());
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  for (const item of [{ name: 'Casal instituição', responsibility: 'shared', amount_cents: 160000 }, { name: 'Pessoal instituição', responsibility: 'one', amount_cents: 40000 }]) {
    const r = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: catalog.institution.id, type_id: catalog.type.id, recurrence: 'once', percent_one: 50, installment_count: 1, first_number: 1, start_month: month, due_day: 12, notes: null, ...item });
    expect(r.status).toBe(201);
  }
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.locator('.cg-institution').filter({ hasText: catalog.institution.name }).click();
  await page.getByRole('button', { name: 'Pagar valor da fatura', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Pagar valor da fatura', exact: true });
  await modal.getByLabel('Valor do pagamento (R$)').fill('80000');
  await modal.getByRole('button', { name: 'Simular distribuição' }).click();
  await expect(modal.locator('.cg-institution-allocation article')).toHaveCount(2);
  await expect(modal.locator('.cg-institution-allocation article').first()).toContainText('Pessoal instituição');
  await expect(modal.locator('.cg-payment-split article').last()).toContainText('400,00');
  await page.screenshot({ path: 'output/controle-gasto/pagamento-instituicao.png', fullPage: true });
  await modal.getByRole('button', { name: 'Confirmar pagamento da fatura' }).click();
  await expect(modal).not.toBeVisible();
  const summary = await api(page, '/expense-control/summary?month=' + month);
  const bank = summary.body.views.one.institutions.find((i: any) => i.id === catalog.institution.id);
  expect(bank.remaining_cents).toBe(40000);
  expect(summary.body.views.two.institutions.find((i: any) => i.id === catalog.institution.id).remaining_cents).toBe(80000);
  await page.locator('.cg-type-grid button').filter({ hasText: catalog.type.name }).click();
  await page.locator('.cg-debt-row').filter({ hasText: 'Casal instituição' }).click();
  expect((await page.locator('.cg-debt-header').boundingBox())!.height).toBeLessThan(200);
  await page.screenshot({ path: 'output/controle-gasto/compra-compacta.png', fullPage: true });
  await page.getByRole('button', { name: 'Editar identificação' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar identificação da dívida' });
  await edit.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(edit.getByText('Confirma esta alteração?')).toBeVisible();
  await edit.getByRole('button', { name: 'Confirmar alteração' }).click();
  await expect(edit).not.toBeVisible();
  await page.getByRole('button', { name: 'Excluir dívida', exact: true }).click();
  const removal = page.getByRole('dialog', { name: 'Excluir dívida' });
  await removal.getByLabel('Motivo').fill('Cadastro de teste incorreto');
  await removal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(removal.getByText('Confirma excluir esta dívida?')).toBeVisible();
  await removal.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(removal).not.toBeVisible();
});


test('controle: Gastos memoriza lista/cards separadamente por conta neste navegador', async ({ page }) => {
  await login(page);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const roles = (await api(page, '/users')).body.roles;
  const loginName = 'cg.view.' + Date.now();
  const user = await api(page, '/users', 'POST', { name: 'Preferência independente', login: loginName, email: null, password, password_confirmation: password, active: true, role_id: roles.find((r: any) => r.name === 'Controle de Gasto').id });
  expect(user.status).toBe(201);
  const logout = async () => { await page.evaluate(async () => { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' } }); }); };
  await logout();
  await login(page, loginName);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cards', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await logout();
  await login(page);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
