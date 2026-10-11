import { expect,test } from '@playwright/test';
import { login } from './helpers';
import { mkdirSync,readFileSync } from 'node:fs';

const folder='output/pacote-mobile-final-20261009';

test('Gestor de Gastos usa barra 3D na ordem correta com cinco ícones',async({page})=>{
  mkdirSync(folder,{recursive:true});
  await login(page);
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'})
    .getByRole('button',{name:'Gestor de Gasto'}).click();
  const bar=page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
  await expect(bar).toBeVisible();
  const labels=await bar.locator('button').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label')));
  expect(labels).toEqual(['Resumo','Instituições','Adicionar dívida','Projeção','Gastos']);
  const sizes=await bar.locator('.arl-nav-icon-disc').evaluateAll(elements=>elements.map(el=>{
    const r=el.getBoundingClientRect();
    return {w:r.width,h:r.height,border:getComputedStyle(el).borderRadius};
  }));
  expect(sizes[2].w).toBeGreaterThan(sizes[0].w+10);
  for(const s of sizes)expect(s.border).toBe('50%');
  const picker=page.locator('.cg-month-compact').first();
  await expect(picker).toBeVisible();
  await expect(page.locator('.cgm-header .cg-create-action')).toHaveCount(0);
  const centered=await picker.evaluate(el=>{
    const pickerRect=el.getBoundingClientRect();
    const parentRect=el.parentElement!.getBoundingClientRect();
    return Math.abs((pickerRect.left+pickerRect.right)/2-(parentRect.left+parentRect.right)/2);
  });
  expect(centered).toBeLessThan(3);
  const outer=await picker.evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(outer).toBe('rgba(0, 0, 0, 0)');
  await bar.screenshot({path:folder+'/gastos-menu-390.png'});
});

test('card resumo confirma PDF local, e próximo pagamento abre popup',async({page})=>{
  await login(page);
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'})
    .getByRole('button',{name:'Gestor de Gasto'}).click();
  const top=page.locator('.cgo-indicators');
  await expect(top).toBeVisible();
  await expect(top.locator('.cgo-month .cgo-tag')).toHaveCount(0);
  const dialog=page.getByRole('dialog',{name:/Baixar resumo em PDF/i});
  for(const scope of ['month','one','two','shared']) {
    await top.locator('.cgo-'+scope+' .cgo-card-action').click();
    await expect(dialog).toBeVisible();
    const pending=page.waitForEvent('download');
    await dialog.getByRole('button',{name:'Confirmar e baixar PDF'}).click();
    const download=await pending;
    expect(download.suggestedFilename()).toMatch(new RegExp('^controle-gastos-detalhado-\\d{4}-\\d{2}-'+scope+'\\.pdf$'));
    const path=await download.path();
    expect(path).toBeTruthy();
    const contents=readFileSync(path!);
    expect(contents.subarray(0,4).toString()).toBe('%PDF');
    expect(contents.length).toBeGreaterThan(2000);
    await expect(dialog).toBeHidden();
  }
  await top.locator('.cgo-next .cgo-card-action').click();
  await expect(page.getByRole('dialog',{name:/Próximo pagamento/i})).toBeVisible();
  await page.getByRole('dialog',{name:/Próximo pagamento/i}).getByRole('button',{name:'Fechar',exact:true}).click();
});

test('lista de Instituições abre tipos de dívida via popup em vez da grade extensa',async({page})=>{
  await login(page);
  await page.getByRole('navigation',{name:'Navegação Mobile / Tablet'})
    .getByRole('button',{name:'Gestor de Gasto'}).click();
  const bar=page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
  await bar.getByRole('button',{name:'Instituições'}).click();
  const types=page.locator('.cg-type-manager-mobile');
  await expect(types).toBeVisible();
  await expect(types.locator('.cg-type-chips')).toBeHidden();
  await types.getByRole('button',{name:/Cadastrar tipo de dívida/}).click();
  await expect(page.getByRole('dialog',{name:/Tipos de dívida/})).toBeVisible();
});

test('OS: filtro AGU. PGTO compacto e nomes centralizados',async({page})=>{
  await login(page);
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('navigation',{name:'Menu lateral compacto'}).getByRole('button',{name:'Ordens'}).click();
  const tabs=page.locator('.order-tabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.locator('.order-awaiting-short')).toBeVisible();
  await expect(tabs.locator('.order-awaiting-full')).toBeHidden();
  const row=page.locator('.orders-order-list .order-customer').first();
  if(await row.count()){
    const style=await row.evaluate(el=>getComputedStyle(el).justifyContent);
    expect(style).toBe('center');
  }
});
