import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { assertOwnerExample, createOwnerExample, openMonth } from './expense-indicators-fixture';

test('gastos web: cinco indicadores e cards Allan/Carol seguem o exemplo do proprietário', async ({ page }) => {
  await login(page);
  const { before } = await createOwnerExample(page);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await openMonth(page);
    await assertOwnerExample(page, before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `output/reforma-20261009/gastos-indicadores-${viewport.width}.png`, fullPage: true });
  }
});
