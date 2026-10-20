import { test, expect } from '@playwright/test';
import { login, openExpenseSection } from './helpers';
import { mkdirSync } from 'node:fs';

const folder = 'output/clean-rail-20261009';

test('barra Premium abre drawer lateral, preserva foco, fecha com Escape e clique externo', async ({page}) => {
  mkdirSync(folder, {recursive:true});
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const bar=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(bar.locator('button')).toHaveCount(5);
  await bar.getByRole('button',{name:'Menu',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Menu'});
  await expect(drawer).toBeVisible();
  await expect.poll(async()=>{const rect=await drawer.boundingBox();return rect?Math.round(rect.x+rect.width):9999;}).toBeLessThanOrEqual(394);
  const rect=await drawer.boundingBox();
  expect(rect).not.toBeNull();
  for(const name of ['Ordens','Configurações','Financeiro']) await expect(drawer.getByRole('button',{name})).toBeVisible();
  await drawer.screenshot({path:folder+'/gaveta-premium-390px.png'});
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(bar.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
  await bar.getByRole('button',{name:'Menu',exact:true}).click();
  await expect(drawer).toBeVisible();
  await page.locator('.arl-premium-menu-backdrop').click({position:{x:10,y:100}});
  await expect(drawer).toHaveCount(0);
  await bar.getByRole('button',{name:'Menu',exact:true}).click();
  await drawer.getByRole('button',{name:'Configurações'}).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Configurações/i}).first()).toBeVisible();
});

test('preferência antiga compact migra para menu Premium 3D preservando cores Clean', async ({page}) => {
  await login(page);
  const user = await page.evaluate(async ()=>(await (await fetch('/api/me',{credentials:'same-origin'})).json()));
  expect(user.id).toBeTruthy();
  await page.evaluate(id=>{
    localStorage.setItem('arl-mobile-nav-'+id,'compact');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  },user.id);
  await page.reload();
  const bar=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(bar.locator('button')).toHaveCount(5);
  expect(await bar.locator('button').evaluateAll(items=>items.map(i=>i.getAttribute('aria-label'))))
    .toEqual(['Painel','Clientes','Abrir OS','Gastos','Menu']);
  const discs=bar.locator('.arl-nav-icon-disc');
  await expect(discs).toHaveCount(5);
  const dimensions=await discs.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));
  expect(Math.min(...dimensions)).toBeGreaterThanOrEqual(24);
  await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance','clean');
  await expect(page.locator('html')).toHaveAttribute('data-arl-palette','red');
  expect(await page.evaluate(id=>localStorage.getItem('arl-mobile-nav-'+id),user.id)).toBe('premium');
  await page.screenshot({path:folder+'/compact-migrado-premium-390px.png'});
});

test('controle de gastos sempre clean sem seletor Original e cards internos arredondados',async({page})=>{
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'})));
  await page.reload();
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'}).getByRole('button',{name:'Clientes'}).click();
  const panel = page.locator('.clients-list-panel').first();
  await expect(panel).toBeVisible();
  expect(parseFloat(await panel.evaluate(el=>getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThanOrEqual(16);
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'}).getByRole('button',{name:'Gastos',exact:true}).click();
  await expect(page.locator('.cg-clean-only')).toBeVisible();
  await openExpenseSection(page,'Ajustes');
  await expect(page.locator('.appearance-settings')).toHaveCount(0);
  const styles = await page.locator('.cg-clean-only .cg-panel').first().evaluate(el=>({radius:getComputedStyle(el).borderTopLeftRadius,bg:getComputedStyle(el).backgroundColor}));
  expect(parseFloat(styles.radius)).toBeGreaterThanOrEqual(16);
  await page.screenshot({path:`${folder}/gastos-clean-390px.png`});
});

test('menu Premium e Gastos mantêm círculos 3D no Clean, sem overflow',async({page})=>{
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'blue'})));
  await page.reload();
  const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await nav.getByRole('button',{name:'Menu',exact:true}).click();
  const sheet=page.getByRole('dialog',{name:'Menu'});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button',{name:'Clientes'})).toHaveCount(0);
  await expect(sheet.getByRole('button',{name:'Ordens'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await nav.getByRole('button',{name:'Gastos',exact:true}).click();
  const expense=page.locator('.cg-clean-only');
  await expect(expense).toBeVisible();
  const bar=page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
  const center=bar.getByRole('button',{name:/Adicionar/i});
  await expect(center).toBeVisible();
  const shape=await center.locator('.arl-nav-icon-disc').evaluate(el=>({radius:getComputedStyle(el).borderRadius,width:el.getBoundingClientRect().width}));
  expect(shape.radius).toBe('50%');
  expect(shape.width).toBeGreaterThanOrEqual(24);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
