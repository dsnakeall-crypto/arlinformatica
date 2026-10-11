import { test,expect } from '@playwright/test';
import {login} from './helpers';

test('Mobile: popup de cliente permite acionar salvar sem barra inferior interceptar',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('arl-layout-mode','mobile'));
  await login(page);
  const nav=page.locator('.arl-global-mobile-nav');
  await nav.getByRole('button',{name:'Clientes'}).click();
  await expect(page.getByRole('heading',{name:'Gestão de Clientes'})).toBeVisible();
  await page.getByRole('button',{name:'Novo cliente'}).click();
  const dialog=page.getByRole('dialog',{name:'Novo cliente'});
  await expect(dialog).toBeVisible();
  const save=dialog.getByRole('button',{name:'Salvar cliente'});
  const layout=await save.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {buttonIsTop:top===el||el.contains(top),topTag:top?.tagName,
      topClass:(top as HTMLElement)?.className?.toString()||'',
      navPointer:getComputedStyle(document.querySelector('.arl-global-mobile-nav')!).pointerEvents};
  });
  console.log('MOBILE_CLIENT_DIALOG_HITTEST',JSON.stringify(layout));
  expect(layout.buttonIsTop,JSON.stringify(layout)).toBe(true);
  await save.click({timeout:6000});
  await expect(dialog).toBeVisible();
});
