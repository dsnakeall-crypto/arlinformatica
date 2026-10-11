import {test,expect} from '@playwright/test';
import {login} from './helpers';

test('Mobile: barra inferior não intercepta salvar Entrada Rápida em popup',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('arl-layout-mode','mobile'));
  await login(page);
  await expect(page.locator('.arl-global-mobile-nav')).toBeVisible();
  await page.getByRole('button',{name:'Abrir Entrada Rápida'}).click();
  const modal=page.locator('.quick-entry');
  await expect(modal).toBeVisible();
  const nav=page.locator('.arl-global-mobile-nav');
  await expect(nav).toHaveCSS('pointer-events','none');
  await modal.getByLabel('Valor recebido (R$)').fill('12,34');
  const reply=page.waitForResponse(r=>r.url().endsWith('/api/finance/quick-entry') && r.request().method()==='POST');
  await modal.getByRole('button',{name:'Registrar entrada avulsa'}).click({timeout:7000});
  expect((await reply).status()).toBe(201);
  await expect(modal).toHaveCount(0);
  await expect(nav).toHaveCSS('pointer-events','auto');
  await expect(nav.getByRole('button')).toHaveCount(5);
});
