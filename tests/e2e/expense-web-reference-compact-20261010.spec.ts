import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login } from './helpers';

const shots='output/expense-web-reference-compact-20261010';
const gridSelector='.cg-page.cg-expense-web-mirror .cg-bank-grid';

async function selectDesktop(page:Page) {
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
}

async function seedBanks(page:Page) {
  const stamp=Date.now();
  for(let i=0;i<8;i++){
    const response=await api(page,'/expense-control/catalogs/institutions','POST',{
      name:`Banco compacto ${i+1} ${stamp}`,active:true,due_day:12,
      color:['#6847b6','#c80051','#154eaf','#009f89'][i%4]
    });
    expect([200,201],JSON.stringify(response.body)).toContain(response.status);
  }
}

async function gridMetrics(grid:Locator) {
  return grid.evaluate(el=>{
    const boxes=Array.from(el.children).slice(0,8).map(child=>{
      const box=child.getBoundingClientRect();
      return {x:Math.round(box.left),y:Math.round(box.top),
        w:Math.round(box.width),h:Math.round(box.height)};
    });
    const g=getComputedStyle(el);
    return {boxes,columns:g.gridTemplateColumns.split(' ').length, width:Math.round(el.getBoundingClientRect().width)};
  });
}

test('Web Gastos e Instituições: cartões em 5 colunas, altura automática e visual preservado',async({page})=>{
  mkdirSync(shots,{recursive:true});
  await page.setViewportSize({width:1600,height:900});
  await login(page);
  await selectDesktop(page);
  await seedBanks(page);
  await page.goto('/expense-control');
  await expect(page.locator('.cg-expense-web-mirror')).toBeVisible();
  for(const tab of ['Gastos','Instituições'] as const){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    if(tab==='Gastos'){
      const cards=page.getByRole('button',{name:'Cards'});
      if(await cards.count()) await cards.click();
    }
    const grid=page.locator(gridSelector);
    await expect(grid).toBeVisible();
    await expect.poll(async()=>grid.locator(':scope > .cg-institution').count()).toBeGreaterThanOrEqual(8);
    const metrics=await gridMetrics(grid);
    expect(metrics.columns,JSON.stringify(metrics)).toBe(5);
    expect(metrics.boxes[0].y).toBe(metrics.boxes[4].y);
    expect(metrics.boxes[5].y).toBeGreaterThan(metrics.boxes[0].y);
    for(const card of metrics.boxes) {
      expect(card.w,JSON.stringify(metrics)).toBeLessThanOrEqual(330);
      expect(card.w).toBeGreaterThan(150);
      expect(card.h,JSON.stringify(metrics)).toBeGreaterThan(0);
      // Alteração 05: a altura acompanha categorias, sem teto que corte conteúdo.
      const sameRow=metrics.boxes.filter(other=>other.y===card.y);
      expect(new Set(sameRow.map(other=>other.h)).size).toBe(1);
    }
    const counts=grid.locator('.cg-institution-counts');
    for(const content of await counts.all()) {
      const size=await content.evaluate(el=>({overflow:getComputedStyle(el).overflowY,scroll:el.scrollHeight,client:el.clientHeight}));
      expect(size.overflow).toBe('visible');
      expect(size.scroll).toBeLessThanOrEqual(size.client+1);
    }
    const first=grid.locator(':scope > .cg-institution').first();
    await expect(first).toBeVisible();
    const art=first.locator('.cg-card-art');
    await expect(art).toBeVisible();
    const artWidth=await art.evaluate(el=>el.getBoundingClientRect().width);
    expect(artWidth).toBeLessThanOrEqual(130);
    await page.screenshot({path:`${shots}/${tab==='Gastos'?'gastos':'instituicoes'}-1600.png`,fullPage:false});
  }
  const nav=page.locator('.cg-tabs');
  const active=nav.getByRole('tab',{name:'Instituições'});
  await expect(active).toHaveCSS('color','rgb(255, 255, 255)');
  expect(await active.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  // As três ações administrativas continuam disponíveis e clicáveis.
  await expect(page.getByRole('button',{name:/Ver gastos de Banco compacto/}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/Editar instituição Banco compacto/}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/Excluir instituição Banco compacto/}).first()).toBeVisible();
});

test('Web Gastos/Instituições se adapta em janelas estreitas e preserva layout Web',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await selectDesktop(page);
  await seedBanks(page);
  await page.goto('/expense-control');
  const previousColumns=new Map<string,number>();
  for(const width of [1440,1220,950,760]){
    await page.setViewportSize({width,height:850});
    for(const tab of ['Gastos','Instituições']){
      await page.getByRole('tab',{name:tab,exact:true}).click();
      if(tab==='Gastos'){
        const cards=page.getByRole('button',{name:'Cards'});
        if(await cards.count()) await cards.click();
      }
      const grid=page.locator(gridSelector);
      await expect(grid).toBeVisible();
      const m=await gridMetrics(grid);
      expect(m.columns).toBeGreaterThanOrEqual(1);
      expect(m.columns).toBeLessThanOrEqual(5);
      expect(m.columns).toBeLessThanOrEqual(previousColumns.get(tab) ?? 5);
      previousColumns.set(tab,m.columns);
      await expect(page.locator('.shell.layout-desktop')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+3);
      // Cinco cartões em tela larga, redução real nas janelas estreitas.
      if(width>=1440) expect(m.columns,JSON.stringify({width,m})).toBe(5);
      if(width<=950) expect(m.columns).toBeLessThan(5);
    }
  }
});

test('Todos os menus preservam funções e compartilham o acabamento azul do Web',async({page})=>{
  mkdirSync(shots,{recursive:true});
  await page.setViewportSize({width:1600,height:900});
  await login(page);
  await selectDesktop(page);
  await page.goto('/expense-control');
  // A ação principal deve acompanhar o azul do print; a ação de foto segue neutra.
  const newDebt=page.getByRole('button',{name:'Nova dívida',exact:true});
  await expect(newDebt).toBeVisible();
  await expect(newDebt).toHaveCSS('color','rgb(255, 255, 255)');
  expect(await newDebt.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  const tabs=['Resumo','Gastos','Instituições','Pagamentos','Projeção','Quitadas','Ajustes','Histórico'];
  const fileNames=['resumo','gastos','instituicoes','pagamentos','projecao','quitadas','ajustes','historico'];
  for(let i=0;i<tabs.length;i++){
    const tab=page.getByRole('tab',{name:tabs[i],exact:true});
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected','true');
    await expect(page.locator('.cg-page.cg-expense-web-mirror')).toBeVisible();
    await expect(page.locator('.cg-navigation')).toBeVisible();
    await expect(tab).toHaveCSS('color','rgb(255, 255, 255)');
    await page.screenshot({path:`${shots}/${fileNames[i]}-menu.png`,fullPage:false});
  }
});

test('Mobile não recebe nova camada Web e mantém sua navegação própria',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-layout-mode','mobile'));
  await page.reload();
  const mobileNav=page.locator('.arl-expense-bottom');
  // Mobile depende do módulo real já aprovado, sem a classe exclusiva do Web.
  const expenseBtn=page.getByRole('button',{name:/Gestor de Gasto|Controle de Gasto/i}).first();
  if(await expenseBtn.count()) await expenseBtn.click();
  await expect(page.locator('.cg-page.cg-mobile')).toBeVisible();
  await expect(page.locator('.cg-page.cg-expense-web-mirror')).toHaveCount(0);
  await expect(mobileNav).toBeVisible();
});
