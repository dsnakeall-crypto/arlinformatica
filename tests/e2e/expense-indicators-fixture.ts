import { expect, type Page } from '@playwright/test';
import { api } from './helpers';

/** Exemplo obrigatório do plano 09/10/2026 em mês isolado: Allan R$1.000, Carol R$500, Casal R$400 (300/100). */
export const INDICATOR_MONTH = '2033-03';
export const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export async function createOwnerExample(page: Page) {
  // Outras suítes podem deixar despesas mensais recorrentes no mesmo banco descartável: medimos o exemplo como diferença.
  const before = (await api(page, '/expense-control/summary?month=' + INDICATOR_MONTH)).body.totals;
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Indicadores ' + stamp, active: true, due_day: 15, color: '#2473b6' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Indicadores tipo ' + stamp, active: true })).body;
  const base = { institution_id: bank.id, type_id: kind.id, recurrence: 'installments', installment_count: 1, first_number: 1, start_month: INDICATOR_MONTH, due_day: 15 };
  const created = [] as any[];
  for (const extra of [
    { name: 'Allan pessoal', responsibility: 'one', percent_one: 100, amount_cents: 100000 },
    { name: 'Carol pessoal', responsibility: 'two', percent_one: 0, amount_cents: 50000 },
    { name: 'Casal 300/100', responsibility: 'shared', percent_one: 50, amount_cents: 40000, split_mode: 'amount', share_one_cents: 30000, share_two_cents: 10000 },
  ]) {
    const response = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), ...base, ...extra });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    created.push(response.body);
  }
  const pay = async (installment: number, extra: Record<string, unknown>) => {
    const response = await api(page, '/expense-control/operations', 'POST', { request_key: crypto.randomUUID(), installment_ids: [installment], kind: 'payment', target: 'one', paid_by: 1, occurred_on: new Date().toLocaleDateString('sv-SE'), amount_cents: null, notes: null, ...extra });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  };
  await pay(created[0].installments[0].id, { kind: 'advance', amount_cents: 20000 });
  await pay(created[1].installments[0].id, { target: 'two', paid_by: 2, amount_cents: 10000 });
  return { bank, kind, before };
}

export async function openMonth(page: Page) {
  await page.goto('/expense-control');
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar mês e ano' });
  await calendar.getByLabel('Ano do controle').selectOption('2033');
  await calendar.getByRole('button', { name: 'Março de 2033', exact: true }).click();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
}

export async function assertOwnerExample(page: Page, before: Record<string, number>) {
  const b = (key: string) => Number(before[key] || 0);
  const indicators = page.getByRole('region', { name: 'Indicadores do mês' });
  await expect(indicators.locator('.cgo-indicator')).toHaveCount(5);
  const expectCard = async (key: string, original: number, remaining: number) => {
    const card = indicators.locator('.cgo-' + key);
    await expect(card.locator('.cgo-original')).toContainText(brl(key === 'month' ? remaining : original));
    await expect(card.locator('.cgo-original .cgo-tag')).toHaveCount(0);
    if(key === 'month') await expect(card.locator('.cgo-remaining')).toHaveCount(0);
    else {
      await expect(card.locator('.cgo-remaining b')).toHaveText(brl(remaining));
      await expect(card.locator('.cgo-remaining span')).toHaveText('Falta pagar');
    }
  };
  const statement = (await api(page, '/expense-control/summary?month=' + INDICATOR_MONTH)).body;
  expect(statement.totals.original_cents).toBe(b('original_cents') + 190000);
  expect(statement.totals.remaining_cents).toBe(b('remaining_cents') + 160000);
  expect(statement.invoice_totals.total_cents).toBe(statement.totals.remaining_cents);
  await expectCard('month', b('original_cents') + 190000, b('remaining_cents') + 160000);
  await expectCard('one', b('one_original_cents') + 130000, b('one_remaining_cents') + 110000);
  await expectCard('two', b('two_original_cents') + 60000, b('two_remaining_cents') + 50000);
  await expectCard('shared', b('shared_original_cents') + 40000, b('shared_remaining_cents') + 40000);
  if (!before.next_due_on || String(before.next_due_on) >= '2033-03-15') await expect(indicators.locator('.cgo-next .cgo-date')).toHaveText('15/03/2033');
  const person = (key: string) => page.locator('.cgo-person-' + key + ' dd');
  await expect(person('one')).toHaveText([brl(b('one_personal_original_cents') + 100000), brl(b('one_shared_original_cents') + 30000), brl(b('one_credited_cents') + 20000), brl(b('one_original_cents') + 130000), brl(b('one_remaining_cents') + 110000)]);
  await expect(person('two')).toHaveText([brl(b('two_personal_original_cents') + 50000), brl(b('two_shared_original_cents') + 10000), brl(b('two_credited_cents') + 10000), brl(b('two_original_cents') + 60000), brl(b('two_remaining_cents') + 50000)]);
  await expect(page.locator('.cgo-person')).toHaveCount(2);
  await expect(page.locator('.cg-person-card.cg-shared, .cg-summary-filter, .cgm-person')).toHaveCount(0);
}
