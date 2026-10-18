import {test,expect} from '@playwright/test';
import {login} from './helpers';
test('Diagnostico das interrupcoes de API',async({page})=>{
 await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});
 await page.reload();
 const nav=page.getByRole('navigation',{name:'Menu principal'});
 await expect(nav).toBeVisible();
 const events:any[]=[];
 page.on('request',r=>{if(r.url().includes('/api/'))events.push({event:'start',url:r.url(),at:Date.now()});});
 page.on('requestfailed',r=>{if(r.url().includes('/api/'))events.push({event:'failed',url:r.url(),error:r.failure(),at:Date.now()});});
 page.on('requestfinished',async r=>{if(r.url().includes('/api/'))events.push({event:'finished',url:r.url(),error:r.failure(),status:(await r.response())?.status(),at:Date.now()});});
 for(const label of ['Painel','Ordens','Clientes','Serviços','Produtos','Fornecedores','Financeiro','Controle de Gasto','Pós-Venda','Configurações']){
  await nav.getByRole('button',{name:label,exact:true}).click();
  await page.waitForTimeout(550);
 }
 console.log('ARL_API_DIAGNOSTIC',JSON.stringify(events));
 expect(events.filter(x=>x.event==='failed' && !/ERR_ABORTED|NS_BINDING_ABORTED/i.test(x.error||''))).toEqual([]);
});