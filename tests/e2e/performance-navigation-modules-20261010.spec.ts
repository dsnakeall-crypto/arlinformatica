import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { login } from './helpers';

test('Auditoria de navegação: requisições dos principais módulos do ARL Web',async({page})=>{
  const out='output/performance-audit-20261010';
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(()=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
  const nav=page.getByRole('navigation',{name:'Menu principal'});
  await expect(nav).toBeVisible();
  const requests:{url:string,durationMs:number,success:boolean}[]=[];
  const starts=new Map<string,number>();
  page.on('request',r=>{
    if(!r.url().includes('/api/'))return;
    starts.set(r.url(),Date.now());
  });
  page.on('requestfinished',r=>{
    if(!r.url().includes('/api/'))return;
    requests.push({url:new URL(r.url()).pathname+new URL(r.url()).search,
      durationMs:Date.now()-(starts.get(r.url())||Date.now()),success:true});
  });
  page.on('requestfailed',r=>{
    if(!r.url().includes('/api/'))return;
    requests.push({url:new URL(r.url()).pathname+new URL(r.url()).search,
      durationMs:Date.now()-(starts.get(r.url())||Date.now()),success:false});
  });
  const report:{module:string, elapsedMs:number, calls:number, totalRequestMs:number, slowestMs:number, urls:string[]}[]=[];
  for(const label of ['Painel','Ordens','Clientes','Serviços','Produtos','Fornecedores','Financeiro','Controle de Gasto','Pós-Venda','Configurações']){
    const button=nav.getByRole('button',{name:label,exact:true});
    await expect(button).toBeVisible();
    requests.length=0;
    const at=Date.now();
    await button.click();
    await expect(button).toHaveClass(/active/);
    await page.waitForTimeout(950);
    const current=requests.slice();
    report.push({module:label,elapsedMs:Date.now()-at,calls:current.length,
      totalRequestMs:current.reduce((v,x)=>v+x.durationMs,0),
      slowestMs:Math.max(0,...current.map(x=>x.durationMs)),
      urls:current.map(x=>x.url)});
  }
  writeFileSync(out+'/navigation-modules-baseline.json',JSON.stringify(report,null,2));
  console.log('ARL_NAV_PROFILE',JSON.stringify(report));
  expect(report).toHaveLength(10);
});
