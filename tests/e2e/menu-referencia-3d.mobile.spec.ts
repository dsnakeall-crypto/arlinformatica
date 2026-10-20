import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mkdirSync } from 'node:fs';

const folder = 'output/menu-inferior-3d-20261009';

test('menu ARL referência 3D: botões circulares e central maior sem vazamento em celulares', async ({ page }) => {
  mkdirSync(folder, { recursive: true });
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(nav).toBeVisible();
  await expect(nav.locator('button')).toHaveCount(5);

  for (const width of [320, 360, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 820 });
    await expect(nav).toBeVisible();
    const sizes = await nav.evaluate((node) => {
      const navRect = node.getBoundingClientRect();
      const buttons = [...node.querySelectorAll('button')];
      const items = buttons.map((button) => {
        const circle = button.querySelector('.arl-nav-icon-disc')!;
        const rect = circle.getBoundingClientRect();
        const style = getComputedStyle(circle);
        return {
          text: button.getAttribute('aria-label'), x: rect.x, right: rect.right, width: rect.width,
          height: rect.height, radius: style.borderRadius, surface: style.backgroundImage,
          solidColor: style.backgroundColor, shadow: style.boxShadow,
          label: button.querySelector('.arl-nav-caption')?.textContent,
        };
      });
      return { navRect: { x:navRect.x,right:navRect.right,width:navRect.width,top:navRect.top,bottom:navRect.bottom },
        scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,items };
    });
    expect(sizes.items).toHaveLength(5);
    expect(sizes.items[2].text).toBe('Abrir OS');
    expect(sizes.items[2].width).toBeGreaterThan(sizes.items[0].width + 2);
    expect(sizes.items[2].surface !== 'none' || sizes.items[2].solidColor !== 'rgba(0, 0, 0, 0)').toBe(true);
    expect(sizes.items[2].shadow).not.toBe('none');
    expect(sizes.items[0].width).toBeGreaterThanOrEqual(24);
    for (const item of sizes.items) {
      expect(Math.abs(item.height-item.width), item.text).toBeLessThan(2);
      if (item.text === 'Abrir OS') expect(item.radius, item.text).toBe('50%');
      expect(item.x, item.text).toBeGreaterThanOrEqual(0);
      expect(item.right, item.text).toBeLessThanOrEqual(width + 1);
      expect(item.label).toBeTruthy();
    }
    expect(sizes.navRect.x).toBeGreaterThanOrEqual(0);
    expect(sizes.navRect.right).toBeLessThanOrEqual(width + 1);
    expect(sizes.navRect.top).toBeGreaterThan(0);
    expect(sizes.navRect.bottom).toBeLessThanOrEqual(820);
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.innerWidth + 1);
    if ([320,390,430].includes(width)) await nav.screenshot({ path:`${folder}/barra-${width}px.png` });
  }
});

test('menu 3D mantém leitura no Clean e os cinco atalhos funcionais', async ({ page }) => {
  await login(page);
  await page.evaluate(() => localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode:'clean', color:'blue' })));
  await page.reload();
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(nav).toBeVisible();
  const middle = nav.getByRole('button', { name: 'Abrir OS' });
  const white = nav.getByRole('button', { name: 'Painel' });
  const result = await middle.evaluate(el => {
    const s = getComputedStyle(el);
    const c = el.querySelector('.arl-nav-icon-disc') as HTMLElement;
    return { buttonBg:s.backgroundColor, border:s.borderTopWidth,
      circleBg:getComputedStyle(c).backgroundImage,
      buttonShadow:s.boxShadow,
      middleColor:getComputedStyle(c).color,
      solidColor:getComputedStyle(c).backgroundColor,
      circleShadow:getComputedStyle(c).boxShadow };
  });
  expect(result.buttonBg).toBe('rgba(0, 0, 0, 0)');
  expect(result.border).toBe('0px');
  expect(result.buttonShadow).toBe('none');
  expect(result.circleBg !== 'none' || result.solidColor !== 'rgba(0, 0, 0, 0)').toBe(true);
  expect(result.circleShadow).not.toBe('none');
  await white.click();
  await expect(white).toHaveAttribute('aria-current','page');
  await nav.getByRole('button',{name:'Clientes'}).click();
  await expect(page.getByRole('heading',{name:'Gestão de Clientes'})).toBeVisible();
  await middle.click();
  await expect(middle).toHaveAttribute('aria-current','page');
});
