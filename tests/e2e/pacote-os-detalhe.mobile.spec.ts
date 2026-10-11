import {expect,test} from '@playwright/test';
import {api,login,uniqueDocument} from './helpers';

test('ficha de OS mobile: entrada e saída acima; atendimento sozinho; senha e etiqueta lado a lado',async({page})=>{
  await login(page);
  const stamp=Date.now();
  const client=await api(page,'/clients','POST',{
    name:'Cliente Mobile Ficha '+stamp,document:uniqueDocument(stamp),
    phone:'35999995555',postal_code:'37160000',
    street:'Rua Teste',number:'30',district:'Centro',city:'Campos Gerais',state:'MG'
  });
  expect(client.status).toBe(201);
  const equipment=await api(page,'/catalogs/equipment');
  expect(equipment.body.length).toBeGreaterThan(0);
  const order=await api(page,'/orders','POST',{
    client_id:client.body.id,equipment_type_id:equipment.body[0].id,
    manufacturer_id:null,equipment_description:'Notebook Teste Mobile',
    attendance_type:'bench',reported_problem:'Teste visual de entrada e senha',
    system_password:'Teste@Senha543',system_password_absent:false,checklist:[]
  });
  expect(order.status,JSON.stringify(order.body)).toBe(201);
  const response=await api(page,'/orders/'+order.body.id);
  expect(response.body.has_system_password,JSON.stringify(response.body)).toBe(true);
  await page.goto('/orders/'+order.body.id);
  const root=page.locator('[data-arl-order-detail-react="1"]');
  await expect(root.locator('.arl-intake-dates')).toBeVisible();
  const entry=root.locator('.arl-intake-date-entry');
  const exit=root.locator('.arl-intake-date-exit');
  const attendance=root.locator('.arl-intake-date-attendance');
  const entries=await Promise.all([entry,exit,attendance].map(x=>x.boundingBox()));
  expect(entries.every(Boolean)).toBe(true);
  const [a,b,c]=entries as {x:number;y:number;width:number;height:number}[];
  expect(Math.abs(a.y-b.y)).toBeLessThan(4);
  expect(c.y).toBeGreaterThan(a.y+15);
  expect(c.x).toBeLessThan(b.x);
  const buttons=root.locator('.arl-intake-access-actions');
  const label=buttons.getByRole('button',{name:/Imprimir Etiqueta/i});
  await expect(label).toBeVisible();
  const password=buttons.getByRole('button',{name:/Ver senha do usuário/i});
  await expect(password).toBeVisible();
  const [p,l]=await Promise.all([password.boundingBox(),label.boundingBox()]);
  expect(p?.y).toBeCloseTo(l?.y||0,0);
  expect((p?.x||0)).toBeLessThan(l?.x||0);
});
