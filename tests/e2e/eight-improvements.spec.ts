import { test, expect } from '@playwright/test';
import { api, login, openExpenseSection } from './helpers';

test('instituições: cinco colunas, altura automática e navegação sem faixa branca', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await login(page);
  for (let i = 0; i < 6; i++) expect((await api(page, '/expense-control/catalogs/institutions', 'POST', { name: `Layout ${Date.now()} ${i}`, active: true, due_day: 12, color: '#123456' })).status).toBe(200);
  await page.goto('/expense-control');
  await page.mouse.move(1590, 10);
  await openExpenseSection(page, 'Instituições');
  await expect(page.locator('.cg-bank-grid')).toBeVisible();
  const layout = await page.locator('.cg-bank-grid').evaluate(element => {
    const style = getComputedStyle(element);
    return { columns: style.gridTemplateColumns.split(' ').length, cards: Array.from(element.children).map(card => ({ height: card.getBoundingClientRect().height, top: card.getBoundingClientRect().top })) };
  });
  expect(layout.columns).toBe(5);
  const firstRow = layout.cards.filter(card => card.top === layout.cards[0].top);
  expect(new Set(firstRow.map(card => card.height)).size).toBe(1);
  for (const selector of ['.cg-navigation', '.cg-tabs']) {
    const item = page.locator(selector);
    if (await item.count()) expect(await item.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  }
  await page.screenshot({ path: 'output/oito-melhorias/instituicoes-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  expect(await page.locator('.cg-bank-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBeLessThanOrEqual(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
