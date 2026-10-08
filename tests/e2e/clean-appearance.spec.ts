import { test, expect } from '@playwright/test';
import { login, password } from './helpers';

test('Clean troca sete cores, persiste e restaura Original sem mudar geometria', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('tab', { name: 'Identidade', exact: true }).click();
  const appearance = page.locator('.appearance-settings');
  await expect(appearance).toBeVisible();
  const snapshot = () => page.locator('aside').evaluate(el => {
    const r = el.getBoundingClientRect(); const css = getComputedStyle(el);
    return { x:r.x, y:r.y, width:r.width, height:r.height, background:css.backgroundImage };
  });
  const original = await snapshot();
  let writes = 0;
  page.on('request', request => { if (['POST','PUT','PATCH','DELETE'].includes(request.method())) writes++; });
  for (const color of ['Verde','Azul','Amarelo','Roxo','Vermelho','Preto','Claro']) {
    await appearance.getByRole('button', { name: `Clean ${color}`, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-arl-appearance','clean');
    const current = await snapshot();
    expect({ ...current, background:original.background }).toEqual(original);
    expect(current.background).toBe('none');
    const colorButton=appearance.getByRole('button',{name:`Clean ${color}`,exact:true});
    await colorButton.hover();
    expect(await colorButton.evaluate(el=> {
      const css=getComputedStyle(el);
      const luminance=(rgb:string)=> {
        const values=rgb.match(/[\d.]+/g)!.slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
        return values[0]*.2126+values[1]*.7152+values[2]*.0722;
      };
      const values=[luminance(css.backgroundColor),luminance(css.color)].sort((a,b)=>a-b);
      return (values[1]+.05)/(values[0]+.05);
    })).toBeGreaterThanOrEqual(4.5);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-arl-palette','light');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('tab', { name: 'Identidade', exact: true }).click();
  await appearance.getByRole('button', { name: 'Original', exact: true }).click();
  expect(await snapshot()).toEqual(original);
  expect(writes).toBe(0);
  await appearance.getByRole('button', { name: 'Clean Azul', exact: true }).click();
  await page.screenshot({ path:'output/clean/identity.png',fullPage:true });
});

test('Clean cobre módulos, popups e Controle de Gasto mobile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode:'clean',color:'blue' })));
  await login(page);
  for (const [name,slug] of [['Painel','dashboard'],['Ordens','orders'],['Clientes','clients'],['Serviços','services'],['Produtos','products'],['Fornecedores','suppliers'],['Financeiro','finance'],['Controle de Gasto','expenses'],['Pós-Venda','post-sale'],['Configurações','settings']]) {
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('main .state').filter({ hasText:'Carregando' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`output/clean/${slug}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Controle de Gasto',exact:true}).click();
  await page.getByRole('button',{name:'Nova dívida',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Cadastrar nova dívida',exact:true});
  await expect(dialog).toBeVisible();
  await page.screenshot({path:'output/clean/debt-dialog.png',fullPage:true});
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.setViewportSize({width:390,height:844});
  for (const tab of ['Resumo','Gastos','Instituições','Pagamentos','Projeção','Quitadas']) {
    await page.getByRole('tab',{name:tab,exact:true}).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`output/clean/mobile-${tab}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1280,height:720});
  await page.getByLabel('Layout neste dispositivo').selectOption('desktop');
});

test('Original é restaurado também no conteúdo e Clean não altera impressão', async ({ page }) => {
  await login(page);
  const styles = () => page.evaluate(() => ['body','aside','main','.status-cards article','.primary'].map(selector => {
    const element = document.querySelector(selector)!; const css=getComputedStyle(element); const rect=element.getBoundingClientRect();
    return {selector,bg:css.background,color:css.color,shadow:css.boxShadow,border:css.border,radius:css.borderRadius,x:rect.x,y:rect.y,width:rect.width,height:rect.height};
  }));
  await expect(page.locator('.status-cards article')).toHaveCount(4);
  const original=await styles();
  await page.emulateMedia({media:'print'});
  const originalPrint=await styles();
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Configurações',exact:true}).click();
  await page.getByRole('tab',{name:'Identidade',exact:true}).click();
  await page.getByRole('button',{name:'Clean Verde',exact:true}).click();
  await page.getByRole('button',{name:'Painel',exact:true}).click();
  const clean=await styles();
  expect(clean.map(({x,y,width,height})=>({x,y,width,height}))).toEqual(original.map(({x,y,width,height})=>({x,y,width,height})));
  await page.emulateMedia({media:'print'});
  expect(await styles()).toEqual(originalPrint);
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Configurações',exact:true}).click();
  await page.getByRole('tab',{name:'Identidade',exact:true}).click();
  await page.getByRole('button',{name:'Original',exact:true}).click();
  await page.getByRole('button',{name:'Painel',exact:true}).click();
  expect(await styles()).toEqual(original);
});

test('login respeita Clean salvo sem carregar dados privados antes de autenticar', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('arl-appearance-v1', JSON.stringify({mode:'clean',color:'purple'})));
  const privateRequests:string[]=[];
  page.on('request', request => { if(new URL(request.url()).pathname.startsWith('/api/'))privateRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-arl-palette','purple');
  expect(await page.locator('.login-brand').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
  expect(privateRequests).toEqual([]);
  await page.screenshot({path:'output/clean/login.png',fullPage:true});
  await page.getByLabel('Login',{exact:true}).fill('e2e.master');
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Notificações',exact:true})).toBeVisible();
});
