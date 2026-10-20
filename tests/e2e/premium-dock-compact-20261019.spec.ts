import {test,expect} from '@playwright/test';
import {login} from './helpers';

test('ARL e Controle de Gastos: dock compacto, mesmo tamanho e ações intactas',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.evaluate(()=>localStorage.setItem('arl-layout-mode','mobile'));
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(/arl-mobile-premium-mode/);
  const dock=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(dock).toBeVisible();
  const arlSize=await dock.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {height:r.height,buttonHeights:[...el.querySelectorAll(':scope>button')].map(b=>b.getBoundingClientRect().height),captions:[...el.querySelectorAll(':scope>button')].map(b=>b.getAttribute('aria-label'))};
  });
  console.log('ARL_DOCK_SIZE',JSON.stringify(arlSize));
  expect(arlSize.height).toBeLessThanOrEqual(66);
  expect(arlSize.buttonHeights.every(x=>x>=44&&x<=53)).toBe(true);
  expect(arlSize.captions).toEqual(['Painel','Clientes','Abrir OS','Gastos','Menu']);
  await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/MOBILE-PREMIUM-UNICO-DOCK-MENOR-20261019/ARL-DOCK-COMPACTO-REAL.png'});
  await dock.getByRole('button',{name:'Gastos'}).click();
  const expense=page.getByRole('navigation',{name:'Menu do Controle de Gastos'});
  await expect(expense).toBeVisible();
  await expect(expense.getByRole('button',{name:'Adicionar dívida'})).toBeVisible();
  const expenseSize=await expense.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {height:r.height,buttonHeights:[...el.querySelectorAll(':scope>button')].map(b=>b.getBoundingClientRect().height),captions:[...el.querySelectorAll(':scope>button')].map(b=>b.getAttribute('aria-label'))};
  });
  console.log('EXPENSE_DOCK_SIZE',JSON.stringify(expenseSize));
  expect(expenseSize.height).toBeLessThanOrEqual(66);
  expect(expenseSize.buttonHeights.every(x=>x>=44&&x<=53)).toBe(true);
  await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/MOBILE-PREMIUM-UNICO-DOCK-MENOR-20261019/GASTOS-DOCK-COMPACTO-REAL.png'});
});
