import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login } from './helpers';

test('resumo final: cards detalhados preservados, popup mensal por modalidade e cifrão independente', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Resumo final ' + stamp, active: true, due_day: 12, color: '#2473b6' })).body;
  const kind = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Cartão final ' + stamp, active: true })).body;
  for (const [responsibility, amount_cents] of [['one', 10000], ['two', 20000], ['shared', 10000]] as const) {
    expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: kind.id, name: 'Resumo ' + responsibility, recurrence: 'once', responsibility, percent_one: 70, amount_cents, installment_count: 1, first_number: 1, start_month: month, due_day: 12 })).status).toBe(201);
  }
  const loan = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Empréstimo final ' + stamp, active: true })).body;
  expect((await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.id, type_id: loan.id, name: 'Empréstimo Allan', recurrence: 'once', responsibility: 'one', percent_one: 100, amount_cents: 4000, installment_count: 1, first_number: 1, start_month: month, due_day: 12 })).status).toBe(201);
  let posts = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/api/expense-control/')) posts++; });
  mkdirSync('output/final-financeiro-20261013', { recursive: true });
  for (const [mode, width] of [['desktop', 1440], ['mobile', 320], ['mobile', 390], ['mobile', 430]] as const) {
    await page.evaluate(mode => localStorage.setItem('arl-layout-mode', mode), mode);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/expense-control');
    await expect(page.locator('.cg-loading')).toHaveCount(0);
    await expect(page.locator('.cgo-person')).toHaveCount(2);
    await expect(page.locator('.cgo-person-one')).toContainText('Valor pessoal');
    await expect(page.locator('.cgo-person-two')).toContainText('Pago / abatido');
    const compact = page.locator('.cgo-final-summary');
    await expect(compact).not.toContainText('Ver gastos');
    const geometry = await compact.evaluate(root => {
      const card = root.querySelector('.cgo-month')!;
      const icon = card.querySelector('.cgo-icon')!.getBoundingClientRect();
      const value = card.querySelector('.cgo-original')!.getBoundingClientRect();
      const personal = root.querySelector('.cgo-one')!;
      return { overlap: Math.min(icon.right, value.right) > Math.max(icon.left, value.left) && Math.min(icon.bottom, value.bottom) > Math.max(icon.top, value.top),
        height: personal.getBoundingClientRect().height, mainFont: parseFloat(getComputedStyle(personal.querySelector('.cgo-original')!).fontSize), pendingFont: parseFloat(getComputedStyle(personal.querySelector('.cgo-remaining b')!).fontSize), document: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(geometry.overlap).toBe(false);
    expect(geometry.height).toBeLessThan(115);
    expect(geometry.pendingFont).toBeLessThan(geometry.mainFont);
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    for (const [person, amount] of [['Allan', 17000], ['Carol', 23000]] as const) {
      await compact.getByRole('button', { name: 'Ver resumo mensal de ' + person, exact: true }).click();
      const popup = page.getByRole('dialog', { name: 'Resumo mensal de ' + person, exact: true });
      await expect(popup.locator('dl>div').filter({ hasText: bank.name }).filter({ hasText: kind.name })).toHaveText(bank.name + ' — ' + kind.name + ':R$ ' + (amount / 100).toFixed(2).replace('.', ','));
      const loanRow = popup.locator('dl>div').filter({ hasText: loan.name });
      if (person === 'Allan') await expect(loanRow).toHaveText(bank.name + ' — ' + loan.name + ':R$ 40,00');
      else await expect(loanRow).toHaveCount(0);
      await popup.getByRole('button', { name: 'Fechar resumo mensal', exact: true }).click();
    }
    await compact.locator('.cgo-one').click({ position: { x: 2, y: 30 } });
    await expect(page.getByRole('dialog', { name: 'Resumo mensal de Allan', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar resumo mensal', exact: true }).click();
    await compact.getByRole('button', { name: 'Pagamento rápido de Allan', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Pagamento rápido de Allan', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Resumo mensal de/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Fechar pagamento rápido', exact: true }).click();
    await page.screenshot({ path: 'output/final-financeiro-20261013/resumo-restaurado-' + width + '.png', fullPage: true });
  }
  expect(posts).toBe(0);
});
