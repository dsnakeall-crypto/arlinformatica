import { test, expect, type Page } from '@playwright/test';
import { api, login } from './helpers';

async function fixture(page: Page) {
  await login(page);
  const name = 'Banco histórico ' + Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name, active: true, due_day: 10, color: '#2273b9' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Histórico crédito ' + Date.now(), active: true })).body;
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const last = new Date(month + '-01T12:00:00'); last.setMonth(last.getMonth() + 2);
  const end = last.toLocaleDateString('sv-SE').slice(0, 7);
  // The disposable database also contains purchases from earlier E2E scenarios.
  // Compare against that baseline rather than assuming all three months are equal.
  const baseline = await api(page, '/expense-control/spending-history?start=' + month + '&end=' + end + '&person=one');
  expect(baseline.status).toBe(200);
  const debt = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Compra histórica ' + Date.now(), recurrence: 'installments', responsibility: 'shared', percent_one: 50, amount_cents: 10000, installment_count: 3, first_number: 1, start_month: month, due_day: 10 });
  expect(debt.status).toBe(201);
  const operation = await api(page, '/expense-control/operations', 'POST', { request_key: crypto.randomUUID(), installment_ids: debt.body.installments.map((i: any) => i.id), kind: 'advance', target: 'both', paid_by: 2, occurred_on: new Date().toLocaleDateString('sv-SE') });
  expect(operation.status).toBe(201);
  expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Compra pendente ' + Date.now(), recurrence: 'installments', responsibility: 'shared', percent_one: 50, amount_cents: 15000, installment_count: 3, first_number: 1, start_month: month, due_day: 10 })).status).toBe(201);
  return { bank, kind, debt: debt.body, month, end, baseline: baseline.body };
}

test('histórico desktop: consulta real, divisão individual e quitada compacta com pagador', async ({ page }) => {
  const data = await fixture(page);
  await page.goto('/expense-control');
  await page.getByRole('tab', { name: 'Projeção', exact: true }).click();
  await expect(page.locator('.cg-projection-list')).toBeVisible();
  await page.getByRole('button', { name: 'Histórico de gastos', exact: true }).click();
  await page.getByLabel('Mês inicial do histórico').fill(data.month);
  await page.getByLabel('Mês final do histórico').fill(data.end);
  await page.getByLabel('Responsável no histórico').selectOption('one');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  const response = await api(page, '/expense-control/spending-history?start=' + data.month + '&end=' + data.end + '&person=one');
  expect(response.status).toBe(200);
  const report = response.body;
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  expect(report.total_cents).toBe(data.baseline.total_cents + 37500);
  expect(report.advance_cents).toBe(data.baseline.advance_cents + 15000);
  await expect(page.locator('.cg-history-totals article').first()).toContainText(money(report.total_cents));
  await expect(page.locator('.cg-history-month')).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const month = report.months[index];
    const previous = index ? report.months[index - 1].amount_cents : null;
    const change = previous === null ? null : month.amount_cents - previous;
    const percent = previous ? Math.sign(change as number) * Math.round(1000 * Math.abs(change as number) / previous) / 10 : null;
    expect(month.amount_cents).toBe(data.baseline.months[index].amount_cents + 12500);
    expect(month.change_cents).toBe(change);
    expect(month.change_percent).toBe(percent);
    const row = page.locator('.cg-history-month').nth(index);
    await expect(row.locator('strong')).toHaveText(money(month.amount_cents));
    const comparison = change === null ? 'Primeiro mês do período' : change === 0 ? 'Sem mudança'
      : (change > 0 ? '+' : '−') + money(Math.abs(change))
        + (percent === null ? ' · mês anterior sem valor' : ' (' + (percent > 0 ? '+' : '') + percent.toLocaleString('pt-BR') + '%)');
    await expect(row.locator('small')).toHaveText(comparison);
  }
  await expect(page.locator('.cg-history-totals article').last()).toContainText(money(report.advance_cents));
  await page.screenshot({ path: 'output/controle-gasto/historico-desktop.png', fullPage: true });
  await page.getByRole('tab', { name: 'Quitadas', exact: true }).click();
  await page.getByLabel('Pesquisar compra ou instituição').fill(data.debt.debt.name);
  const row = page.locator('.cg-settled-row').filter({ hasText: data.debt.debt.name });
  await expect(row).toContainText('Pago por Carol');
  await expect(row).toContainText('300,00');
  await expect(page.locator('.cg-table-wrap')).toHaveCount(0);
  await page.screenshot({ path: 'output/controle-gasto/quitadas-compactas-desktop.png', fullPage: true });
});

test('mobile documento: projeção sem sobreposição, gastos só em lista e ícones iguais', async ({ page }) => {
  const data = await fixture(page);
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/expense-control');
  await expect(page.locator('.cg-mobile')).toBeVisible();
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.getByLabel('Pesquisar compra ou instituição')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cards', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pesquisar e filtrar', exact: true })).toHaveCount(0);
  const row = page.locator('.cg-bank-list-row').filter({ hasText: data.bank.name });
  await expect(row).toBeVisible();
  await expect(row.locator('img,.cg-card-artwork')).toHaveCount(0);
  expect((await row.boundingBox())!.height).toBeLessThan(100);
  await expect(row.locator('.cg-type-grid')).toHaveCount(0);
  await expect(page.locator('#cg-debt-filters')).toHaveCount(0);
  await expect(page.getByLabel('Filtrar por responsável')).not.toBeVisible();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.screenshot({ path: 'output/controle-gasto/mobile-lista-compacta.png', fullPage: true });
  await page.getByRole('tab', { name: 'Instituições', exact: true }).click();
  const bank = page.locator('article.cg-institution').filter({ hasText: data.bank.name });
  const sizes = await bank.locator('footer>button').evaluateAll(buttons => buttons.map(b => ({ w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })));
  expect(sizes).toHaveLength(3);
  expect(new Set(sizes.map(s => s.w + ':' + s.h)).size).toBe(1);
  await expect(bank.getByRole('button', { name: 'Ver gastos de ' + data.bank.name })).toHaveText('');
  await page.screenshot({ path: 'output/controle-gasto/mobile-instituicoes-icones.png', fullPage: true });
  await page.getByRole('tab', { name: 'Projeção', exact: true }).click();
  const projection = page.locator('.cg-projection-list>.cg-panel').first();
  await expect(projection).toBeVisible();
  const button = await projection.getByRole('button', { name: 'Ver mês' }).boundingBox();
  const breakdown = await projection.locator('dl').boundingBox();
  expect(button!.y).toBeGreaterThanOrEqual(breakdown!.y + breakdown!.height);
  await page.screenshot({ path: 'output/controle-gasto/mobile-projecao-corrigida.png', fullPage: true });
  await page.getByRole('button', { name: 'Histórico de gastos', exact: true }).click();
  await page.getByLabel('Mês inicial do histórico').fill(data.month);
  await page.getByLabel('Mês final do histórico').fill(data.end);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.locator('.cg-history-month')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'output/controle-gasto/mobile-historico-gastos.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  await expect(page.locator('.cg-bank-list')).toBeVisible();
  await expect(page.locator('#cg-debt-filters')).toHaveCount(0);
  await row.locator('button.cg-institution').click();
  await expect(page.locator('.cg-type-grid>.cg-panel').first()).toBeVisible();
  expect((await page.locator('.cg-type-grid>.cg-panel').first().boundingBox())!.height).toBeLessThan(65);
  const typeRow = page.locator('.cgm-type-list>.cg-panel').filter({ hasText: data.kind.name });
  await expect(typeRow.locator('.cg-type-count')).toContainText('1');
  await page.screenshot({ path: 'output/controle-gasto/mobile-tipos-em-lista.png', fullPage: true });
  await typeRow.click();
  await expect(page.locator('.cg-debt-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Voltar aos tipos', exact: true }).click();
  await expect(typeRow).toBeVisible();
  await page.getByRole('button', { name: 'Voltar às instituições', exact: true }).click();
  await expect(row).toBeVisible();
});
