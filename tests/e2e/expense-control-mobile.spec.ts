import { test, expect } from '@playwright/test';
import path from 'node:path';
import { api, login, password } from './helpers';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
async function noOverflow(page: any) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const dialog of await page.getByRole('dialog').all()) expect(await dialog.evaluate((e: HTMLElement) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
}
async function setup(page: any) {
  await login(page);
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Mobile banco ' + stamp, active: true, due_day: 12, color: '#2473b6' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Mobile crédito ' + stamp, active: true })).body;
  return { bank, kind, stamp };
}

test('mobile gastos: conta vinculada abre saldo pessoal e mantém escolha de outras visões', async ({ page }) => {
  await login(page);
  const config = (await api(page, '/expense-control/configuration')).body;
  const people = config.people.map((p: any) => ({ id: p.id, name: p.name, default_percent: p.default_percent, user_id: p.user_id }));
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  try {
    for (const id of [1, 2]) {
      expect((await api(page, '/expense-control/people', 'PUT', { people: people.map((p: any) => ({ ...p, user_id: p.id === id ? config.account_id : null })) })).status).toBe(200);
      await page.goto('/expense-control');
      await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
      const summary = (await api(page, '/expense-control/summary?month=' + month)).body;
      await expect(page.locator('.cgm-person').nth(id - 1)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.cgm-total>strong')).toHaveText(money(summary.views[id === 1 ? 'one' : 'two'].remaining_cents));
      await expect(page.locator('.cgm-total')).toContainText(people[id - 1].name + ' · falta pagar');
      await page.getByRole('button', { name: 'Todos', exact: true }).click();
      await expect(page.locator('.cgm-total>strong')).toHaveText(money(summary.totals.remaining_cents));
      await page.reload();
      await expect(page.locator('.cgm-person').nth(id - 1)).toHaveAttribute('aria-pressed', 'true');
      await page.screenshot({ path: 'output/controle-gasto/mobile-vinculo-' + id + '.png', fullPage: true });
    }
  } finally { expect((await api(page, '/expense-control/people', 'PUT', { people })).status).toBe(200); }
});

test('mobile gastos: OCR no aparelho funciona sem subtle e sem randomUUID', async ({ page }) => {
  test.setTimeout(150000);
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });
  });
  await setup(page);
  await page.goto('/expense-control');
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastrar por foto' }).click();
  const photo = page.getByRole('dialog');
  await photo.getByLabel('Foto da fatura', { exact: true }).setInputFiles(path.resolve('tests/fixtures/expense-invoice.png'));
  await photo.getByRole('button', { name: 'Ler compras', exact: true }).click();
  await expect(photo.getByRole('heading', { name: 'Confira as compras reconhecidas' })).toBeVisible({ timeout: 120000 });
  await expect(photo.locator('.cg-photo-row')).toHaveCount(2);
  await expect(photo.getByLabel('Valor da parcela da compra 1', { exact: true })).toHaveValue('120,50');
  await noOverflow(page);
});

test('mobile gastos: quatro ícones, resumo correto das partes, instituição, mês e parcelas tocáveis', async ({ page }) => {
  const { bank, kind } = await setup(page);
  for (const [responsibility, amount_cents] of [['one', 10000], ['two', 20000], ['shared', 30000]] as const) {
    expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Mobile compra ' + responsibility, recurrence: 'installments', responsibility, percent_one: 50, amount_cents, installment_count: 2, first_number: 1, start_month: '2028-05', due_day: 12 })).status).toBe(201);
  }
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(nav.locator('button')).toHaveCount(4);
  await expect(nav.locator('button span')).toHaveCount(0);
  await nav.getByRole('button', { name: 'Controle de Gasto' }).click();
  await expect(page.getByRole('region', { name: 'Resumo financeiro mobile' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ajustes', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Histórico', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar mês e ano' });
  await calendar.getByLabel('Ano do controle').selectOption('2028');
  await calendar.getByRole('button', { name: 'Maio de 2028', exact: true }).click();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  const summary = (await api(page, '/expense-control/summary?month=2028-05')).body;
  await expect(page.locator('.cgm-total>strong')).toHaveText(money(summary.totals.remaining_cents));
  for (const [index, key] of ['one', 'two', 'shared'].entries()) await expect(page.locator('.cgm-person>strong').nth(index)).toHaveText(money(summary.totals[key + '_remaining_cents']));
  const institution = page.locator('.cg-invoice-card').filter({ hasText: bank.name });
  await expect(institution).toContainText('R$ 600,00');
  await expect(institution).toContainText('12/05');
  await expect(page.locator('.cgm-person>strong').first()).toHaveText(money(summary.totals.one_remaining_cents));
  await expect(page.locator('.cgm-person>strong').nth(1)).toHaveText(money(summary.totals.two_remaining_cents));
  await page.screenshot({ path: 'output/controle-gasto/mobile-resumo-novo.png', fullPage: true });
  await noOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 }); await noOverflow(page);
  await page.setViewportSize({ width: 768, height: 1024 }); await noOverflow(page);
  await page.screenshot({ path: 'output/controle-gasto/tablet-resumo.png', fullPage: true });
  for (const label of ['Gastos', 'Instituições', 'Pagamentos', 'Projeção', 'Quitadas', 'Resumo']) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByText('Atualizando informações…')).not.toBeVisible(); await noOverflow(page);
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await page.locator('.cgm-person').first().click();
  // Personal totals change; the complete monthly invoice intentionally includes both people.
  await expect(institution.locator('strong')).toHaveText('R$ 600,00');
  await page.setViewportSize({ width: 393, height: 1600 });
  await institution.scrollIntoViewIfNeeded();
  await institution.screenshot({ path: 'output/controle-gasto/mobile-instituicao-compacta.png' });
  await page.setViewportSize({ width: 393, height: 851 });
  await institution.click();
  await expect(page.getByLabel('Filtrar por responsável')).toHaveCount(0);
  await page.locator('.cg-type-grid button').filter({ hasText: kind.name }).click();
  await page.locator('.cg-debt-row').filter({ hasText: 'Mobile compra shared' }).click();
  await expect(page.locator('.cg-table-wrap tbody tr')).toHaveCount(2);
  await noOverflow(page);
  await page.screenshot({ path: 'output/controle-gasto/mobile-parcelas.png', fullPage: true });
  await page.locator('.cg-table-wrap tbody tr').first().getByRole('button', { name: 'Pagar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Registrar pagamento ou abatimento' })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Fechar formulário de gasto' }).click();
  await nav.getByRole('button', { name: 'OS abertas', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Início mobile com Ordens de Serviço abertas' })).toBeVisible();
});

test('mobile gastos: nova dívida escolhe cadastro manual ou foto IA com revisão antes de salvar', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });
  });
  const { bank, kind, stamp } = await setup(page);
  await page.goto('/expense-control');
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastro manual' }).click();
  const manual = page.getByRole('dialog', { name: 'Cadastrar nova dívida' });
  await manual.getByLabel('Nome da dívida ou compra').fill('Manual mobile ' + stamp);
  await manual.getByRole('combobox', { name: 'Instituição', exact: true }).selectOption(String(bank.id));
  await manual.getByRole('combobox', { name: 'Tipo de dívida', exact: true }).selectOption(String(kind.id));
  await manual.getByLabel('Quem paga esta fatura?').selectOption('one');
  await manual.getByLabel('Valor de cada parcela (R$)').fill('12345');
  await noOverflow(page);
  await manual.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(manual).not.toBeVisible();
  const usage = { enabled: true, provider: 'mistral', label: 'Mistral', model: 'test', monthly_reads: 20, used_reads: 0, monthly_micro_usd: 1000000, used_micro_usd: 0 };
  await page.route('**/api/expense-control/photo-ai', route => route.fulfill({ json: usage }));
  let reads = 0;
  await page.route('**/api/expense-control/photo-ai/read', route => { reads++; return route.fulfill({ json: { purchases: [{ name: 'Foto mobile ' + stamp, amount_cents: 34567, first_number: 2, installment_count: 5, purchased_on: '2026-09-12', warnings: [], duplicate: false, source_line: '' }], warnings: [], source_hash: 'a'.repeat(64), replayed: false, usage } }); });
  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastrar por foto' }).click();
  const photo = page.getByRole('dialog');
  await photo.getByLabel('Foto da fatura', { exact: true }).setInputFiles(path.resolve('tests/fixtures/expense-invoice.png'));
  await expect(photo.getByRole('button', { name: 'Ler com Mistral', exact: true })).toBeDisabled();
  await photo.getByLabel(/Autorizo enviar esta foto/).check();
  await photo.getByRole('button', { name: 'Ler com Mistral', exact: true }).click();
  await expect(photo.getByRole('heading', { name: 'Confira as compras reconhecidas' })).toBeVisible();
  expect(reads).toBe(1);
  await photo.getByLabel('Selecionar cartão geral', { exact: true }).selectOption(String(bank.id));
  await photo.getByLabel('Selecionar tipo de dívida', { exact: true }).selectOption(String(kind.id));
  await photo.getByLabel('Responsável pela compra 1', { exact: true }).selectOption('two');
  await expect(photo.getByRole('button', { name: 'Salvar 1 compra' })).toBeDisabled();
  await photo.getByLabel('Conferi a compra 1', { exact: true }).check();
  await noOverflow(page);
  await page.screenshot({ path: 'output/controle-gasto/mobile-foto-revisao.png', fullPage: true });
  const saved = page.waitForResponse(r => r.url().endsWith('/photo-imports') && r.request().method() === 'POST');
  await photo.getByRole('button', { name: 'Salvar 1 compra' }).click();
  expect((await saved).status()).toBe(201);
  await expect(photo).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile gastos: perfil exclusivo continua restrito e funcionário não ganha acesso', async ({ page }) => {
  await login(page);
  const roles = (await api(page, '/users')).body.roles;
  for (const role of ['Controle de Gasto', 'Funcionário']) {
    const loginName = 'mobile-role-' + Date.now();
    expect((await api(page, '/users', 'POST', { name: 'Mobile ' + role, login: loginName, password, password_confirmation: password, active: true, role_id: roles.find((r: any) => r.name === role).id })).status).toBe(201);
    await page.evaluate(async () => { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' } }); });
    await page.goto('/login');
    expect(await page.evaluate(async ({ loginName, password }) => {
      const r = await fetch('/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' }, body: JSON.stringify({ login: loginName, password }) }); return r.status;
    }, { loginName, password })).toBe(200);
    await page.reload();
    if (role === 'Controle de Gasto') {
      await expect(page.getByRole('region', { name: 'Resumo financeiro mobile' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nova OS', exact: true })).toHaveCount(0);
      expect((await api(page, '/orders')).status).toBe(403);
    } else {
      await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' }).locator('button')).toHaveCount(3);
      expect((await api(page, '/expense-control/summary?month=2026-10')).status).toBe(403);
    }
    await page.evaluate(async () => { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' } }); });
    await login(page);
  }
});
