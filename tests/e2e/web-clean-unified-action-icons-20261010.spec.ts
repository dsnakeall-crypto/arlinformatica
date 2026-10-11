import { test, expect, type Locator, type Page } from '@playwright/test';
import {mkdirSync} from 'node:fs';
import { login, api, uniqueDocument } from './helpers';

const out = 'output/web-clean-icon-standard-20261010';
test.beforeAll(()=>mkdirSync(out,{recursive:true}));

async function webClean(page:Page){
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(()=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'clean',color:'red'}));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
}

async function assertNoRing(actions: Locator, label:string){
  const nodes=actions.locator(':scope > :is(a,button)');
  const count=await nodes.count();
  expect(count, label+' expected icons').toBeGreaterThanOrEqual(4);
  const result=await nodes.evaluateAll(els=>els.map(el=>{
    const style=getComputedStyle(el);
    const img=el.querySelector('img,svg');
    const child=img ? getComputedStyle(img) : null;
    return {
      label:el.getAttribute('aria-label')||el.getAttribute('title')||el.className,
      w:Math.round(el.getBoundingClientRect().width),
      h:Math.round(el.getBoundingClientRect().height),
      border:style.borderTopWidth,
      borderRadius:style.borderTopLeftRadius,
      shadow:style.boxShadow,
      bg:style.backgroundColor,
      bgImage:style.backgroundImage,
      childWidth:child?.width||null,
      focus:style.outlineStyle
    };
  }));
  for(const icon of result){
    expect(icon.border,label+JSON.stringify(icon)).toBe('0px');
    expect(icon.borderRadius,label+JSON.stringify(icon)).toBe('0px');
    expect(icon.shadow,label+JSON.stringify(icon)).toBe('none');
    expect(icon.bg,label+JSON.stringify(icon)).toBe('rgba(0, 0, 0, 0)');
    expect(icon.w,label+JSON.stringify(icon)).toBe(32);
    expect(icon.h,label+JSON.stringify(icon)).toBe(32);
    if(icon.childWidth && !icon.bgImage.includes('icon-web-'))
      expect(icon.childWidth,label+JSON.stringify(icon)).toBe('18px');
    if (icon.bgImage.includes('icon-web-')) expect(icon.bgImage).toContain('compact-2x.png');
  }
  console.log('STANDARD_ICONS_'+label,JSON.stringify(result));
  const map=actions.locator(':scope > a:has(img[src*="icon-maps"])');
  if(await map.count()) {
    await map.first().hover();
    await expect(map.first()).toHaveCSS('border-top-width','0px');
    await expect(map.first()).toHaveCSS('box-shadow','none');
  }
}

test('Web Clean: Painel, Ordens e Clientes usam ícones 18px, sem aro, com assets compartilhados',async({page})=>{
  await webClean(page);
  const stamp=Date.now();
  const name='Ação unificada '+stamp;
  const client=await api(page,'/clients','POST',{
    name,document:uniqueDocument(stamp),phone:'35998887777',postal_code:'37160000',
    street:'Rua Teste',number:'3',district:'Centro',city:'Campos Gerais',state:'MG'
  });
  expect(client.status,JSON.stringify(client.body)).toBe(201);
  const equip=await api(page,'/catalogs/equipment');
  const order=await api(page,'/orders','POST',{
    client_id:client.body.id,equipment_type_id:equip.body[0].id,manufacturer_id:null,
    equipment_description:'Notebook',equipment_details:'Carregador',
    attendance_type:'bench',reported_problem:'Ações compartilhadas',checklist:[]
  });
  expect(order.status,JSON.stringify(order.body)).toBe(201);
  const nav=page.getByRole('navigation',{name:'Menu principal'});
  await nav.getByRole('button',{name:'Ordens'}).click();
  const orders=page.locator('.orders-order-list tr.order-row').filter({hasText:name});
  await expect(orders).toBeVisible();
  const orderActions=orders.locator('.order-actions');
  await assertNoRing(orderActions,'ordens');
  await page.screenshot({path:out+'/orders-icons.png'});

  // Recarregar evita cache anterior do Painel de uma sessão já aberta
  // antes da criação da OS do teste. Não altera nenhum dado do cliente.
  const desk=await api(page,'/orders/desk');
  expect(desk.status).toBe(200);
  expect(JSON.stringify(desk.body)).toContain(order.body.number);
  await nav.getByRole('button',{name:'Painel'}).click();
  await page.reload();
  const dashboard=page.locator('.dashboard-order-list tr.order-row').filter({hasText:name});
  await expect(dashboard).toBeVisible();
  await assertNoRing(dashboard.locator('.order-actions'),'painel');
  await page.screenshot({path:out+'/dashboard-icons.png'});

  await nav.getByRole('button',{name:'Clientes'}).click();
  const clients=page.locator('.clients-row').filter({hasText:name});
  await expect(clients).toBeVisible();
  await assertNoRing(clients.locator('.clients-actions'),'clientes');
  await page.screenshot({path:out+'/clients-icons-reference.png'});
});

test('Web Clean: seta de reabrir garantia é pequena e sem contorno',async({page})=>{
  await webClean(page);
  const nav=page.getByRole('navigation',{name:'Menu principal'});
  await nav.getByRole('button',{name:'Ordens'}).click();
  const actions=page.locator('.orders-order-list .order-row .order-actions').first();
  await expect(actions).toBeVisible();
  // Estilo de garantia sem modificar estado financeiro ou status das OS.
  await actions.evaluate(el=>{
    const b=document.createElement('button');
    b.className='order-reopen';b.setAttribute('aria-label','Reabrir como garantia');
    b.type='button';el.appendChild(b);
  });
  const reopened=actions.getByRole('button',{name:'Reabrir como garantia'});
  await expect(reopened).toBeVisible();
  await expect(reopened).toHaveCSS('border-top-width','0px');
  await expect(reopened).toHaveCSS('border-top-left-radius','0px');
  await expect(reopened).toHaveCSS('box-shadow','none');
  await expect(reopened).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const before=await reopened.evaluate(el=>{
    const s=getComputedStyle(el,'::before');
    return {content:s.content,fontSize:s.fontSize,border:s.borderTopWidth,bg:s.backgroundColor};
  });
  expect(before.content).not.toBe('none');
  expect(before.fontSize).toBe('18px');
  expect(before.border).toBe('0px');
  expect(before.bg).toBe('rgba(0, 0, 0, 0)');
});

test('Web Original: estilo próprio não recebe regra Clean para Maps',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await page.evaluate(()=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:'original',color:'red'}));
  });
  await page.reload();
  const nav=page.getByRole('navigation',{name:'Menu principal'});
  await nav.getByRole('button',{name:'Ordens'}).click();
  const maps=page.locator('.orders-order-list .order-actions .order-maps').first();
  await expect(maps).toBeVisible();
  // Original mantém regra histórica distinta de 0px/transparent.
  const border=await maps.evaluate(el=>getComputedStyle(el).borderTopWidth);
  expect(border).not.toBe('0px');
});
