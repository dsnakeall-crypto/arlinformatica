import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('mobile: atendimento selecionado persiste após blur e navegação respeita o rodapé', async ({ page }) => {
  await login(page);
  await page.goto('/new');
  const bench = page.locator('.arl-new-order .attendance button').first();
  const external = page.locator('.arl-new-order .attendance button').last();
  await expect(bench).toHaveAttribute('aria-pressed', 'true');
  await external.click();
  await expect(external).toHaveAttribute('aria-pressed', 'true');
  await expect(bench).toHaveAttribute('aria-pressed', 'false');
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  expect(await external.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(185, 28, 28)');
  await bench.click();
  await expect(bench).toHaveAttribute('aria-pressed', 'true');
  await expect(external).toHaveAttribute('aria-pressed', 'false');
  const nav = page.locator('.arl-global-mobile-nav');
  await expect(nav).toBeVisible();
  const rect = await nav.boundingBox();
  expect(rect!.y + rect!.height).toBeCloseTo(page.viewportSize()!.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'output/oito-melhorias/atendimento-mobile.png', fullPage: true });
});
