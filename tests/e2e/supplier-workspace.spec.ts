import { test, expect } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';
test('ficha profissional com vinte fornecedores, vínculos, documentos, devolução e mobile', async ({page}) => {
 await page.setViewportSize({width:1440,height:1000});
 await login(page); const stamp=Date.now(); let supplier:any;
 const checkFrame=async () => {
   const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
   const box=await dialog.boundingBox(); expect(box).not.toBeNull();
   expect(box!.width).toBe(1180); expect(box!.height).toBe(760);
   await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeInViewport();
   await expect(dialog.getByRole('button',{name:'Confirmar e salvar',exact:true})).toBeInViewport();
 };
 for(let i=0;i<20;i++) { const result=await api(page,'/suppliers','POST',{name:`Parceiro profissional ${stamp} ${String(i).padStart(2,'0')}`,trade_name:`Fornecedor ${i+1}`,document:uniqueDocument(stamp+i),phone:'35999991234',whatsapp:'35999991234',postal_code:'37160000',street:'Rua Comercial',number:String(i+1),district:'Centro',city:'Campos Gerais',state:'MG'}); expect(result.status).toBe(201); if(i===0) supplier=result.body; }
 const product=(await api(page,'/catalogs/products','POST',{name:`SSD Workspace ${stamp}`,price_cents:48000,stock_quantity:0,active:true,warranty_enabled:false})).body;
 const purchase=(await api(page,`/suppliers/${supplier.id}/purchases`,'POST',{request_key:crypto.randomUUID(),purchased_on:'2026-10-03',received_now:true,items:[{product_id:product.id,quantity:3,unit_cost_cents:20000,lot:'L-2026'}]})).body;
 await page.goto('/suppliers'); await page.getByLabel('Buscar fornecedor').fill(`Parceiro profissional ${stamp}`); await expect(page.locator('.supplier-directory-row')).toHaveCount(20);
 await page.screenshot({path:'output/fornecedores/nova-lista-desktop.png',fullPage:true});
 await page.locator('.supplier-directory-row').filter({hasText:supplier.name}).click();
 await page.getByRole('tab',{name:'Visão geral',exact:true}).click(); await expect(page.getByText('Compras registradas', {exact:true})).toBeVisible();
 await page.screenshot({path:'output/fornecedores/nova-ficha-desktop.png',fullPage:true});
 await page.getByRole('tab',{name:'Dados comerciais',exact:true}).click(); await page.getByRole('button',{name:'Editar dados comerciais'}).click();
 await checkFrame(); await page.screenshot({path:'output/fornecedores/comercial-padrao-desktop.png'});
 await page.setViewportSize({width:390,height:844}); const mobileBox=await page.getByRole('dialog').boundingBox(); expect(mobileBox!.width).toBe(366); expect(mobileBox!.height).toBe(760); await expect(page.getByRole('dialog').getByRole('button',{name:'Confirmar e salvar'})).toBeInViewport(); await page.screenshot({path:'output/fornecedores/comercial-padrao-mobile.png'}); await page.setViewportSize({width:1440,height:1000});
 const modal=page.getByRole('dialog'); await modal.getByLabel('Prazo de pagamento (dias)').fill('30'); await modal.getByLabel('Chave Pix',{exact:true}).fill('teste@example.com'); await modal.getByLabel('Conferi os dados').check(); await modal.getByRole('button',{name:'Confirmar e salvar'}).click(); await expect(modal).not.toBeVisible(); await expect(page.getByText('teste@example.com')).toBeVisible();
 await page.getByRole('tab',{name:'Produtos fornecidos',exact:true}).click(); await page.getByRole('button',{name:'Vincular produto'}).click(); await checkFrame(); await page.getByRole('dialog').getByLabel('Pesquisar produto').fill(product.name); await expect(page.getByRole('dialog').getByLabel('Produto',{exact:true}).locator('option')).toHaveCount(2); await page.getByRole('dialog').getByLabel('Produto',{exact:true}).selectOption(String(product.id)); await page.getByRole('dialog').getByLabel('Custo informado').fill('20000'); await page.getByRole('dialog').getByLabel('Conferi os dados').check(); await page.getByRole('dialog').getByRole('button',{name:'Confirmar e salvar'}).click(); await expect(page.locator('.supplier-offering')).toContainText(product.name);
 await page.getByRole('tab',{name:'Documentos',exact:true}).click(); await page.getByRole('button',{name:'Anexar documento',exact:true}).click(); await checkFrame(); await page.getByRole('dialog').getByLabel('Arquivo PDF').setInputFiles({name:'nota.xml',mimeType:'text/xml',buffer:Buffer.from('<?xml version="1.0"?><nfe><numero>123</numero></nfe>')}); await page.getByRole('dialog').getByLabel('Conferi os dados').check(); await page.getByRole('dialog').getByRole('button',{name:'Confirmar e salvar'}).click(); await expect(page.locator('.supplier-document-row')).toContainText('nota.xml');
 await page.getByRole('tab',{name:'Devoluções',exact:true}).click(); await page.getByRole('button',{name:'Registrar devolução'}).click(); await checkFrame(); const item=(await api(page,`/supplier-purchases/${purchase.id}`)).body.items[0]; await page.getByRole('dialog').getByLabel('Produto recebido').selectOption(String(item.id)); await page.getByRole('dialog').getByLabel('Motivo da devolução').fill('Produto defeituoso'); await page.getByRole('dialog').getByLabel('Acordo com fornecedor').selectOption('credit'); await page.getByRole('dialog').getByLabel('Conferi os dados').check(); await page.getByRole('dialog').getByRole('button',{name:'Confirmar e salvar'}).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.getByText('Produto defeituoso')).toBeVisible();
 await page.getByRole('tab',{name:'Relatórios',exact:true}).click(); await expect(page.getByText('L-2026',{exact:false})).toBeVisible();
 await page.getByLabel('Layout neste dispositivo').selectOption('mobile'); await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'output/fornecedores/nova-ficha-mobile.png',fullPage:true}); expect(await page.locator('.supplier-page').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
});
