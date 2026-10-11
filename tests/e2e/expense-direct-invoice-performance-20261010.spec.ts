import {test,expect} from '@playwright/test';
import {api,login} from './helpers';

test('Fatura consolidada abre diretamente as compras filtradas, sem tela intermediária',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});
 await page.reload();
 const suffix=Date.now().toString(),month=new Date().toLocaleDateString('sv-SE').slice(0,7);
 const bank=await api(page,'/expense-control/catalogs/institutions','POST',{name:'Banco Diagnóstico '+suffix,active:true,due_day:12,color:'#3355bb'});
 expect(bank.status).toBe(200);
 const kind=await api(page,'/expense-control/catalogs/types','POST',{name:'Cartão de Crédito '+suffix,active:true});
 expect(kind.status).toBe(200);
 for(let i=0;i<2;i++){
  const r=await api(page,'/expense-control/debts','POST',{
   request_key:crypto.randomUUID(),institution_id:bank.body.id,type_id:kind.body.id,
   name:'Compra agrupada '+i+' '+suffix,recurrence:'once',responsibility:'shared',percent_one:50,
   amount_cents:19900+i*1000,installment_count:1,first_number:1,start_month:month,due_day:12,notes:null
  });expect(r.status).toBe(201);
 }
 await page.goto('/expense-control');
 await expect(page.locator('.cg-mobile-summary')).toBeVisible({timeout:15000});
 const invoice=page.locator('.cg-monthly-invoices .cg-invoice-card').filter({hasText:'Banco Diagnóstico '+suffix});
 await expect(invoice).toHaveCount(1);
 await invoice.click();
 await expect(page.getByRole('tab',{name:'Gastos'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.cg-type-grid')).toHaveCount(0);
 await expect(page.locator('.cg-bank-grid')).toHaveCount(0);
 await expect(page.locator('.cg-debt-row').filter({hasText:'Compra agrupada 0 '+suffix})).toBeVisible();
 await expect(page.locator('.cg-debt-row').filter({hasText:'Compra agrupada 1 '+suffix})).toBeVisible();
});

test('Fatura individual só muda para Gastos quando seu detalhe está pronto',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});await page.reload();
 const suffix=Date.now().toString(),month=new Date().toLocaleDateString('sv-SE').slice(0,7);
 const bank=await api(page,'/expense-control/catalogs/institutions','POST',{name:'Banco Parcela '+suffix,active:true,due_day:12,color:'#3355bb'});
 const kind=await api(page,'/expense-control/catalogs/types','POST',{name:'Empréstimo '+suffix,active:true});
 const r=await api(page,'/expense-control/debts','POST',{
   request_key:crypto.randomUUID(),institution_id:bank.body.id,type_id:kind.body.id,
   name:'Parcela direta '+suffix,recurrence:'once',responsibility:'shared',percent_one:50,
   amount_cents:18800,installment_count:1,first_number:1,start_month:month,due_day:12,notes:null
 });expect(r.status).toBe(201);
 await page.goto('/expense-control');
 await expect(page.locator('.cg-mobile-summary')).toBeVisible({timeout:15000});
 const invoice=page.locator('.cg-monthly-invoices .cg-invoice-card').filter({hasText:'Banco Parcela '+suffix});
 await expect(invoice).toBeVisible();
 await invoice.click();
 await expect(page.getByRole('tab',{name:'Gastos'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('heading',{name:'Parcela direta '+suffix})).toBeVisible();
 await expect(page.locator('.cg-type-grid,.cg-bank-grid')).toHaveCount(0);
});
