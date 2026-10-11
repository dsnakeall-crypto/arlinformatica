import {expect,test} from '@playwright/test';
import {login, api, uniqueDocument} from './helpers';
import {createOwnerExample, openMonth} from './expense-indicators-fixture';
import {mkdirSync} from 'node:fs';
const out='output/mobile-referencia-fiel-20261009';
test('Controle de Gastos: resumo, projeção, pagamentos, instituições e quitadas seguem referência mobile',async({page})=>{
 mkdirSync(out,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await login(page);
 await createOwnerExample(page);
 await openMonth(page);
 await expect(page.getByRole('navigation',{name:'Menu do Controle de Gastos'})).toBeVisible();
 const pageRoot=page.locator('.cg-page.cg-mobile');
 await expect(pageRoot).toBeVisible();
 await expect(pageRoot.locator('.cgo-indicators>.cgo-indicator')).toHaveCount(5);
 await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
 const grid=await pageRoot.locator('.cgo-indicators').evaluate(n=>({
  cols:getComputedStyle(n).gridTemplateColumns,
  b:n.getBoundingClientRect().width,
  month:n.querySelector('.cgo-month')!.getBoundingClientRect().width,
  row:n.querySelector('.cgo-one')!.getBoundingClientRect().width
 }));
 expect(grid.month).toBeGreaterThan(grid.row*1.6);
 await page.screenshot({path:out+'/01-resumo-topo-390.png',fullPage:true});
 const bar=page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
 await bar.getByRole('button',{name:'Projeção'}).click();
 await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
 await expect(page.getByRole('navigation',{name:'Submenus de gastos e projeção'}).getByRole('button',{name:'Projeção futura'})).toBeVisible();
 await page.screenshot({path:out+'/02-projecao-390.png',fullPage:true});
 await page.getByRole('navigation',{name:'Submenus de gastos e projeção'}).getByRole('button',{name:'Pagamentos'}).click();
 await expect(page.locator('.cg-payment-institutions')).toBeVisible();
 await expect(page.getByText('Carregando pagamentos…')).not.toBeVisible();
 await page.screenshot({path:out+'/03-pagamentos-390.png',fullPage:true});
 await bar.getByRole('button',{name:'Instituições'}).click();
 await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
 const cards=page.locator('.cg-bank-grid>.cg-institution');
 await expect(cards.first()).toBeVisible();
 await expect(page.locator('.cg-type-manager-mobile')).toBeVisible();
 await expect(page.getByRole('button',{name:/Cadastrar tipo de dívida/i})).toBeVisible();
 const style=await page.locator('.cg-bank-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
 expect(style.split(' ').length).toBe(2);
 await page.screenshot({path:out+'/04-instituicoes-390.png',fullPage:true});
 await bar.getByRole('button',{name:'Resumo'}).click();
 await page.setViewportSize({width:320,height:768});
 await expect(pageRoot.locator('.cgo-indicators')).toBeVisible();
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport+1);
 await page.screenshot({path:out+'/05-resumo-320.png',fullPage:true});
});
test('Ordens mobile: número, data e nomes curtos/longos centralizados sem alterar ações',async({page})=>{
 mkdirSync(out,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await login(page);
 const stamp=Date.now();
 const clients=[] as number[];
 for(const [i,label] of ['Cliente Nome Longo da Empresa Contabilidade Teste','Cliente Teste Curto'].entries()){
  const client=await api(page,'/clients','POST',{name:label,document:uniqueDocument(stamp+i),phone:'35999990000',postal_code:'37160000',street:'Rua Teste',number:String(i+1),district:'Centro',city:'Campos Gerais',state:'MG'});
  expect(client.status).toBe(201);clients.push(client.body.id);
 }
 const equipment=await api(page,'/catalogs/equipment');expect(equipment.body.length).toBeGreaterThan(0);
 for(const id of clients){
  const order=await api(page,'/orders','POST',{client_id:id,equipment_type_id:equipment.body[0].id,
    manufacturer_id:null,equipment_description:'Notebook de teste',attendance_type:'bench',reported_problem:'Teste de centralização da OS',system_password_absent:true,checklist:[]});
  expect(order.status,JSON.stringify(order.body)).toBe(201);
 }
 await page.getByRole('button',{name:'Abrir menu'}).click();
 await page.getByRole('navigation',{name:'Menu lateral compacto'}).getByRole('button',{name:'Ordens'}).click();
 const list=page.locator('.orders-order-list');
 await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
 await expect(list).toBeVisible();
 const rows=list.locator('tr.order-row');
 await expect(rows.first()).toBeVisible();
 const coordinates=await rows.first().evaluate(row=>{
  const area=row.getBoundingClientRect(), num=row.querySelector('td:nth-child(1)')!.getBoundingClientRect(),
        customerElement=row.querySelector('.order-customer'),
        customer=customerElement?.getBoundingClientRect(),
        numStyle=getComputedStyle(row.querySelector('.arl-order-number')!),
        nameStyle=customerElement?.querySelector('strong')?getComputedStyle(customerElement.querySelector('strong')!):null;
  return {row:center(area),num:center(num),name:customer?center(customer):null,
    numberAlign:numStyle.justifyContent,nameAlign:nameStyle?.textAlign};
  function center(rect:DOMRect){return rect.x+rect.width/2}
 });
 expect(Math.abs(coordinates.row-coordinates.num)).toBeLessThan(4);
 if(coordinates.name!==null) expect(Math.abs(coordinates.row-coordinates.name)).toBeLessThan(4);
 expect(coordinates.nameAlign).toBe('center');
 await page.screenshot({path:out+'/06-ordens-centralizadas-390.png',fullPage:true});
});
