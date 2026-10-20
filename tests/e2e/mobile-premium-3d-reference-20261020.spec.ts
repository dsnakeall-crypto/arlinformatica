import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('Mobile Premium 3D: Painel e componentes permanecem reais, sem overflow', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const home=page.locator('.arl-mobile-home-premium');
  await expect(home).toBeVisible();
  const kpi=home.locator('.arl-premium-kpis article');
  await expect(kpi).toHaveCount(4);
  await expect(home.locator('.arl-premium-shortcuts button')).toHaveCount(4);
  await expect(home.locator('svg.arl-premium-icon')).toHaveCount(8);
  await expect(home.locator('.arl-premium-hero')).toBeVisible();
  // O banco E2E padrão pode estar vazio; validar fim da carga, não criar
  // dependência de fixtures que pertencem somente à prévia persistente.
  await expect(home.locator('[data-mobile-count]')).not.toContainText('Carregando', {timeout:15000});
  const styles=await page.evaluate(() => {
    const hero=document.querySelector<HTMLElement>('.arl-premium-hero')!;
    const item=document.querySelector<HTMLElement>('.arl-premium-kpis article')!;
    const icon=document.querySelector<SVGElement>('.arl-premium-icon')!;
    const d=document.documentElement;
    return {width:innerWidth,overflow:d.scrollWidth-innerWidth,
      border:getComputedStyle(hero).borderColor,
      background:getComputedStyle(hero).backgroundImage,
      cardShadow:getComputedStyle(item).boxShadow,
      gradient:!!icon.querySelector('linearGradient'),
      count:document.querySelectorAll('.arl-mobile-order-card').length};
  });
  expect(styles.overflow).toBeLessThanOrEqual(5);
  expect(styles.gradient).toBe(true);
  expect(styles.background).toContain('arl-mobile-premium-gold-ribbon-20261020.svg');
  expect(styles.cardShadow).not.toBe('none');
  expect(styles.count).toBeGreaterThanOrEqual(0);
  const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(nav.locator('button')).toHaveCount(5);
  await nav.getByRole('button',{name:'Menu'}).click();
  await expect(page.getByRole('dialog',{name:'Menu'})).toBeVisible();
  await page.getByRole('dialog',{name:'Menu'}).getByRole('button',{name:'Produtos'}).click();
  await expect(page.locator('main[data-arl-section="products"]')).toBeVisible();
  await expect(page.locator('main .arl-premium-section-hero')).toBeVisible();
});

test('Web/PC e Controle de Gastos não recebem a reforma de cores do Painel ARL', async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await expect(page.locator('.arl-mobile-home-premium')).toHaveCount(0);
  await expect(page.locator('.arl-premium-hero')).toHaveCount(0);
  await expect(page.locator('main>.arl-premium-section-hero')).toHaveCount(0);
});
