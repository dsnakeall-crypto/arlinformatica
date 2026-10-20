import { expect, test } from '@playwright/test';
import { login } from './helpers';

async function enablePremium(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const response = await fetch('/api/me',{credentials:'same-origin',headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('Sessão E2E não autenticada');
    const user=await response.json();
    localStorage.setItem('arl-mobile-nav-'+user.id,'premium');
  });
  await page.reload();
}

test('ARL premium mobile: logomarca, indicadores reais, menu e navegação', async ({ page }) => {
  await login(page);
  await enablePremium(page);
  const home = page.locator('.arl-mobile-home-premium');
  await expect(home).toBeVisible();
  await expect(page.locator('header.app-head .menu-toggle')).toHaveCount(0);
  await expect(home.locator('svg.arl-premium-icon')).toHaveCount(8);
  await expect(home.locator('.arl-premium-brand img')).toHaveAttribute('src', /arl-red-gold-from-vector/);
  await expect(home.getByText('INFORMÁTICA', { exact: true })).toBeVisible();
  await expect(home.getByText('Manutenção e Soluções Inteligentes')).toBeVisible();
  await expect(home.getByText('Receita do mês')).toHaveCount(0);
  await expect(home.locator('[data-mobile-stat="all"]')).not.toHaveText('—', {timeout:20_000});
  const menu = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(menu.locator('button')).toHaveCount(5);
  await expect(menu.getByRole('button', {name:'Painel'}).locator('svg.lucide-house')).toBeVisible();
  const captions = await menu.locator('button').evaluateAll(items => items.map(i => i.getAttribute('aria-label')));
  expect(captions).toEqual(['Painel', 'Clientes', 'Abrir OS', 'Gastos', 'Menu']);
  await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 19-10-26 - 02-15 - LAYOUT-MOBILE-PREMIUM/ARL-PAINEL-MOBILE-REAL.png',fullPage:false});
  await menu.getByRole('button',{name:'Menu'}).click();
  const sheet = page.getByRole('dialog',{name:'Menu'});
  await expect(sheet).toBeVisible();
  await expect(page.locator('nav.arl-mobile-rail-drawer.is-open')).toHaveCount(0);
  await sheet.getByRole('button',{name:'Ordens'}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-arl-orders-react="1"]')).toBeVisible();
  await menu.getByRole('button',{name:'Clientes'}).click();
  await expect(page.getByRole('heading',{name:/Clientes/i}).first()).toBeVisible();
  await menu.getByRole('button',{name:'Menu'}).click();
  await expect(page.getByRole('dialog',{name:'Menu'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Menu'})).toHaveCount(0);
  await menu.getByRole('button',{name:'Abrir OS'}).click();
  await expect(page.locator('[data-arl-new-order-react="1"]')).toBeVisible();
});

test('Gastos mobile: painel por pessoa e popup de instituições', async ({ page }) => {
  await login(page);
  await enablePremium(page);
  const menu = page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await menu.getByRole('button',{name:'Gastos'}).click();
  await expect(page.locator('.cg-page')).toBeVisible();
  await page.getByRole('navigation',{name:'Menu do Controle de Gastos'}).getByRole('button',{name:'Gastos'}).click();
  await expect(page.locator('.cg-gastos-people')).toBeVisible();
  await expect(page.locator('.cg-gastos-person-card')).toHaveCount(3);
  await expect(page.locator('.cg-gastos-person-card').first()).toBeEnabled({ timeout: 20000 });
  await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 19-10-26 - 02-15 - LAYOUT-MOBILE-PREMIUM/GASTOS-TRES-CARDS-REAL.png',fullPage:false});
  await page.locator('.cg-gastos-person-card').first().click();
  await expect(page.getByRole('dialog',{name:/Dívidas de/i})).toBeVisible();
  await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 19-10-26 - 02-15 - LAYOUT-MOBILE-PREMIUM/GASTOS-POPUP-INSTITUICOES-REAL.png',fullPage:false});
});
