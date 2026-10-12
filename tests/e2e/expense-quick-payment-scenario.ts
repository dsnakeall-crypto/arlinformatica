import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login, openExpenseSection } from './helpers';

export function quickPaymentScenario(mobile = false) {
  test('pagamento rápido: mês e parcial limitados, casal sem total, individual total, CSRF e outra parte', async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    const stamp = Date.now(), month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
    const bank = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Quick bank ' + stamp, active: true, due_day: 12, color: '#123456' });
    const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Quick type ' + stamp, active: true });
    const create = async (owner: string) => {
      const result = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.body.id, type_id: type.body.id,
        name: 'Quick ' + owner + ' ' + stamp, recurrence: 'installments', responsibility: owner, percent_one: 70, amount_cents: 10000, installment_count: 3, first_number: 1, start_month: month, due_day: 12 });
      expect(result.status).toBe(201); return result.body;
    };
    const shared = await create('shared'), personal = await create('one');
    const preview = await api(page, '/expense-control/debts/'+shared.debt.id+'/person-payment?' + new URLSearchParams({target:'one',action:'month',month}));
    expect(preview.status).toBe(200);
    const csrf = await page.request.post('/api/expense-control/debts/'+shared.debt.id+'/person-payment', { data: {
      target:'one',action:'month',month,request_key:crypto.randomUUID(),amount_cents:7000,preview_hash:preview.body.preview_hash,paid_by:1,occurred_on:new Date().toLocaleDateString('sv-SE'),
    }, headers:{Accept:'application/json'} });
    expect(csrf.status()).toBe(419);
    await page.goto('/expense-control'); await openExpenseSection(page,'Resumo');
    await expect(page.getByRole('button',{name:'Pagamento rápido de Allan',exact:true})).toHaveCSS('color','rgb(25, 132, 70)');
    const dialog = page.getByRole('dialog',{name:'Pagamento rápido de Allan',exact:true});
    const open = async (owner: string) => {
      await page.getByRole('button',{name:'Pagamento rápido de Allan',exact:true}).click();
      const choice = dialog.getByRole('button').filter({hasText:'Quick '+owner+' '+stamp});
      await expect(choice).toContainText(owner==='shared'?'70,00':'100,00');
      await choice.click();
      if (owner==='shared') await expect(dialog.getByRole('button',{name:'Quitar a dívida inteira',exact:true})).toHaveCount(0);
      await expect(dialog.getByText('Responsável pelo pagamento:',{exact:false})).toContainText('Allan');
      const box=await dialog.boundingBox(), footer=await dialog.locator('footer').boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y+box!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
      expect(footer!.y+footer!.height).toBeLessThanOrEqual(box!.y+box!.height+1);
      expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    };
    await open('shared');
    await dialog.getByRole('button',{name:'Pagar parte da fatura do mês',exact:true}).click();
    await dialog.getByLabel('Valor a pagar (R$)').fill('8000');
    await expect(dialog.getByRole('button',{name:'Conferir pagamento',exact:true})).toBeDisabled();
    await dialog.getByLabel('Valor a pagar (R$)').fill('2000');
    await dialog.getByRole('button',{name:'Conferir pagamento',exact:true}).click();
    await expect(dialog.getByText('Ficará pendente nesta parte:',{exact:false})).toContainText('50,00');
    if (mobile) {
      await page.setViewportSize({width:375,height:420});
      await expect.poll(async()=>{ const box=await dialog.boundingBox(); return box!.y+box!.height; }).toBeLessThanOrEqual(421);
      await expect(dialog.getByRole('button',{name:'Confirmar pagamento',exact:true})).toBeVisible();
      await page.setViewportSize({width:375,height:667});
    }
    mkdirSync('output/pacote-final',{recursive:true});
    await page.screenshot({path:'output/pacote-final/quick-'+(mobile?'iphone':'desktop')+'.png'});
    await dialog.getByRole('button',{name:'Confirmar pagamento',exact:true}).click(); await expect(dialog).not.toBeVisible();
    let detail=(await api(page,'/expense-control/debts/'+shared.debt.id)).body;
    expect(detail.installments.map((i:any)=>i.remaining_one_cents)).toEqual([5000,7000,7000]);
    expect(detail.installments.map((i:any)=>i.remaining_two_cents)).toEqual([3000,3000,3000]);
    await page.getByRole('button',{name:'Pagamento rápido de Allan',exact:true}).click();
    await dialog.getByRole('button').filter({hasText:'Quick shared '+stamp}).click();
    await dialog.getByRole('button',{name:'Conferir pagamento',exact:true}).click();
    await dialog.getByRole('button',{name:'Confirmar pagamento',exact:true}).click(); await expect(dialog).not.toBeVisible();
    await page.getByRole('button',{name:'Pagamento rápido de Allan',exact:true}).click();
    await expect(dialog.locator('.cg-person-debt-choice').filter({hasText:'Quick shared '+stamp})).toHaveCount(0);
    await dialog.getByRole('button').filter({hasText:'Quick one '+stamp}).click();
    await dialog.getByRole('button',{name:'Quitar a dívida inteira',exact:true}).click();
    await expect(dialog.getByRole('button',{name:'Conferir pagamento',exact:true})).toBeDisabled();
    await dialog.getByLabel('Confirmo a quitação desta dívida individual, incluindo parcelas futuras.').check();
    await dialog.getByRole('button',{name:'Conferir pagamento',exact:true}).click();
    await expect(dialog.getByRole('region',{name:'Confira antes de pagar'}).locator(':scope > strong')).toContainText('300,00');
    await dialog.getByRole('button',{name:'Confirmar pagamento',exact:true}).click(); await expect(dialog).not.toBeVisible();
    detail=(await api(page,'/expense-control/debts/'+shared.debt.id)).body;
    expect(detail.installments.map((i:any)=>i.remaining_one_cents)).toEqual([0,7000,7000]);
    expect(detail.installments.map((i:any)=>i.remaining_two_cents)).toEqual([3000,3000,3000]);
    expect((await api(page,'/expense-control/debts/'+personal.debt.id)).body.installments.every((i:any)=>i.remaining_cents===0)).toBe(true);
    if(mobile){ const bottom=await page.locator('.arl-expense-bottom').boundingBox();expect(bottom!.y+bottom!.height).toBeCloseTo(page.viewportSize()!.height,0); }
  });
}
