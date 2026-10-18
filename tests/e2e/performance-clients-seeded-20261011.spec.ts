import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {api,login,uniqueDocument} from './helpers';

test('Clientes: dados ficticios realmente visiveis em abertura fria e quente',async({page})=>{
 await login(page);
 await page.evaluate(()=>{localStorage.setItem('arl-layout-mode','desktop');localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));});
 await page.reload();
 const stamp=Date.now();
 const name='Visual Audit '+stamp;
 const created=await api(page,'/clients','POST',{name,document:uniqueDocument(stamp),phone:'35988880001',postal_code:'37160000',street:'Rua Teste',number:'1',district:'Centro',city:'Campos Gerais',state:'MG',complement:''});
 expect(created.status).toBe(201);
 const results=[];
 for(let i=0;i<3;i++){
   if(i)await page.getByRole('button',{name:'Painel',exact:true}).click();
   if(i===0)await page.reload();
   const start=Date.now();
   await page.getByRole('button',{name:'Clientes',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Gestão de Clientes'})).toBeVisible();
   const headingMs=Date.now()-start;
   const search=page.getByLabel('Buscar clientes');
   await search.fill(name);
   const row=page.locator('.client-list article').filter({hasText:name});
   await expect(row).toBeVisible({timeout:8000});
   const dataVisibleMs=Date.now()-start;
   results.push({iteration:i+1,headingMs,dataVisibleMs,visibleCount:await row.count()});
 }
 mkdirSync('output/performance-audit-20261011',{recursive:true});
 writeFileSync('output/performance-audit-20261011/clients-visual-seeded.json',JSON.stringify(results,null,2));
 console.log('ARL_VISUAL_SEEDED',JSON.stringify(results));
 expect(results.every(r=>r.visibleCount===1)).toBeTruthy();
});