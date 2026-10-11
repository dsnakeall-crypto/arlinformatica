import {test,expect} from '@playwright/test';
import {login} from './helpers';
import {mkdirSync} from 'node:fs';

test('Web/PC conserva shell ARL, menu à esquerda e Gastos no conteúdo à direita',async({page})=>{
 mkdirSync('output/web-integrado-20261009',{recursive:true});
 await page.setViewportSize({width:1440,height:900});
 await login(page);
 await page.evaluate(()=>localStorage.setItem('arl-layout-mode','desktop'));
 await page.reload();
 await expect(page.locator('.shell.layout-desktop')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Menu principal'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();
 await page.screenshot({path:'output/web-integrado-20261009/dashboard-web.png',fullPage:true});
 await page.getByRole('navigation',{name:'Menu principal'})
   .getByRole('button',{name:'Controle de Gasto'}).click();
 const shell=page.locator('.shell');
 await expect(shell).toHaveClass(/layout-desktop/);
 await expect(shell).not.toHaveClass(/arl-expense-workspace/);
 await expect(page.locator('#arl-main-sidebar')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Menu principal'})).toBeVisible();
 await expect(page.locator('main .cg-page')).toBeVisible();
 await expect(page.locator('main .app-head')).toBeVisible();
 await expect(page.locator('main .arl-expense-own-header')).toHaveCount(0);
 const dims=await page.evaluate(()=>{
  const a=document.querySelector('#arl-main-sidebar')!.getBoundingClientRect();
  const m=document.querySelector('.shell>main')!.getBoundingClientRect();
  return {asideRight:a.right,mainLeft:m.left,mainWidth:m.width,pageWidth:innerWidth,scroll:document.documentElement.scrollWidth};
 });
 expect(dims.mainLeft).toBeGreaterThanOrEqual(dims.asideRight-2);
 expect(dims.mainLeft).toBeGreaterThan(45);
 expect(dims.mainWidth).toBeLessThan(dims.pageWidth);
 expect(dims.scroll).toBeLessThanOrEqual(dims.pageWidth+1);
 await page.screenshot({path:'output/web-integrado-20261009/controle-gastos-web-integrado.png',fullPage:true});
 await page.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:'Painel'}).click();
 await expect(page.locator('main[data-arl-dashboard-react]')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();
});
test('Mobile conserva Controle de Gastos em tela independente com navegação própria',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await login(page);
 await page.evaluate(()=>localStorage.setItem('arl-layout-mode','mobile'));
 await page.reload();
 const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
 await nav.getByRole('button',{name:'Gestor de Gasto'}).click();
 await expect(page.locator('.shell.arl-expense-workspace')).toBeVisible();
 await expect(page.locator('#arl-main-sidebar')).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Menu do Controle de Gastos'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Navegação Mobile / Tablet'})).toHaveCount(0);
});
