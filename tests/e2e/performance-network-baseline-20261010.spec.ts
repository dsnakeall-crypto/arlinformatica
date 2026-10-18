import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { login } from './helpers';

const output = 'output/performance-audit-20261010';

async function prepare(page:Page) {
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(()=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
}

test('baseline: quantas chamadas o filtro Ordenar repete no Controle de Gastos', async ({page})=>{
  mkdirSync(output,{recursive:true});
  await prepare(page);
  await page.goto('/expense-control');
  await expect(page.locator('.cg-expense-web-mirror')).toBeVisible();
  await page.getByRole('tab',{name:'Gastos'}).click();
  await expect(page.getByLabel('Ordenar')).toBeVisible();
  // Medir o cenário real de usuário com página já carregada, não a primeira abertura.
  await expect(page.locator('.cg-loading')).toHaveCount(0,{timeout:20000});
  await page.waitForTimeout(120);

  const calls:{path:string,method:string,durationMs:number}[]=[];
  const started=new Map<string,number>();
  page.on('request',r=>{
    if(!r.url().includes('/api/expense-control/'))return;
    started.set(r.url(),Date.now());
  });
  page.on('requestfinished',r=>{
    if(!r.url().includes('/api/expense-control/'))return;
    calls.push({path:new URL(r.url()).pathname+new URL(r.url()).search,method:r.method(),durationMs:Date.now()-(started.get(r.url())||Date.now())});
  });

  const t=Date.now();
  const pending=page.waitForResponse(r=>r.url().includes('/api/expense-control/debts?')&&r.url().includes('sort=oldest')&&r.ok());
  await page.getByLabel('Ordenar').selectOption('oldest');
  await pending;
  await page.waitForTimeout(450);
  const report={scenario:'Filtro Ordenar no Gestor de Gastos',totalMs:Date.now()-t,requests:calls};
  writeFileSync(output+'/expense-sort-before.json',JSON.stringify(report,null,2));
  expect(calls.some(x=>x.path.includes('/debts?'))).toBe(true);
  expect(calls.filter(x=>x.path.includes('/configuration') || x.path.includes('/summary?'))).toHaveLength(0);
  // Segurança financeira: ao voltar ao Resumo, saldos são buscados de novo.
  const refresh = page.waitForResponse(r=>r.url().includes('/api/expense-control/summary?')&&r.ok());
  await page.getByRole('tab',{name:'Resumo'}).click();
  await refresh;
  console.log('REQUEST_BASELINE',JSON.stringify(report));
});
