import {test,expect} from '@playwright/test';
import {api,login,uniqueDocument} from './helpers';

test('desktop se realinha ao redimensionar, mantém todos os menus e contém as telas',async ({page})=>{
  test.setTimeout(180_000);
  await login(page);
  const stamp=Date.now();
  const address={document:uniqueDocument(stamp),phone:'35999991234',postal_code:'37160000',street:'Rua de teste',number:'10',district:'Centro',city:'Campos Gerais',state:'MG'};
  expect((await api(page,'/clients','POST',{...address,name:`Cliente do teste de resolução ${stamp}`})).status).toBe(201);
  expect((await api(page,'/suppliers','POST',{...address,document:uniqueDocument(stamp+1),name:`Fornecedor de peças e acessórios ${stamp}`,trade_name:'Fornecedor resolução',whatsapp:'35999991234'})).status).toBe(201);
  expect((await api(page,'/catalogs/products','POST',{name:`SSD para teste de resolução ${stamp}`,price_cents:48000,stock_quantity:3,active:true,warranty_enabled:false})).status).toBe(201);

  expect((await api(page,'/me/sidebar','PATCH',{sidebar_pinned:true})).status).toBe(200);
  await page.reload();
  const sidebar=page.locator('aside');
  try {
  const sizes=[{width:1280,height:720},{width:1360,height:768},{width:1366,height:768},{width:1440,height:900},{width:1440,height:1080},{width:1920,height:1080},{width:2560,height:1440},{width:1280,height:640}];
  for(const size of sizes){
    await page.setViewportSize(size);
    await expect(page.locator('.shell')).toHaveClass(/sidebar-pinned/);
    for(const button of await sidebar.locator('.nav-group button').all()) await expect(button).toBeInViewport({ratio:1});
    await expect(sidebar.getByRole('button',{name:'Sair',exact:true})).toBeInViewport({ratio:1});
    expect(await sidebar.locator('nav').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    for(const name of ['Painel','Ordens','Clientes','Nova OS','Serviços','Produtos','Financeiro','Pós-Venda','Fornecedores','Controle de Gasto','Configurações']){
      await sidebar.getByRole('button',{name,exact:true}).click();
      await expect(page.getByRole('main').getByRole('heading',{level:1}).first()).toBeVisible();
      if(name === 'Controle de Gasto') await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),{message:`${name} em ${size.width} × ${size.height}`}).toBe(true);
    }
    if([720,768,1080].includes(size.height)) await page.screenshot({path:`output/compacto/desktop-fit-${size.width}-${size.height}.png`});
    await sidebar.getByRole('button',{name:'Fornecedores',exact:true}).click();
    await page.getByRole('button',{name:'Novo fornecedor',exact:true}).click();
    const popup=page.getByRole('dialog',{name:'Novo fornecedor',exact:true});
    await expect(popup).toBeInViewport({ratio:1});
    await expect(popup.getByRole('button',{name:'Salvar fornecedor',exact:true})).toBeInViewport({ratio:1});
    expect(await popup.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await popup.getByRole('button',{name:'Cancelar',exact:true}).click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await expect(page.locator('.shell')).toHaveClass(/layout-mobile/);
  await expect(page.locator('.arl-global-mobile-nav')).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  } finally { expect((await api(page,'/me/sidebar','PATCH',{sidebar_pinned:false})).status).toBe(200); }
});
