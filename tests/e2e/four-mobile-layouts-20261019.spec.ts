import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Antigo teste das quatro opções: após a decisão do proprietário, apenas Web e Premium.
test('Web / PC e Mobile Premium são as únicas opções da ARL', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:'Configurações'}).click();
  await page.getByRole('tab',{name:'Layouts'}).click();
  const group=page.getByRole('group',{name:'Opções de layout'});
  const buttons=group.locator('button.arl-layout-option');
  await expect(buttons).toHaveCount(2);
  await expect(group.getByRole('button',{name:'Web / PC'})).toBeVisible();
  await expect(group.getByRole('button',{name:'Mobile Premium'})).toBeVisible();
  await expect(group.getByRole('button',{name:/menu lateral compacto|barra inferior clássica/i})).toHaveCount(0);
  await group.getByRole('button',{name:'Mobile Premium'}).click();
  await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
  const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(nav).toBeVisible();
  await expect(nav.locator('button')).toHaveCount(5);
  expect(await nav.locator('button').evaluateAll(items=>items.map(i=>i.getAttribute('aria-label'))))
    .toEqual(['Painel','Clientes','Abrir OS','Gastos','Menu']);
  await nav.getByRole('button',{name:'Painel'}).click();
  await expect(page.locator('.arl-mobile-home-premium')).toBeVisible();
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
  await expect(page.locator('.arl-mobile-home-premium')).toBeVisible();
  await nav.getByRole('button',{name:'Menu'}).click();
  const sheet=page.getByRole('dialog',{name:'Menu'});
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button',{name:'Configurações'}).click();
  await page.getByRole('navigation',{name:'Categorias de Configurações'}).getByRole('button',{name:/Layouts/}).click();
  await group.getByRole('button',{name:'Web / PC'}).click();
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await expect(page.locator('.shell')).not.toHaveClass(/arl-mobile-premium-mode/);
});

test('preferências antigas bottom/compact são migradas para Premium',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const id=await page.evaluate(async()=>{
    const me=await (await fetch('/api/me',{headers:{Accept:'application/json'},credentials:'same-origin'})).json();
    return me.id as number;
  });
  for(const legacy of ['bottom','compact']){
    await page.evaluate(({key,value})=>{localStorage.setItem('arl-layout-mode','mobile');localStorage.setItem(key,value);},{key:'arl-mobile-nav-'+id,value:legacy});
    await page.reload();
    await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
    await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),'arl-mobile-nav-'+id)).toBe('premium');
  }
});
