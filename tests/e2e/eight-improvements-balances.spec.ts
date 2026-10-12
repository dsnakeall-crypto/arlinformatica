import { test, expect } from '@playwright/test';
import { api, login, openExpenseSection } from './helpers';

for (const width of [1366, 390]) test(`saldos e parcelas pessoais preservados em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(mobile => localStorage.setItem('arl-layout-mode', mobile ? 'mobile' : 'desktop'), width === 390);
  await login(page);
  const stamp = Date.now();
  const bank = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Totais ' + stamp, active: true, due_day: 12, color: '#123456' });
  expect(bank.status).toBe(200);
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const name = 'Pessoal ' + stamp;
  let firstType: number | undefined;
  for (let index = 0; index < 8; index++) {
    const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Tipo ' + stamp + ' ' + index, active: true });
    expect(type.status).toBe(200); firstType ??= type.body.id;
    const debt = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.body.id, type_id: type.body.id,
      name: index === 0 ? name : name + ' ' + index, recurrence: 'once', responsibility: 'one', percent_one: 100, amount_cents: 10000, installment_count: 1, first_number: 1, start_month: month, due_day: 12,
      notes: index === 0 ? 'Importado por foto\nCadastro por foto. Dados conferidos pelo usuário. Observação manual preservada' : null });
    expect(debt.status, JSON.stringify(debt.body)).toBe(201);
  }
  const future = new Date(); future.setDate(1); future.setMonth(future.getMonth() + 1);
  expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.body.id, type_id: firstType,
    name: 'Somente futuro ' + stamp, recurrence: 'installments', responsibility: 'one', percent_one: 100, amount_cents: 10000, installment_count: 2, first_number: 1,
    start_month: future.toLocaleDateString('sv-SE').slice(0, 7), due_day: 12, notes: null })).status).toBe(201);
  await page.goto('/expense-control'); if (width > 1000) await page.mouse.move(width - 10, 10);
  await openExpenseSection(page, 'Gastos');
  const card = page.locator('.cg-institution').filter({ hasText: bank.body.name });
  await expect(card.locator('.cg-institution-total-due')).toContainText('1.000,00');
  if (width > 1000) {
    const counts = card.locator('.cg-institution-counts');
    await expect(counts).toBeVisible();
    expect(await counts.evaluate(element => ({ scroll: element.scrollHeight, client: element.clientHeight, overflow: getComputedStyle(element).overflowY }))).toEqual(expect.objectContaining({ overflow: 'visible' }));
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.locator('.cg-institution').filter({ hasText: bank.body.name }).locator('.cg-institution-total-due')).toContainText('1.000,00');
  }
  await page.locator('.cg-institution').filter({ hasText: bank.body.name }).click();
  await page.locator('.cg-type-grid button').filter({ hasText: 'Tipo ' + stamp + ' 0' }).click();
  const purchase = page.locator('.cg-debt-row').filter({ has: page.getByText(name, { exact: true }) });
  await expect(purchase).toContainText('Observação manual preservada');
  await expect(purchase).not.toContainText('Importado por foto');
  await expect(purchase).not.toContainText('Dados conferidos pelo usuário');
  await expect(purchase.locator('.cg-debt-figures')).toContainText('Valor cadastrado');
  await expect(purchase.locator('.cg-debt-figures')).toContainText('Parcela do mês');
  await expect(purchase.locator('.cg-debt-figures')).toContainText('Pago no mês');
  await expect(purchase.locator('.cg-debt-figures')).toContainText('Pendente no mês');
  expect((await purchase.boundingBox())!.height).toBeLessThanOrEqual(width < 700 ? 170 : 130);
  await expect(purchase).toHaveCSS('padding-top', '8px');
  await page.screenshot({path:`output/pacote-final/compra-${width}.png`,fullPage:true});
  await purchase.click();
  const edit = page.getByRole('button',{name:'Editar identificação',exact:true});
  const remove = page.getByRole('button',{name:'Excluir dívida',exact:true});
  const editBox=await edit.boundingBox(), removeBox=await remove.boundingBox();
  expect(Math.abs(editBox!.y-removeBox!.y)).toBeLessThanOrEqual(1);
  expect(removeBox!.x).toBeGreaterThan(editBox!.x);

  const row = page.locator('.cg-table-wrap tbody tr').first();
  await expect(row.locator('.cg-installment-name')).toContainText(name);
  await expect(row.locator('.cg-installment-origin').first()).toContainText(bank.body.name);
  await expect(row.locator('td').nth(3)).toBeVisible();
  await expect(row.locator('td').nth(4)).toBeHidden();
  await expect(page.getByText('Cadastro por foto. Dados conferidos pelo usuário.', { exact: false })).toHaveCount(0);
  await expect(row.getByText('Observação manual preservada', { exact: true })).toBeVisible();
  expect(await row.locator('td').nth(3).evaluate(element => getComputedStyle(element).textAlign)).toBe('center');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `output/oito-melhorias/parcelas-${width}.png`, fullPage: true });
});
