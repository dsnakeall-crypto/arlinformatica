import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { login } from './helpers';

test('menu inferior: inatividade de três segundos, interação reinicia e toque fora fecha imediatamente', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  const rail = page.getByRole('navigation', { name: 'Menu lateral compacto' });
  await expect(rail).toBeVisible();
  await page.waitForTimeout(1700);
  await rail.getByRole('button', { name: 'Painel', exact: true }).focus();
  await page.waitForTimeout(1700);
  await expect(rail).toBeVisible();
  await expect(rail).not.toBeVisible({ timeout: 2000 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar menu lateral', exact: true }).click({ position: { x: 220, y: 300 } });
  await expect(rail).not.toBeVisible({ timeout: 500 });
  await page.goto('/expense-control');
  await expect(page.locator('.cgo-final-summary>.cgo-indicator')).toHaveCount(4);
  await expect(page.locator('.cg-loading')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagamento rápido de Allan', exact: true })).toBeVisible();
  await expect(page.locator('.cgo-next')).toHaveCount(0);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator('.cgo-final-summary').evaluate(node => ({
      viewport: window.innerWidth, document: document.documentElement.scrollWidth,
      cards: [...node.children].map(card => { const r = card.getBoundingClientRect(); return { right: r.right, height: r.height }; }),
      dollars: [...node.querySelectorAll('.cg-payment-dollar')].map(button => { const style = getComputedStyle(button); return { color: getComputedStyle(button.querySelector('span')!).color, background: style.backgroundImage, radius: style.borderRadius }; }),
    }));
    expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
    for (const card of metrics.cards) { expect(card.right).toBeLessThanOrEqual(width); expect(card.height).toBeLessThan(145); }
    for (const dollar of metrics.dollars) { expect(dollar.color).toBe('rgb(0, 0, 0)'); expect(dollar.background).toContain('66, 223, 123'); expect(dollar.radius).toBe('50%'); }
  }
  mkdirSync('output/final-financeiro-20261013', { recursive: true });
  await page.screenshot({ path: 'output/final-financeiro-20261013/resumo-mobile.png', fullPage: true });
});
