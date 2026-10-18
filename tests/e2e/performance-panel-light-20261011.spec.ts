import { test, expect } from '@playwright/test';
import { api, login } from './helpers';

test('Painel usa consulta semanal leve mantendo contagem e OS iguais ao endpoint completo',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await login(page);
  const standard=await api(page,'/orders?tab=closed_week&per_page=100');
  const light=await api(page,'/orders?tab=closed_week&per_page=100&panel_light=1');
  expect(standard.status).toBe(200);
  expect(light.status).toBe(200);
  expect(light.body.data).toEqual(standard.body.data);
  expect(light.body.total).toEqual(standard.body.total);
  expect(standard.body).toHaveProperty('tab_counts');
  expect(standard.body).toHaveProperty('summary');
  expect(light.body).not.toHaveProperty('tab_counts');
  expect(light.body).not.toHaveProperty('summary');
  const called:string[]=[];
  page.on('request',req=>{
    if(new URL(req.url()).pathname==='/api/orders' && req.url().includes('closed_week'))called.push(req.url());
  });
  await page.reload();
  await expect(page.locator('.dashboard-cards')).toBeVisible();
  await expect.poll(()=>called.some(url=>new URL(url).searchParams.get('panel_light')==='1')).toBe(true);
  const completed=page.locator('.dashboard-cards article').filter({hasText:'Concluídos'});
  await expect(completed.locator('strong')).toHaveText(String(light.body.total));
});
