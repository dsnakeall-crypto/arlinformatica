import {test,expect} from '@playwright/test';
import {login} from './helpers';

test('Mobile Premium: módulos mantêm navegação e cartões acessíveis, sem overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const pageErrors:string[]=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await login(page);
  const dock=page.getByRole('navigation',{name:'Navegação Mobile / Tablet'});
  const modules: Array<[string,string]> = [
    ['Ordens','orders'],
    ['Serviços','services'],
    ['Produtos','products'],
    ['Fornecedores','suppliers'],
    ['Financeiro','finance'],
    ['Configurações','settings']
  ];
  for(const [label,destination] of modules){
    await dock.getByRole('button',{name:'Menu'}).click();
    const drawer=page.getByRole('dialog',{name:'Menu'});
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button',{name:label,exact:true}).click();
    await expect(drawer).toHaveCount(0);
    const main=page.locator('main[data-arl-section="'+destination+'"]');
    await expect(main).toBeVisible();
    await expect(main.locator('.arl-premium-section-hero')).toBeVisible();
    // Esperar o chunk React e os controles reais, não só o cabeçalho estático.
    await expect.poll(async () => main.locator('button:not([disabled]),input:not([disabled]),select:not([disabled])').count(), {timeout:25000}).toBeGreaterThan(1);
    const metrics=await main.evaluate(el=>{
      const rect=el.getBoundingClientRect();
      return {section:el.dataset.arlSection,overflow:el.scrollWidth-el.clientWidth,width:rect.width,
        heroHeight:el.querySelector('.arl-premium-section-hero')?.getBoundingClientRect().height||0,
        interactiveCount:el.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])').length};
    });
    console.log('MODULE_'+destination.toUpperCase(),JSON.stringify(metrics));
    expect(metrics.overflow).toBeLessThanOrEqual(5);
    if(destination==='orders'||destination==='products'||destination==='settings'){
      await page.screenshot({path:'C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 20-10-26 - 03-50 - GAVETA-DIREITA-3D/MODULO-'+destination+'.png'});
    }
  }
  expect(pageErrors).toEqual([]);
});
