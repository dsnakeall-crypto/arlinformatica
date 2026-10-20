import { test, expect } from '@playwright/test';
import { login } from './helpers';

const EVIDENCE = 'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 20-10-26 - 03-50 - GAVETA-DIREITA-3D';

test('Mobile Premium: menu desliza da direita, abre módulos e mantém efeitos leves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const root = page.locator('.shell');
  await expect(root).toHaveClass(/arl-mobile-premium-mode/);
  const dock = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(dock.locator('button')).toHaveCount(5);
  const stat = page.locator('.arl-premium-kpis article').first();
  await expect(stat).toBeVisible();
  const statShadow = await stat.evaluate(el => getComputedStyle(el).boxShadow);
  expect(statShadow).not.toBe('none');
  await dock.getByRole('button', { name: 'Menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(480);
  await expect(dialog.locator('.arl-premium-drawer-brand img')).toBeVisible();
  await expect(dialog.locator('.arl-premium-menu-group')).not.toHaveCount(0);
  const coords = await dialog.evaluate(el => {
    const box = el.getBoundingClientRect();
    return { x: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width,
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
      overflowY: getComputedStyle(el.querySelector('.arl-premium-menu-scroll')!).overflowY,
      firstCardShadow: getComputedStyle(el.querySelector('.arl-premium-menu-item')!).boxShadow,
      backdrop: getComputedStyle(el.parentElement!.querySelector('.arl-premium-menu-backdrop')!).backgroundColor,
      backdropRect: el.parentElement!.querySelector('.arl-premium-menu-backdrop')!.getBoundingClientRect().toJSON(),
      bodyOverflow: getComputedStyle(document.body).overflow };
  });
  console.log('RIGHT_DRAWER_GEOMETRY', JSON.stringify(coords));
  expect(coords.x).toBeGreaterThan(0);
  expect(Math.abs(coords.right - coords.viewportWidth)).toBeLessThan(2);
  expect(coords.top).toBeLessThanOrEqual(2);
  expect(coords.bottom).toBeGreaterThanOrEqual(coords.viewportHeight - 2);
  expect(coords.width).toBeLessThanOrEqual(370);
  expect(coords.overflowY).toBe('auto');
  expect(coords.firstCardShadow).not.toBe('none');
  expect(coords.backdrop).not.toBe('rgb(255, 255, 255)');
  expect(coords.bodyOverflow).toBe('hidden');
  await page.screenshot({ path: EVIDENCE + '/MENU-DIREITO-390x844.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await dock.getByRole('button', { name: 'Menu' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar Menu' }).click();
  await expect(dialog).toHaveCount(0);
  await dock.getByRole('button', { name: 'Menu' }).click();
  await page.locator('.arl-premium-menu-backdrop').click({position:{x:7,y:100}});
  await expect(dialog).toHaveCount(0);
  await dock.getByRole('button', { name: 'Menu' }).click();
  await dialog.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-arl-orders-react="1"]')).toBeVisible();
  await expect(page.locator('main .arl-premium-section-hero')).toBeVisible();
  await expect(page.locator('main .arl-page-header').first()).toBeVisible({timeout:20000});
  await page.screenshot({ path: EVIDENCE + '/ORDENS-3D-390x844.png' });
  await dock.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: /Clientes/i }).first()).toBeVisible();
  await expect(page.locator('main .arl-page-header').first()).toBeVisible({timeout:20000});
  await page.screenshot({ path: EVIDENCE + '/CLIENTES-3D-390x844.png' });
  expect(errors).toEqual([]);
});

test('Gaveta direita cabe em tela estreita e mantém saída acessível', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page);
  const dock = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await dock.getByRole('button', { name: 'Menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(480);
  const shape = await dialog.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, width: rect.width, right: rect.right, viewWidth: innerWidth,
      scrollClientHeight: el.querySelector('.arl-premium-menu-scroll')!.clientHeight,
      scrollHeight: el.querySelector('.arl-premium-menu-scroll')!.scrollHeight };
  });
  console.log('SMALL_DRAWER_GEOMETRY', JSON.stringify(shape));
  expect(shape.x).toBeGreaterThanOrEqual(0);
  expect(shape.right).toBeLessThanOrEqual(shape.viewWidth + 1);
  expect(shape.scrollClientHeight).toBeGreaterThan(80);
  await dialog.getByRole('button', { name: 'Fechar Menu' }).click();
  await expect(dialog).toHaveCount(0);
});

test('Web/PC permanece com menu lateral, sem overlay nem visual 3D do Premium', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await expect(page.locator('.shell')).not.toHaveClass(/arl-mobile-premium-mode/);
  await expect(page.locator('.arl-premium-menu-layer')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
  await page.screenshot({ path: EVIDENCE + '/WEB-PRESERVADO-1440x900.png' });
});
