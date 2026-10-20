import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('alternância responsiva Web ↔ Mobile sem abrir Configurações', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  const shell=page.locator('.shell');
  await expect(shell).toHaveClass(/layout-desktop/);
  await page.setViewportSize({width:390,height:844});
  await expect(shell).toHaveClass(/layout-mobile/);
  await expect(page.getByRole('navigation',{name:'Navegação Mobile / Tablet'})).toBeVisible();
  await page.setViewportSize({width:1440,height:900});
  await expect(shell).toHaveClass(/layout-desktop/);
  await expect(page.getByRole('navigation',{name:'Menu principal'})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('arl-layout-mode'))).toBe('desktop');
});
