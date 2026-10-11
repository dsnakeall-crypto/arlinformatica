import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { assertOwnerExample, createOwnerExample, openMonth } from './expense-indicators-fixture';

test('gastos mobile: mesmos cinco indicadores e cards, sem cortar valores em 320–430 px', async ({ page }) => {
  await login(page);
  const { before } = await createOwnerExample(page);
  await openMonth(page);
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await assertOwnerExample(page, before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'overflow ' + width).toBe(true);
    // Nenhum valor monetário pode ficar cortado dentro do seu cartão.
    const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.cgo-original, .cgo-remaining b, .cgo-person dd')].filter(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth).map(el => el.textContent));
    expect(clipped, 'valores cortados em ' + width).toEqual([]);
    await page.screenshot({ path: `output/reforma-20261009/gastos-indicadores-mobile-${width}.png`, fullPage: true });
  }
});
