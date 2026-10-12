import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login } from './helpers';

export async function monthlyInvoiceFlow(page: Page, mobile: boolean) {
  await login(page);
  await page.evaluate(mode => localStorage.setItem('arl-layout-mode', mode), mobile ? 'mobile' : 'desktop');
  const stamp = Date.now();
  const month = mobile ? '2001-04' : '2001-03';
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Final ' + stamp, active: true, due_day: 12, color: '#123456' })).body;
  const type = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Cartão ' + stamp, active: true })).body;
  const loan = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Empréstimo ' + stamp, active: true })).body;
  const create = async (responsibility: string, amount_cents: number, name: string, type_id = type.id) => {
    const response = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id, name, recurrence: 'once', responsibility, percent_one: 70, amount_cents, installment_count: 1, first_number: 1, start_month: month, due_day: 12 });
    expect(response.status).toBe(201); return response.body;
  };
  const one = await create('one', 12345, 'Individual Allan ' + stamp);
  await create('two', 23456, 'Individual Carol ' + stamp);
  const shared = await create('shared', 10001, 'Familiar ' + stamp);
  const paid = await create('one', 5000, 'Já quitada ' + stamp, loan.id);
  expect((await api(page, '/expense-control/operations', 'POST', { request_key: crypto.randomUUID(), installment_ids: [paid.installments[0].id], target: 'one', kind: 'payment', paid_by: 1, occurred_on: new Date().toLocaleDateString('sv-SE') })).status).toBe(201);
  await page.goto('/expense-control');
  await page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar mês e ano' });
  await calendar.getByLabel('Ano do controle').selectOption('2001');
  await calendar.getByRole('button', { name: mobile ? 'Abril de 2001' : 'Março de 2001', exact: true }).click();
  await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  await expect(page.locator('.cgo-month .cgo-original')).toHaveText('R$ 458,02');
  await expect(page.locator('.cg-invoice-card').filter({ hasText: loan.name })).toContainText('Quitada — R$ 0,00 pendente');
  await page.getByRole('button', { name: 'Ver total a pagar no mês', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Total a pagar no mês', exact: true });
  const amounts = popup.locator('.cg-exclusive-totals dd');
  await expect(amounts).toHaveText(['R$ 123,45', 'R$ 234,56', 'R$ 100,01', 'R$ 458,02']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const button of await popup.locator('.cg-person-quick-pay').all()) {
    if (await button.evaluate(el => getComputedStyle(el).color) !== 'rgb(25, 132, 70)') {
      const diagnostic = await button.evaluate(el => {
        const matched: { selector: string; color: string; priority: string }[] = [];
        const read = (rules: CSSRuleList) => { for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.style.color && el.matches(rule.selectorText)) matched.push({ selector: rule.selectorText, color: rule.style.color, priority: rule.style.getPropertyPriority('color') });
          else if ('cssRules' in rule) read((rule as CSSGroupingRule).cssRules);
        } };
        for (const sheet of Array.from(document.styleSheets)) read(sheet.cssRules);
        return { root: Array.from(document.documentElement.attributes).map(a => [a.name, a.value]), inline: el.getAttribute('style'), matched };
      });
      console.log('COLOR_DIAGNOSTIC=' + JSON.stringify(diagnostic));
    }
    await expect(button).toHaveCSS('color', 'rgb(25, 132, 70)');
    const bounds = await button.boundingBox(); expect(bounds?.width).toBeGreaterThanOrEqual(44); expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  for (const row of await popup.locator('.cg-exclusive-totals > div:not([data-category="month"])').all()) {
    const rowBox = await row.boundingBox(); const buttonBox = await row.locator('button').boundingBox();
    expect(Math.abs((buttonBox!.x + buttonBox!.width / 2) - (rowBox!.x + rowBox!.width / 2))).toBeLessThanOrEqual(1);
  }
  for (const row of await page.locator('.cgo-due-row.has-quick-pay').all()) {
    const rowBox = await row.boundingBox(); const buttonBox = await row.locator('button').boundingBox();
    expect(Math.abs((buttonBox!.x + buttonBox!.width / 2) - (rowBox!.x + rowBox!.width / 2))).toBeLessThanOrEqual(1);
  }
  if (mobile) for (const title of await page.locator('.cg-invoice-description').all()) expect((await title.boundingBox())?.width).toBeGreaterThan(80);
  const root = 'output/correcoes-finais/' + (mobile ? 'mobile' : 'desktop'); mkdirSync(root, { recursive: true });
  await page.screenshot({ path: root + '/popup.png', fullPage: true });
  for (const [label, name] of [['Allan', 'one'], ['Carol', 'two'], ['Casal', 'shared'], ['Total Fatura', 'month']]) {
    const download = page.waitForEvent('download'); await popup.getByRole('button', { name: 'PDF ' + label, exact: true }).click();
    const file = await download; expect(file.suggestedFilename()).toBe((name === 'month' ? 'fatura-pendente-' : 'controle-gastos-detalhado-') + month + '-' + name + '.pdf'); await file.saveAs(root + '/' + name + '.pdf');
  }
  const preview = await api(page, '/expense-control/debts/' + one.debt.id + '/invoice-payment?' + new URLSearchParams({ scope: 'one', target: 'one', action: 'month', month }));
  expect(preview.status).toBe(200);
  const csrf = await page.request.post('/api/expense-control/debts/' + one.debt.id + '/invoice-payment', { data: {
    scope: 'one', target: 'one', action: 'month', month, request_key: crypto.randomUUID(), preview_hash: preview.body.preview_hash,
    amount_cents: preview.body.total_cents, paid_by: 1, occurred_on: new Date().toLocaleDateString('sv-SE'),
  }, headers: { Accept: 'application/json' } });
  expect(csrf.status()).toBe(419);
  expect((await api(page, '/expense-control/debts/' + one.debt.id)).body.entries).toHaveLength(0);
  const pay = async (category: string, debtName: string, mode: 'month' | 'partial' | 'total', amount?: string, part?: string) => {
    await popup.getByRole('button', { name: 'Pagar Total ' + category, exact: true }).click();
    if (part) await page.getByRole('dialog', { name: 'Qual parte do casal será paga?', exact: true }).getByRole('button', { name: (part === 'Carol' ? 'Parte da ' : 'Parte do ') + part + ' ·', exact: false }).click();
    const payment = page.getByRole('dialog', { name: 'Pagamento rápido de ' + (part || category), exact: true });
    const scope = category === 'Casal' ? 'shared' : category === 'Allan' ? 'one' : 'two';
    const target = (part || category) === 'Carol' ? 'two' : 'one';
    const listed = await api(page, (scope === 'shared' ? '/expense-control/invoice-balances?' : '/expense-control/person-balances?') + new URLSearchParams({ ...(scope === 'shared' ? { scope } : {}), target, month }));
    expect(listed.status).toBe(200); expect(listed.body.debts.every((debt: any) => scope === 'shared' ? debt.responsibility === 'shared' : debt.responsibility === scope || debt.responsibility === 'shared')).toBe(true);
    await expect(payment.locator('.cg-person-debt-choice')).toHaveCount(listed.body.debts.filter((debt: any) => debt.month_remaining_cents > 0).length);
    await expect(payment.locator('.cg-person-debt-choice').filter({ hasText: debtName + ' ' + stamp })).toHaveCount(1);
    await payment.getByRole('button', { name: new RegExp(debtName) }).click();
    await payment.getByRole('button', { name: mode === 'month' ? 'Quitar a fatura do mês' : mode === 'partial' ? 'Pagar parte da fatura do mês' : 'Quitar a dívida inteira', exact: true }).click();
    if (amount) await payment.getByLabel('Valor a pagar (R$)', { exact: true }).fill(amount);
    await payment.getByRole('button', { name: 'Conferir pagamento', exact: true }).click();
    await expect(payment.getByRole('button', { name: 'Confirmar pagamento', exact: true })).toBeVisible();
    await payment.getByRole('button', { name: 'Confirmar pagamento', exact: true }).click();
    await expect(payment).not.toBeVisible(); await expect(popup.locator('.cg-exclusive-totals dd')).toHaveCount(4);
  };
  await pay('Allan', 'Individual Allan', 'partial', '10,05');
  await expect(amounts.nth(0)).toHaveText('R$ 113,40');
  await pay('Casal', 'Familiar', 'partial', '10,01', 'Allan');
  let detail = (await api(page, '/expense-control/debts/' + shared.debt.id)).body;
  expect(detail.installments[0].remaining_one_cents).toBe(6000); expect(detail.installments[0].remaining_two_cents).toBe(3000);
  await pay('Casal', 'Familiar', 'month', undefined, 'Allan');
  detail = (await api(page, '/expense-control/debts/' + shared.debt.id)).body;
  expect(detail.installments[0].remaining_one_cents).toBe(0); expect(detail.installments[0].remaining_two_cents).toBe(3000);
  await expect(amounts.nth(2)).toHaveText('R$ 30,00');
  await pay('Allan', 'Individual Allan', 'month'); await pay('Carol', 'Individual Carol', 'month'); await pay('Casal', 'Familiar', 'month', undefined, 'Carol');
  await expect(amounts).toHaveText(['R$ 0,00', 'R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
  const emptyDownload = page.waitForEvent('download'); await popup.getByRole('button', { name: 'PDF Total Fatura', exact: true }).click(); await (await emptyDownload).saveAs(root + '/zero.pdf');
  await popup.getByRole('button', { name: 'Fechar total do mês', exact: true }).click();
  await expect(page.locator('.cgo-month .cgo-original')).toHaveText('R$ 0,00');
  for (const card of await page.locator('.cg-invoice-card').all()) await expect(card).toContainText('Quitada — R$ 0,00 pendente');
  await page.reload(); await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
  const summary = (await api(page, '/expense-control/summary?month=' + month)).body;
  expect(summary.invoice_totals.total_cents).toBe(0); expect(summary.totals.original_cents).toBe(50802); expect(summary.totals.paid_cents).toBe(50802);
}
