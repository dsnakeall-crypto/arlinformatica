import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

const blackTop='rgb(66, 66, 71)';
const white='rgb(255, 255, 255)';
async function requireBlackButton(button: import('@playwright/test').Locator) {
  await expect(button).toBeVisible();
  const style=await button.evaluate(el=>({bg:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}));
  expect(style.bg).toMatch(/rgb\((?:66, 66, 71|81, 81, 87)\)/);
  // Colors can interpolate briefly when navigation changes; wait for CSS transition to settle.
  await expect.poll(() => button.evaluate(el=>getComputedStyle(el).color), {timeout:3000}).toBe(white);
}
async function requireGraphiteButton(button: import('@playwright/test').Locator) {
  await expect(button).toBeVisible();
  await expect(button).toHaveCSS('color','rgb(255, 255, 255)');
  const bg=await button.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(bg).toMatch(/rgb\((?:113, 116, 123|81, 81, 87)\)/); // normal grafite ou hover grafite escuro
}
async function chooseWeb(page: import('@playwright/test').Page,mode:'clean'|'original') {
  await page.evaluate(m=>{
    localStorage.setItem('arl-layout-mode','desktop');
    localStorage.setItem('arl-appearance-v1',JSON.stringify({mode:m,color:'red'}));
  },mode);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance',mode);
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
}

test('Web Clean: SOMENTE botoes rosas viram preto degradê e texto branco em Painel e OS',async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await chooseWeb(page,'clean');
  const sidebar=page.locator('#arl-main-sidebar');
  await requireBlackButton(sidebar.locator('.new-order-shortcut'));
  await requireGraphiteButton(sidebar.locator('.nav-group button.active').first());
  const headerNew=page.getByRole('button',{name:'Nova OS'}).last();
  if (await headerNew.count()) await requireBlackButton(headerNew);
  const stamp=Date.now();
  const name='Botões Rosa OS '+stamp;
  const client=await api(page,'/clients','POST',{
    name, document:uniqueDocument(stamp),phone:'35999995555',postal_code:'37160000',
    street:'Rua Teste',number:'123',district:'Centro',city:'Campos Gerais',state:'MG'
  });
  expect(client.status,JSON.stringify(client.body)).toBe(201);
  const catalog=await api(page,'/catalogs/equipment');
  expect(catalog.body?.[0]).toBeTruthy();
  const order=await api(page,'/orders','POST',{
    client_id:client.body.id,equipment_type_id:catalog.body[0].id,manufacturer_id:null,
    equipment_description:'Notebook Teste',equipment_details:'carregador',attendance_type:'bench',
    reported_problem:'Teste visual de botões',checklist:[]
  });
  expect(order.status,JSON.stringify(order.body)).toBe(201);
  await sidebar.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:'Ordens'}).click();
  await requireGraphiteButton(sidebar.locator('.nav-group button.active').first());
  await requireBlackButton(page.locator('.order-tabs button.active').first());
  const row=page.locator('.order-row').filter({hasText:name});
  await expect(row).toBeVisible();
  const status=row.locator('.row-status').first();
  if(await status.count()){
    const statusBg=await status.evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(statusBg).not.toContain(blackTop);
  }
  const eye=row.locator('.order-actions .order-view');
  if(await eye.count()){
    const bg=await eye.evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(bg).toContain('icon-web-eye-compact-2x.png');
  }
  await row.getByRole('button',{name:'Ver OS'}).click();
  const detail=page.locator('[data-arl-order-detail-react="1"]');
  await expect(detail.getByRole('heading',{name:`OS #${order.body.number}`,exact:true})).toBeVisible();
  await requireBlackButton(detail.getByRole('button',{name:'Concluir',exact:true}));
  await requireBlackButton(detail.getByRole('button',{name:'Salvar serviços'}));
  await requireBlackButton(detail.getByRole('button',{name:'Salvar Laudo Final'}));
  await requireBlackButton(detail.getByRole('button',{name:'Produto/Serviço'}));
  // Enviar foto e visualmente um botao rosa, mas no DOM e um label do input file.
  const uploadLabel=detail.locator('.arl-order-photo-tools > label');
  await expect(uploadLabel).toBeVisible();
  const uploadStyle=await uploadLabel.evaluate(el=>({
    background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color
  }));
  expect(uploadStyle.background).toContain(blackTop);
  expect(uploadStyle.color).toBe(white);
  const camera=detail.getByRole('button',{name:/Usar c[aâ]mera/i});
  await expect(camera).toBeVisible();
  expect(await camera.evaluate(el=>getComputedStyle(el).backgroundImage)).not.toContain(blackTop);
  const history=detail.getByRole('button',{name:'Histórico',exact:true});
  await expect(history).toBeVisible();
  const historyBg=await history.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(historyBg).not.toContain(blackTop);
  await page.screenshot({path:'output/web-clean-reference-20261010/web-clean-only-pink-buttons-black.png'});
});

test('Web Original: botões não recebem acabamento preto do Clean',async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  await chooseWeb(page,'original');
  const button=page.locator('#arl-main-sidebar .new-order-shortcut');
  await expect(button).toBeVisible();
  const bg=await button.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(bg).not.toContain(blackTop);
});
