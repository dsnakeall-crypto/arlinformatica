import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { login } from './helpers';

test('Carga de clientes: medir lista completa, paginada e pesquisa sem alterar dados reais', async({page})=>{
 const out='output/performance-audit-20261010';
 mkdirSync(out,{recursive:true});
 await page.setViewportSize({width:1440,height:900});
 await login(page);
 await page.evaluate(()=>localStorage.setItem('arl-layout-mode','desktop'));
 await page.reload();
 const measure=async(url:string)=>{
  const time=Date.now();
  const response=await page.request.get(url);
  const body=await response.body();
  const json=JSON.parse(body.toString('utf8'));
  return {status:response.status(),timeMs:Date.now()-time,bytes:body.byteLength,
   count:Array.isArray(json.data)?json.data.length:-1,total:json.total||null};
 };
 const cold=await measure('/api/clients?all=1');
 // Exact guard in fixture: only e2e.sqlite can be seeded, never MySQL.
 const seed=execFileSync('php',['tests/e2e/fixtures/seed-performance-clients.php','5000'],
  {cwd:process.cwd(),env:{...process.env,ARL_PERF_FIXTURE_ALLOWED:'yes'},encoding:'utf8'});
 expect(seed).toContain('FIXTURE_OK=5000');
 const full1=await measure('/api/clients?all=1');
 const full2=await measure('/api/clients?all=1');
 const paged=await measure('/api/clients?per_page=20');
 const filteredHttp=await measure('/api/clients?q='+encodeURIComponent('ARL PERF Cliente 04999')+'&sort=name&page=1&per_page=12');
 expect(full1.status).toBe(200); expect(paged.status).toBe(200);
 expect(full1.count).toBeGreaterThanOrEqual(5000);
 expect(paged.count).toBe(20);
 expect(filteredHttp.count).toBe(1);
 const clientRequests:string[]=[];
 page.on('request',request=>{
  if(request.url().includes('/api/clients?'))clientRequests.push(request.url());
 });
 await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Menu principal'});
 const started=Date.now();
 await nav.getByRole('button',{name:'Clientes'}).click();
 await expect(page.locator('.clients-list-panel .clients-row').first()).toBeVisible({timeout:25000});
 const navigationMs=Date.now()-started;
 expect(clientRequests.some(url=>url.includes('all=1')),'A tela nao pode baixar todos os clientes').toBe(false);
 expect(clientRequests.some(url=>url.includes('per_page=12')),'A tela deve usar paginacao').toBe(true);
 await expect(page.getByText(String(full1.count)+' clientes encontrados')).toBeVisible();
 await page.getByRole('button',{name:'Próxima página'}).click();
 await expect(page.getByText('Página 2 de '+Math.ceil(full1.count/12))).toBeVisible();
 const find=page.getByRole('textbox',{name:'Buscar clientes'});
 const searchStart=Date.now();
 await find.fill('ARL PERF Cliente 04999');
 await expect(page.locator('.clients-row').filter({hasText:'ARL PERF Cliente 04999'})).toBeVisible();
 const searchMs=Date.now()-searchStart;
 const report={scenario:'Clientes com 5000 registros sinteticos SQLite E2E',cold,full1,full2,paged,filteredHttp,
  navigationMs,searchMs,ratioFullToPage:Math.round(full1.bytes/paged.bytes)};
 writeFileSync(out+'/clients-large-load.json',JSON.stringify(report,null,2));
 console.log('CLIENTS_PERF',JSON.stringify(report));
});
