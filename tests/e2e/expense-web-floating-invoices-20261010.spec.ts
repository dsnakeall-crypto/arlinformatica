import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login } from './helpers';

const out='output/expense-web-floating-invoices-20261010';

async function desktop(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
}

test('Gestor WEB: barras das abas flutuantes e Resumo sem contorno de grupo',async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:1600,height:900});
  await login(page);
  await desktop(page);
  await page.goto('/expense-control');
  const scope=page.locator('.cg-page.cg-expense-web-mirror');
  await expect(scope).toBeVisible();
  const nav=scope.locator('.cg-navigation');
  const tabs=scope.locator('.cg-tabs');
  const summary=scope.locator('.cg-mobile-summary');
  await expect(nav).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(summary).toBeVisible();
  for (const el of [nav,tabs,summary]) {
    await expect(el).toHaveCSS('border-top-width','0px');
    await expect(el).toHaveCSS('box-shadow','none');
    await expect(el).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  }
  await expect(tabs.getByRole('tab',{name:'Resumo'})).toHaveCSS('border-top-width','1px');
  await page.screenshot({path:out+'/web-summary-floating.png',fullPage:false});
});

test('Faturas do mês WEB: valor BRL visível, data alinhada, 1 barra azul por fatura e sem símbolos vermelhos/seta',async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:1600,height:900});
  await login(page);
  await desktop(page);
  const stamp=Date.now().toString();
  const month=new Date().toLocaleDateString('sv-SE').slice(0,7);
  const institution=await api(page,'/expense-control/catalogs/institutions','POST',{name:'Instituição Fatura '+stamp,active:true,due_day:12,color:'#3770c5'});
  expect(institution.status,JSON.stringify(institution.body)).toBe(200);
  const kind=await api(page,'/expense-control/catalogs/types','POST',{name:'Cartão de Crédito '+stamp,active:true});
  expect(kind.status,JSON.stringify(kind.body)).toBe(200);
  const debt=await api(page,'/expense-control/debts','POST',{
    request_key:crypto.randomUUID(),institution_id:institution.body.id,type_id:kind.body.id,
    name:'Compra do mês '+stamp,recurrence:'once',responsibility:'shared',
    percent_one:50,amount_cents:35000,installment_count:1,first_number:1,
    start_month:month,due_day:12,notes:null
  });
  expect(debt.status,JSON.stringify(debt.body)).toBe(201);
  // Regressão da situação relatada: três faturas (cartões de crédito
  // em instituições distintas e um empréstimo), com valores diferentes.
  const otherBank=await api(page,'/expense-control/catalogs/institutions','POST',{
    name:'Outra instituição '+stamp,active:true,due_day:12,color:'#2364a7'
  });
  expect(otherBank.status).toBe(200);
  const loanType=await api(page,'/expense-control/catalogs/types','POST',{
    name:'Empréstimos '+stamp,active:true
  });
  expect(loanType.status).toBe(200);
  const extras=[
    {institution_id:otherBank.body.id,type_id:kind.body.id,name:'Fatura cartão '+stamp,amount_cents:12745},
    {institution_id:institution.body.id,type_id:loanType.body.id,name:'Empréstimo mensal '+stamp,amount_cents:99990},
  ];
  for (const extra of extras) {
    const created=await api(page,'/expense-control/debts','POST',{
      request_key:crypto.randomUUID(),...extra,recurrence:'once',responsibility:'shared',
      percent_one:50,installment_count:1,first_number:1,start_month:month,due_day:12,notes:null
    });
    expect(created.status,JSON.stringify(created.body)).toBe(201);
  }
  await page.goto('/expense-control');
  const scope=page.locator('.cg-page.cg-expense-web-mirror');
  const box=scope.locator('.cg-monthly-invoices');
  await expect(box).toBeVisible();
  // Banco de teste acumula fixtures de outros cenários; conte apenas esta instituição.
  await expect(box.locator('.cg-invoice-card').filter({hasText:'Instituição Fatura '+stamp})).toHaveCount(2);
  await expect(box.locator('.cg-invoice-card').filter({hasText:'Outra instituição '+stamp})).toHaveCount(1);
  await expect(box).toContainText('Empréstimos');
  await expect(box).toContainText('R$ 127,45');
  await expect(box).toContainText('R$ 999,90');
  const invoice=box.locator('.cg-invoice-card').filter({hasText:'Instituição Fatura '+stamp}).filter({hasText:'Cartão de Crédito'});
  await expect(invoice).toBeVisible();
  await expect(invoice).toContainText('Cartão de Crédito');
  await expect(invoice.locator(':scope > strong > b')).toHaveText('R$ 350,00');
  await expect(invoice.locator('.cg-invoice-balance')).toContainText('Em aberto');
  await expect(invoice.locator('.cg-invoice-description small')).toContainText('Vencimento:');
  await expect(invoice.locator('.cg-invoice-symbol')).toBeHidden();
  await expect(invoice.locator(':scope > svg:last-child')).toBeHidden();
  const metrics=await invoice.evaluate(el=>{
    const cost=el.querySelector('strong')!;
    const due=el.querySelector('.cg-invoice-description small')!;
    const valueBox=cost.getBoundingClientRect();
    const dueBox=due.getBoundingClientRect();
    const card=el.getBoundingClientRect();
    const s=getComputedStyle(el);
    return {
      valueWidth:valueBox.width, xValue:valueBox.left, xDue:dueBox.left,
      yDelta:Math.abs(valueBox.top+valueBox.height/2-dueBox.top-dueBox.height/2),
      columns:s.gridTemplateColumns.split(' ').length,
      gridRow:getComputedStyle(cost).gridRowStart,
      width:card.width,height:card.height,
      overflow:cost.scrollWidth>cost.clientWidth,
      bg:s.backgroundImage
    };
  });
  expect(metrics.columns,JSON.stringify(metrics)).toBe(2);
  expect(metrics.valueWidth).toBeGreaterThan(65);
  expect(metrics.xValue).toBeGreaterThan(metrics.xDue);
  expect(metrics.yDelta).toBeLessThan(15);
  expect(metrics.height).toBeLessThan(130);
  expect(metrics.overflow).toBe(false);
  expect(metrics.bg).toContain('linear-gradient');
  const rows=box.locator('.cg-invoice-grid');
  await expect(rows).toHaveCSS('grid-template-columns',/^[0-9.]+px$/);
  await box.screenshot({path:out+'/web-invoices-bars-3-items.png'});
  await page.screenshot({path:out+'/web-invoices-amount-visible.png',fullPage:true});
  await invoice.click();
  await expect(page.getByRole('heading',{name:'Gastos e parcelas'})).toBeVisible();
});

test('Faturas Web em janela estreita permanecem legíveis e mobile não recebe CSS Web',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await login(page);
  await desktop(page);
  await page.goto('/expense-control');
  await page.setViewportSize({width:800,height:800});
  await expect(page.locator('.shell.layout-mobile')).toBeVisible();
  const total=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(total).toBeLessThanOrEqual(803);
  await expect(page.locator('.cg-page.cg-expense-web-mirror')).toHaveCount(0);
  await expect(page.locator('.arl-expense-bottom')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>localStorage.setItem('arl-layout-mode','mobile'));
  await page.reload();
  await expect(page.locator('.cg-page.cg-mobile:not(.cg-expense-web-mirror)')).toBeVisible();
  await expect(page.locator('.cg-page.cg-mobile .cg-mobile-summary')).toBeVisible();
  await page.setViewportSize({width:1280,height:800});
  await expect(page.locator('.cg-page.cg-expense-web-mirror')).toBeVisible();
});
