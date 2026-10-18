import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { login } from './helpers';

test('Auditoria dos dados: clique ate fim das requisicoes e proximo frame', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
  const nav=page.getByRole('navigation',{name:'Menu principal'});
  await expect(nav).toBeVisible();
  const labels=['Painel','Ordens','Clientes','Serviços','Produtos','Fornecedores','Financeiro','Controle de Gasto','Pós-Venda','Configurações'];
  const report=[];
  for(const label of labels) {
    const pending=new Set<any>();
    const responses:{url:string,ms:number,ok:boolean}[]=[];
    const starts=new Map<any,number>();
    const onStart=(r:any)=>{if(r.url().includes('/api/')){pending.add(r);starts.set(r,Date.now());}};
    const onDone=(r:any)=>{if(starts.has(r)){responses.push({url:new URL(r.url()).pathname,ms:Date.now()-starts.get(r)!,ok:r.failure()===null});pending.delete(r);}};
    page.on('request',onStart);page.on('requestfinished',onDone);page.on('requestfailed',onDone);
    const button=nav.getByRole('button',{name:label,exact:true});
    const at=Date.now();
    await button.click();
    await expect(button).toHaveClass(/active/);
    const activeMs=Date.now()-at;
    let stableSince=Date.now();
    let timedOut=false;
    while(true){
      if(pending.size===0){if(Date.now()-stableSince>=180)break;}
      else stableSince=Date.now();
      if(Date.now()-at>6000){timedOut=true;break;}
      await page.waitForTimeout(35);
    }
    const httpSettledMs=Date.now()-at;
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const afterPaintMs=Date.now()-at;
    report.push({module:label,activeMs,httpSettledMs,afterPaintMs,requests:responses.length,failedRequests:responses.filter(r=>!r.ok).length,maxRequestMs:Math.max(0,...responses.map(r=>r.ms)),timedOut});
    page.off('request',onStart);page.off('requestfinished',onDone);page.off('requestfailed',onDone);
  }
  mkdirSync('output/performance-audit-20261011',{recursive:true});
  writeFileSync('output/performance-audit-20261011/navigation-http-settled.json',JSON.stringify(report,null,2));
  console.log('ARL_HTTP_SETTLED',JSON.stringify(report));
  expect(report).toHaveLength(labels.length);
  expect(report.every(x=>!x.timedOut && x.failedRequests===0)).toBeTruthy();
});
