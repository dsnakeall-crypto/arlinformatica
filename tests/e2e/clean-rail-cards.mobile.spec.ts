import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mkdirSync } from 'node:fs';

const folder = 'output/clean-rail-20261009';

test('barra inferior abre trilho estreito, fecha após 2s e cancela o fechamento ao voltar a tocar', async ({page}) => {
  mkdirSync(folder, {recursive:true});
  await login(page);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Abrir menu'}).click();
  const rail = page.getByRole('navigation',{name:'Menu lateral compacto'});
  await expect(rail).toBeVisible();
  await expect(page.locator('.layout-mobile > aside#arl-main-sidebar')).toBeHidden();
  const width = await rail.evaluate(n=>n.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(70);
  for (const name of ['Painel','Ordens','Clientes','Configurações']) await expect(rail.getByRole('button',{name})).toBeVisible();
  await rail.screenshot({path:`${folder}/rail-390px.png`});
  const overlay = page.getByRole('button',{name:'Fechar menu lateral'});
  await overlay.click({position:{x:350,y:380}});
  await page.waitForTimeout(1000);
  await expect(rail).toBeVisible();
  await rail.locator('.arl-rail-brand').click(); // toque dentro do trilho cancela o fechamento
  await page.waitForTimeout(1400);
  await expect(rail).toBeVisible();
  await overlay.click({position:{x:350,y:380}});
  await expect(rail).toBeHidden({timeout:3300});
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await expect(rail).toBeVisible();
  await rail.getByRole('button',{name:'Configurações'}).click();
  await expect(rail).toBeHidden();
  await expect(page.getByRole('heading',{name:/Configurações/i}).first()).toBeVisible();
});

test('menu lateral fixo utiliza os mesmos discos do trilho flutuante', async ({page}) => {
  await login(page);
  const user = await page.evaluate(async ()=>(await (await fetch('/api/me',{credentials:'same-origin'})).json()));
  expect(user.id).toBeTruthy();
  await page.evaluate(id=>{
    localStorage.setItem('arl-mobile-nav-'+id,'compact');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  },user.id);
  await page.reload();
  const fixed = page.locator('.shell.arl-mobile-compact-mode > aside');
  await expect(fixed).toBeVisible();
  const disc = fixed.locator('.nav-group .nav-icon').first();
  const values = await disc.evaluate(el=>({radius:getComputedStyle(el).borderRadius,background:getComputedStyle(el).backgroundImage,width:el.getBoundingClientRect().width}));
  expect(values.radius).toBe('50%');
  // Ajuste final aprovado: ícones sem moldura/círculo gradiente, com alvo de toque preservado.
  expect(values.background).toBe('none');
  expect(values.width).toBeGreaterThanOrEqual(38);
  await page.screenshot({path:`${folder}/lateral-compacto-390px.png`});
});

test('controle de gastos sempre clean sem seletor Original e cards internos arredondados',async({page})=>{
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'})));
  await page.reload();
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'}).getByRole('button',{name:'Clientes'}).click();
  const panel = page.locator('.clients-list-panel').first();
  await expect(panel).toBeVisible();
  expect(parseFloat(await panel.evaluate(el=>getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThanOrEqual(21);
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'}).getByRole('button',{name:'Gestor de Gasto'}).click();
  await expect(page.locator('.cg-clean-only')).toBeVisible();
  await page.getByRole('button',{name:'Ajustes'}).first().click();
  await expect(page.locator('.appearance-settings')).toHaveCount(0);
  const styles = await page.locator('.cg-clean-only .cg-panel').first().evaluate(el=>({radius:getComputedStyle(el).borderTopLeftRadius,bg:getComputedStyle(el).backgroundColor}));
  expect(parseFloat(styles.radius)).toBeGreaterThanOrEqual(16);
  await page.screenshot({path:`${folder}/gastos-clean-390px.png`});
});

test('trilho flutuante e Gastos mantêm aparência circular no tema Clean da ARL',async({page})=>{
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'blue'})));
  await page.reload();
  await page.getByRole('button',{name:'Abrir menu'}).click();
  const rail = page.getByRole('navigation',{name:'Menu lateral compacto'});
  await expect(rail).toBeVisible();
  const link = rail.getByRole('button',{name:'Clientes'});
  expect((await link.evaluate(el=>getComputedStyle(el).backgroundColor))).toBe('rgba(0, 0, 0, 0)');
  await expect(rail.locator('.arl-rail-disc').first()).toBeVisible();
  await rail.getByRole('button',{name:'Painel'}).click();
  const nav = page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await nav.getByRole('button',{name:'Gestor de Gasto'}).click();
  const expense = page.locator('.cg-clean-only');
  await expect(expense).toBeVisible();
  const bar = page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
  const center = bar.getByRole('button',{name:/Adicionar/i});
  await expect(center).toBeVisible();
  // Forma e fundo pertencem ao disco contêiner; SVG é apenas o ícone.
  const shape = await center.locator('.arl-nav-icon-disc').evaluate(el=>({radius:getComputedStyle(el).borderRadius,width:el.getBoundingClientRect().width}));
  expect(shape.radius).not.toBe('0px');
  expect(shape.width).toBeGreaterThanOrEqual(38);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
