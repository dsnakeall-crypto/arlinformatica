import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {login} from './helpers';
test('Clientes: primeira e segunda abertura exibem cartoes reais',async({page})=>{
 await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});
 await page.reload();
 const report=[];
 for(let n=0;n<3;n++){
  if(n)await page.getByRole('button',{name:'Painel',exact:true}).click();
  const at=Date.now();
  const observed:any[]=[];
  const onResponse=async(r:any)=>{if(new URL(r.url()).pathname==='/api/clients'&&r.request().method()==='GET')observed.push({status:r.status(),body:await r.json().catch(()=>null)});};
  page.on('response',onResponse);
  await page.getByRole('button',{name:'Clientes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Gestão de Clientes'})).toBeVisible();
  const headingMs=Date.now()-at;
  const rows=page.locator('.client-list article');
  await expect(rows.first()).toBeVisible({timeout:7000});
  const firstCardMs=Date.now()-at;
  await page.waitForTimeout(400);
  const expected=observed.at(-1)?.body?.data;
  if(Array.isArray(expected)){
   await expect(rows).toHaveCount(expected.length);
   if(expected.length)await expect(rows.first()).toContainText(expected[0].name);
  }
  report.push({run:n+1,headingMs,firstCardMs,requests:observed.length,httpStatus:observed.at(-1)?.status??null,displayedRows:await rows.count(),expectedRows:Array.isArray(expected)?expected.length:null});
  page.off('response',onResponse);
 }
 mkdirSync('output/performance-audit-20261011',{recursive:true});
 writeFileSync('output/performance-audit-20261011/clients-painted.json',JSON.stringify(report,null,2));
 console.log('ARL_CLIENTS_PAINTED',JSON.stringify(report));
 expect(report.every(x=>x.displayedRows>0&&(x.expectedRows===null||x.expectedRows===x.displayedRows))).toBeTruthy();
});