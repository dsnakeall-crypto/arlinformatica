import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {login, api, uniqueDocument} from './helpers';

const out='output/final-arl-web-20261010';
test.beforeAll(()=>mkdirSync(out,{recursive:true}));
test('Controle de Gastos Web usa resumo e acabamento do mobile sem perder menu de computador',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await login(page);
 await page.evaluate(()=>{
  localStorage.setItem('arl-layout-mode','desktop');
  localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
 });
 await page.reload();
 const nav=page.getByRole('navigation',{name:'Menu principal'});
 // O resumo inicial usa uma conta vazia e é remontado quando a configuração
 // chega. Visibilidade sozinha pode capturar um nó removido entre evaluate e
 // getComputedStyle; aguardar as respostas reais e o commit de carregamento.
 const [configurationResponse,summaryResponse]=await Promise.all([
  page.waitForResponse(response=>new URL(response.url()).pathname==='/api/expense-control/configuration' && response.request().method()==='GET'),
  page.waitForResponse(response=>new URL(response.url()).pathname==='/api/expense-control/summary' && response.request().method()==='GET'),
  nav.getByRole('button',{name:'Controle de Gasto'}).click(),
 ]);
 expect(configurationResponse.status()).toBe(200);
 expect(summaryResponse.status()).toBe(200);
 const main=page.locator('main[data-arl-expense-control-react="1"]');
 const shell=page.locator('.shell.layout-desktop');
 await expect(main.locator('.cg-page.cg-expense-web-mirror')).toBeVisible();
 await expect(main.locator('.cg-loading')).toHaveCount(0);
 await expect(main.locator('.cg-alert')).toHaveCount(0);
 await expect(main.locator('.cg-mobile-summary')).toBeVisible();
 await expect(main.locator('.cgo-indicators')).toBeVisible();
 await expect(main.locator('.cgo-indicators>.cgo-indicator')).toHaveCount(5);
 await expect(main.locator('.cgo-people')).toBeVisible();
 await expect(main.locator('.cg-monthly-invoices')).toBeVisible();
 await expect(main.locator('.cg-navigation .cg-tabs')).toBeVisible();
 await expect(shell).not.toHaveClass(/arl-expense-workspace/);
 await expect(nav.getByRole('button',{name:'Painel'})).toBeVisible();
 const background=await main.locator('.cgo-indicators>.cgo-indicator').first().evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(background).toContain('gradient');
 const cssGrid=await main.locator('.cgo-indicators').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
 expect(cssGrid.split(' ').length).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1442);
 await page.screenshot({path:out+'/expense-web-mirror.png'});
 await nav.getByRole('button',{name:'Gastos',exact:false}).count().catch(()=>0);
 await nav.getByRole('button',{name:'Painel'}).click();
 await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();
});

test('Controle de Gastos mobile continua independente com o mesmo resumo aprovado',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await login(page);
 await page.evaluate(()=>localStorage.setItem('arl-layout-mode','mobile'));
 await page.reload();
 const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
 await nav.getByRole('button',{name:'Gestor de Gasto'}).click();
 await expect(page.locator('.shell.arl-expense-workspace')).toBeVisible();
 await expect(page.locator('.cg-page.cg-mobile:not(.cg-expense-web-mirror) .cg-mobile-summary')).toBeVisible();
 await expect(page.locator('.cg-mobile .cgo-indicators')).toBeVisible();
 await page.screenshot({path:out+'/expense-mobile-preserved.png'});
});

test('Web Clean: ícones sem aro, status preenchidos e hierarquia visual da OS',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await login(page);
 await page.evaluate(()=>{
  localStorage.setItem('arl-layout-mode','desktop');
  localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
 });
 await page.reload();
 const stamp=Date.now();
 const name='Cliente UI Final '+stamp;
 const client=await api(page,'/clients','POST',{
  name,document:uniqueDocument(stamp),phone:'35999997777',postal_code:'37160000',street:'Rua Teste',number:'12',district:'Centro',city:'Campos Gerais',state:'MG'
 });
 expect(client.status,JSON.stringify(client.body)).toBe(201);
 const equipment=await api(page,'/catalogs/equipment');
 const order=await api(page,'/orders','POST',{
  client_id:client.body.id,equipment_type_id:equipment.body[0].id,
  manufacturer_id:null,equipment_description:'Notebook',equipment_details:'Carregador',
  attendance_type:'bench',reported_problem:'Teste do relato azul',checklist:[]
 });
 expect(order.status,JSON.stringify(order.body)).toBe(201);
 const nav=page.getByRole('navigation',{name:'Menu principal'});
 await nav.getByRole('button',{name:'Ordens'}).click();
 const row=page.locator('.orders-order-list tr.order-row').filter({hasText:name});
 await expect(row).toBeVisible();
 const status=row.locator('.row-status');
 const bg=await status.evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(bg).toContain('linear-gradient');
 const info=await row.evaluate(el=>{
  const s=(selector:string)=>getComputedStyle(el.querySelector(selector)!);
  const button=el.querySelector('.order-view')!;
  return {
   number:s('.arl-order-number b').color,date:s('.arl-order-opened-at').color,
   report:s('.order-client-report').color,border:s('.order-view').borderWidth,
   shadow:s('.order-view').boxShadow,icon:s('.order-view').backgroundImage,
   iconSize:s('.order-view').backgroundSize,whatsapp:s('.order-whatsapp img').width,
   buttonWidth:getComputedStyle(button).width
  };
 });
 expect(info.number).toBe('rgb(196, 0, 46)');
 expect(info.date).toBe('rgb(18, 130, 75)');
 expect(info.report).toBe('rgb(31, 62, 107)');
 expect(info.border).toBe('0px');
 expect(info.shadow).toBe('none');
 expect(info.icon).toContain('icon-web-eye-compact-2x.png');
 expect(info.iconSize).toBe('18px 18px');
 await page.screenshot({path:out+'/orders-final.png'});
 await nav.getByRole('button',{name:'Clientes'}).click();
 const clientRow=page.locator('.clients-row').filter({hasText:name});
 await expect(clientRow).toBeVisible();
 const eye=clientRow.getByRole('button',{name:'Visualizar'});
 await expect(eye).toBeVisible();
 expect(await eye.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('icon-web-eye-compact-2x.png');
 const clipboard=clientRow.getByRole('button',{name:'Nova OS para este cliente'});
 await expect(clipboard).toBeVisible();
 const clipStyle=await clipboard.evaluate(el=>({
  border:getComputedStyle(el).borderWidth,
  shadow:getComputedStyle(el).boxShadow,
  iconWidth:getComputedStyle(el.querySelector('svg')!).width
 }));
 expect(clipStyle.border).toBe('0px');
 expect(clipStyle.shadow).toBe('none');
 expect(clipStyle.iconWidth).toBe('18px');
 await page.screenshot({path:out+'/clients-final.png'});
});

test('Web Original mantém aparência sem regras Clean',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await login(page);
 await page.evaluate(()=>{
  localStorage.setItem('arl-layout-mode','desktop');
  localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'}));
 });
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-arl-appearance','original');
 const selected=page.locator('#arl-main-sidebar .nav-group button.active').first();
 const bg=await selected.evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(bg).not.toContain('rgb(113, 116, 123)');
});
