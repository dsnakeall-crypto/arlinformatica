import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { login } from './helpers';

test('menu Premium fecha explicitamente e resumo financeiro permanece responsivo', async ({ page }) => {
  await login(page);
  const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await nav.getByRole('button',{name:'Menu',exact:true}).click();
  const sheet=page.getByRole('dialog',{name:'Menu'});
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button',{name:'Ordens'}).focus();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await nav.getByRole('button',{name:'Menu',exact:true}).click();
  await expect(sheet).toBeVisible();
  await page.locator('.arl-premium-menu-backdrop').click({position:{x:10,y:100}});
  await expect(sheet).toHaveCount(0);
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
