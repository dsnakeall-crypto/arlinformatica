import { test, expect } from '@playwright/test';
import { login, api } from './helpers';

const variants = ['original', 'clean'] as const;
const sizes = [1920, 1440, 1366, 1024, 900, 800, 790, 640, 480];

for (const mode of variants) {
  test(`Web ${mode}: adapta largura, não troca o layout e tem escolha só em Configurações`, async ({ page }) => {
    await page.setViewportSize({width:1440,height:850});
    await login(page);
    await page.evaluate((mode) => {
      localStorage.setItem('arl-layout-mode', 'desktop');
      localStorage.setItem('arl-appearance-v1', JSON.stringify({mode,color:'red'}));
    }, mode);
    await page.reload();
    const shell = page.locator('.shell');
    await expect(shell).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', mode);
    await expect(page.getByRole('group',{name:'Estilo do aplicativo'})).toHaveCount(0);
    const widths: Array<Record<string,unknown>> = [];
    for (const width of sizes) {
      await page.setViewportSize({width,height:850});
      await expect(shell).toHaveClass(width <= 1024 ? /layout-mobile/ : /layout-desktop/);
      const result = await page.evaluate(() => {
        const main=document.querySelector('.shell>main')!;
        const side=document.querySelector('#arl-main-sidebar')!;
        const shell=document.querySelector('.shell')!;
        const mr=main.getBoundingClientRect(),sr=side.getBoundingClientRect();
        return {
          width:innerWidth,rootWidth:document.documentElement.scrollWidth,
          mainLeft:Math.round(mr.left),mainRight:Math.round(mr.right),
          asideWidth:Math.round(sr.width),layout:shell.className,
          asideVisible:getComputedStyle(side).visibility !== 'hidden'
        };
      });
      widths.push(result);
      expect(result.layout,JSON.stringify(result)).toContain(width <= 1024 ? 'layout-mobile' : 'layout-desktop');
      expect(result.mainLeft,JSON.stringify(result)).toBeGreaterThanOrEqual(width <= 1024 ? 0 : 50);
      expect(result.mainRight,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
      expect(result.rootWidth,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
      if (width > 1024) expect(result.asideVisible).toBe(true);
      else await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })).toBeVisible();
    }
    await page.setViewportSize({width:1440,height:850});
    await expect(shell).toHaveClass(/layout-desktop/);
    await page.reload();
    await expect(shell).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance',mode);
    await page.locator('#arl-main-sidebar').getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:'Configurações'}).click();
    await page.getByRole('tab',{name:'Layouts'}).click();
    const theme = page.getByRole('group',{name:'Estilo do aplicativo'});
    await expect(theme.getByRole('button',{name:'Original'})).toBeVisible();
    await expect(theme.getByRole('button',{name:'Clean'})).toBeVisible();
    console.log('RESPONSIVE_WEB_'+mode.toUpperCase(), JSON.stringify(widths));
    await page.setViewportSize({width:640,height:850});
    await page.screenshot({path:`output/web-clean-reference-20261010/web-${mode}-640-responsive.png`});
  });
}

for (const mode of variants) {
  test(`Web ${mode}: menu fixado adapta e volta ao tamanho anterior sem trocar preferência`, async ({ page }) => {
    await page.setViewportSize({ width:1440,height:900 });
    await login(page);
    await page.evaluate((mode) => {
      localStorage.setItem('arl-layout-mode','desktop');
      localStorage.setItem('arl-appearance-v1',JSON.stringify({mode,color:'red'}));
    }, mode);
    const saved = await api(page,'/me/sidebar','PATCH',{sidebar_pinned:true});
    expect(saved.status,JSON.stringify(saved.body)).toBe(200);
    await page.reload();
    const side=page.locator('#arl-main-sidebar');
    const shell=page.locator('.shell');
    await expect(shell).toBeVisible();
    const widths=[1440,1024,800,640,480,1440];
    const sideSizes=[];
    for (const width of widths) {
      await page.setViewportSize({width,height:900});
      await expect(shell).toHaveClass(width <= 1024 ? /layout-mobile/ : /layout-desktop/);
      const metrics=await page.evaluate(()=>{
        const main=document.querySelector('.shell>main')!.getBoundingClientRect();
        const side=document.querySelector('#arl-main-sidebar')!.getBoundingClientRect();
        return { scroll:document.documentElement.scrollWidth,side:Math.round(side.width),left:Math.round(main.left),right:Math.round(main.right) };
      });
      sideSizes.push(metrics.side);
      expect(metrics.scroll,JSON.stringify(metrics)).toBeLessThanOrEqual(width+2);
      expect(metrics.right,JSON.stringify(metrics)).toBeLessThanOrEqual(width+2);
      if(width<=1024) {
        await expect(side).toBeHidden();
        await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })).toBeVisible();
      } else {
        expect(metrics.side).toBeGreaterThan(180);
        await expect(side.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:'Ordens'})).toBeVisible();
      }
    }
    expect(sideSizes[0]).toEqual(sideSizes[sideSizes.length-1]);
    expect(await page.evaluate(() => localStorage.getItem('arl-layout-mode'))).toBe('desktop');
    await page.reload();
    await expect(shell).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance',mode);
    console.log('WEB_PINNED_'+mode.toUpperCase(),JSON.stringify({widths,sideSizes}));
  });
}
