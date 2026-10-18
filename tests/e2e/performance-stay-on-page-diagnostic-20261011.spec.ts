import {test,expect} from '@playwright/test';
import {login} from './helpers';
test('Ordens e Serviços concluem dados ao permanecer na tela',async({page})=>{
 await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});
 await page.reload();
 const nav=page.getByRole('navigation',{name:'Menu principal'});
 await expect(nav).toBeVisible();
 const result:any[]=[];
 for(const [label,path] of [['Ordens','/api/orders?'],['Serviços','/api/catalogs/services?'],['Controle de Gasto','/api/expense-control/summary?']]){
  const events:any[]=[];
  const start=(r:any)=>{if(r.url().includes(path))events.push({phase:'start',url:r.url()});};
  const finish=async(r:any)=>{if(r.url().includes(path))events.push({phase:'end',status:(await r.response())?.status()});};
  const fail=(r:any)=>{if(r.url().includes(path))events.push({phase:'fail',error:r.failure()?.errorText});};
  page.on('request',start);page.on('requestfinished',finish);page.on('requestfailed',fail);
  await nav.getByRole('button',{name:label,exact:true}).click();
  await page.waitForTimeout(1800);
  result.push({label,events});
  page.off('request',start);page.off('requestfinished',finish);page.off('requestfailed',fail);
 }
 console.log('ARL_STAY_DIAG',JSON.stringify(result));
 expect(result.every(x=>x.events.some((e:any)=>e.phase==='end'&&e.status===200))).toBeTruthy();
});