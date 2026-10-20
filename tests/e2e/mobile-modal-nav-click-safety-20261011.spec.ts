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
  const save = modal.getByRole('button',{name:'Registrar entrada avulsa'});
  await expect(save).toBeVisible();
  await save.scrollIntoViewIfNeeded();
  // Verify the real hit target; Premium may keep pointer events on its dock.
  expect(await save.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit === element || element.contains(hit);
  })).toBe(true);
  await modal.getByLabel('Valor recebido (R$)').fill('12,34');
  const reply=page.waitForResponse(r=>r.url().endsWith('/api/finance/quick-entry') && r.request().method()==='POST');
  await modal.getByRole('button',{name:'Registrar entrada avulsa'}).click({timeout:7000});
  expect((await reply).status()).toBe(201);
  await expect(modal).toHaveCount(0);
  // O dock Premium volta a navegar após o popup fechar. A segurança do
  // botão Salvar é verificada pelo hit-test e pelo POST real acima.
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button', { name:'Painel' })).toHaveCSS('pointer-events','auto');
  await expect(nav.getByRole('button')).toHaveCount(5);
  await nav.getByRole('button', { name:'Clientes', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Gestão de Clientes', exact:true })).toBeVisible();
});
