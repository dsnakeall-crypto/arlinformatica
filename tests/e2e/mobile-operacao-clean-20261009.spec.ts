import { test, expect } from '@playwright/test';
import { login, api, uniqueDocument, openArlSection } from './helpers';
import { mkdirSync } from 'node:fs';
const out='output/mobile-arI-final-20261009';
test('mobile: Clean obrigatório, sem Web/PC ou Pós-Venda, lateral ativo vermelho sem aro', async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const me=await api(page,'/me');expect(me.status).toBe(200);
  await page.evaluate((id)=>{
    // Exercita a migração da preferência antiga no dispositivo móvel.
    localStorage.setItem('arl-layout-mode','mobile');
    localStorage.setItem('arl-mobile-nav-'+id,'compact');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'}));
  },me.body.id);
  // Um viewport estreito em Chrome desktop não é um celular real.
  // Simular o dispositivo físico garante que o Web/PC não seja oferecido nele.
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    get: () => 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'
  }));
  await page.reload();
  const shell=page.locator('.shell.layout-mobile.arl-mobile-premium-mode');
  await expect(shell).toBeVisible();
  expect(await page.locator('html').getAttribute('data-arl-appearance')).toBe('clean');
  const sidebar=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(sidebar.getByRole('button',{name:'Pós-Venda'})).toHaveCount(0);
  const active=sidebar.getByRole('button',{name:'Painel'});
  await expect(active).toHaveAttribute('aria-current', 'page');
  const style=await active.locator('.arl-nav-icon-disc').evaluate(el=>{
    const c=getComputedStyle(el);
    const icon=getComputedStyle(el.querySelector('svg')!);
    return {border:c.borderWidth,shadow:c.boxShadow,color:c.color,icon:icon.color,filter:icon.filter,width:icon.width};
  });
  // Medido no dock Premium aprovado: invólucro sem aro/sombra e ícone de 21px sem filtro adicional.
  expect(parseFloat(style.border)).toBe(0);
  expect(style.shadow).toBe('none');
  expect(style.filter).toBe('none');
  expect(style.width).toBe('21px');
  expect(style.icon).toMatch(/rgb\(\d+, \d+, \d+\)/);
  await openArlSection(page, 'Configurações');
  await page.getByRole('button',{name:/Layouts/}).click();
  await expect(page.getByRole('button',{name:'Web / PC'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Mobile Premium'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Mobile — menu lateral compacto'})).toHaveCount(0);
  await page.screenshot({path:out+'/clean-menu-layouts-390.png'});
  await page.getByRole('button',{name:'Mobile Premium'}).click();
  const bottom=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await expect(bottom).toBeVisible();
  await expect(bottom.getByRole('button',{name:'Abrir OS'})).toBeVisible();
  await bottom.getByRole('button',{name:'Menu',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Menu',exact:true}).getByRole('button',{name:'Pós-Venda'})).toHaveCount(0);
  await page.goto('/post-sale');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('main[data-arl-post-sale-react="1"]')).toHaveCount(0);
});

test('clientes mobile: só nome, dez por página, quatro atalhos, sem excluir nem nova OS',async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const stamp=Date.now();
  for(let i=0;i<11;i++){
    const x=await api(page,'/clients','POST',{
      name:'Grupo Busca Mobile '+String(i).padStart(2,'0'),
      document:uniqueDocument(stamp+i),phone:'35999990000',
      postal_code:'37160000',street:'Rua Teste',number:String(i+1),
      district:'Centro',city:'Campos Gerais',state:'MG'
    });
    expect(x.status,JSON.stringify(x.body)).toBe(201);
  }
  const nav=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  await nav.getByRole('button',{name:'Clientes'}).click();
  await expect(page.locator('.clients-mobile-simple')).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Clientes por página',exact:true})).toHaveCount(0);
  await expect(page.getByRole('combobox',{name:'Ordenar clientes'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Excluir cliente /i})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Nova OS para este cliente'})).toHaveCount(0);
  const field=page.getByRole('textbox',{name:'Buscar clientes'});
  await expect(field).toHaveAttribute('placeholder','Nome do cliente…');
  await field.fill('Grupo Busca Mobile');
  await expect(page.locator('.clients-row')).toHaveCount(10);
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
  const actions=page.locator('.clients-row').first().locator('.clients-actions');
  for(const label of ['WhatsApp','Maps','Visualizar','Editar']) await expect(actions.getByRole(label==='WhatsApp'||label==='Maps'?'link':'button',{name:label})).toBeVisible();
  for(const label of ['WhatsApp','Maps']) {
    const link=actions.getByRole('link',{name:label});
    const geometry=await link.evaluate(el=>{
      const c=getComputedStyle(el),r=el.getBoundingClientRect();
      return {border:c.borderWidth,shadow:c.boxShadow,width:r.width,height:r.height};
    });
    expect(geometry.border,label).toBe('0px');
    expect(geometry.shadow,label).toBe('none');
    expect(geometry.width,label).toBeGreaterThanOrEqual(44);
    expect(geometry.height,label).toBeGreaterThanOrEqual(44);
  }
  const borderClient=await actions.locator('button[aria-label="Visualizar"]').evaluate(el=>({border:getComputedStyle(el).borderWidth,html:document.documentElement.outerHTML.slice(0,235),shell:document.querySelector('.shell')?.className,clientPanel:document.querySelector('main')?.getAttribute('data-arl-clients-react'),match:el.matches('html[data-layout="mobile"] body .shell.layout-mobile main .clients-react-page.clients-mobile-simple .clients-actions>button[aria-label="Visualizar"]')}));
  expect(borderClient.border,JSON.stringify(borderClient)).toBe('0px');
  await page.getByRole('button',{name:'Próxima página'}).click();
  await expect(page.locator('.clients-row')).toHaveCount(1);
  await field.fill('35999990000');
  await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible();
  await page.screenshot({path:out+'/clients-390.png'});
});

test('ordens mobile: equipamento central, ícones sem caixas, web intacta',async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await login(page);
  const client=await api(page,'/clients','POST',{
    name:'Cliente Visual OS Mobile',document:uniqueDocument(Date.now()),
    phone:'35999990000',postal_code:'37160000',street:'Rua A',number:'123',district:'Centro',city:'Campos Gerais',state:'MG'
  });
  expect(client.status).toBe(201);
  const equipment=await api(page,'/catalogs/equipment');
  const order=await api(page,'/orders','POST',{client_id:client.body.id,equipment_type_id:equipment.body[0].id,manufacturer_id:null,equipment_description:'Notebook da cliente',reported_problem:'Não liga',attendance_type:'bench',system_password_absent:true,checklist:[]});
  expect(order.status).toBe(201);
  await openArlSection(page, 'Ordens');
  const row=page.locator('.orders-order-list tr.order-row').filter({hasText:client.body.name});
  await expect(row).toBeVisible();
  const device=row.locator('.order-device');
  expect(await device.evaluate(el=>getComputedStyle(el).justifyContent)).toBe('center');
  const alignment=await row.evaluate(el=>{
    const read=(selector:string)=>{
      const node=el.querySelector(selector)!;
      return {justify:getComputedStyle(node).justifyContent,text:getComputedStyle(node).textAlign};
    };
    return {
      number:read('.arl-order-number'),
      client:read('.order-customer'),
      equipment:read('.order-device'),
      description:read('.order-client-report')
    };
  });
  expect(alignment.number.justify).toBe('center');
  expect(alignment.client.justify).toBe('center');
  expect(alignment.equipment.justify).toBe('center');
  expect(alignment.description.text).toBe('center');
  for(const selector of ['.order-maps','.order-view','.order-edit','.arl-order-delete']){
    const action=row.locator('.order-actions '+selector);
    if(await action.count()) {
      const computed=await action.evaluate(el=>({border:getComputedStyle(el).borderWidth,bg:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow,orders:document.querySelector('main')?.getAttribute('data-arl-orders-react'),match:el.matches('html[data-layout="mobile"] body .shell.layout-mobile main .orders-order-list .order-actions>.order-view')}));
      expect(computed.border,JSON.stringify(computed)).toBe('0px');
      expect(computed.shadow).toBe('none');
    }
  }
  await page.screenshot({path:out+'/ordens-390.png'});
});

test('financeiro mobile: mês com calendário e setas; Web mantém filtro anterior',async({page})=>{
  mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await openArlSection(page, 'Financeiro');
  const picker=page.getByRole('group',{name:'Mês exibido'});
  await expect(picker.getByRole('button',{name:'Mês anterior'})).toBeVisible();
  const input=picker.getByLabel('Mês exibido');
  const original=await input.inputValue();
  await picker.getByRole('button',{name:'Mês anterior'}).click();
  expect(await input.inputValue()).not.toBe(original);
  await picker.getByRole('button',{name:'Próximo mês'}).click();
  expect(await input.inputValue()).toBe(original);
  const transactions=page.locator('.finance-overview-movements');
  await expect(transactions).toBeVisible();
  await page.screenshot({path:out+'/finance-390.png'});
});
test('web/PC mantém Original opcional, Pós-Venda e controles de cliente',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(()=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'}));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
  expect(await page.locator('html').getAttribute('data-arl-appearance')).toBe('original');
  const sidebar=page.getByRole('navigation',{name:'Menu principal'});
  await expect(sidebar.getByRole('button',{name:'Pós-Venda'})).toBeVisible();
  await sidebar.getByRole('button',{name:'Clientes'}).click();
  await expect(page.getByRole('combobox',{name:'Clientes por página',exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Ordenar clientes'})).toBeVisible();
});
