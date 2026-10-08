import { expect, test } from '@playwright/test';
import { api, login, selectNewOrderClient, uniqueDocument } from './helpers';

for (const mode of ['disabled', 'enabled', 'blocked']) {
  test(`Abertura externa: configuração ${mode}, mensagem e navegação preservadas`, async ({ page }) => {
    await page.addInitScript(({ blocked }) => {
      (window as any).__openingCalls = [];
      window.open = (() => {
        (window as any).__openingCalls.push('reserved');
        if (blocked) return null;
        return { closed: false, opener: null, document: { title: '', body: {} }, close() {}, location: { replace(url: string) { (window as any).__openingCalls.push(url); } } };
      }) as typeof window.open;
    }, { blocked: mode === 'blocked' });
    await login(page);
    const original = (await api(page, '/settings')).body;
    try {
      await page.getByRole('button', { name: 'Configurações', exact: true }).click();
      await page.getByRole('tab', { name: 'Mensagens', exact: true }).click();
      await page.getByLabel('Abrir WhatsApp automaticamente após criar OS').setChecked(mode !== 'disabled');
      await page.getByRole('button', { name: 'Salvar configurações', exact: true }).click();
      await expect(page.getByText('Configurações salvas com segurança. Documentos antigos permanecem preservados.')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`mensagens-${mode}.png`), fullPage: true });
      const client = await api(page, '/clients', 'POST', { name: `Cliente WhatsApp ${mode}`, document: uniqueDocument(), phone: '35999999999', street: 'Rua Teste' });
      expect(client.status).toBe(201);
      await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
      await selectNewOrderClient(page, client.body.id);
      await page.getByLabel('Equipamento *', { exact: true }).fill('Notebook');
      await page.getByLabel('Sem senha', { exact: true }).check();
      await page.locator('.arl-new-order textarea').first().fill('Não liga');
      await page.getByRole('button', { name: 'ATENDIMENTO EXTERNO', exact: true }).click();
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/orders' && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Criar ordem de serviço', exact: true }).click();
      const created = await (await response).json();
      await expect(page).toHaveURL(new RegExp(`/orders/${created.id}$`));
      const calls = await page.evaluate(() => (window as any).__openingCalls as string[]);
      if (mode === 'disabled') expect(calls).toEqual([]);
      if (mode === 'enabled') expect(calls).toContain(created.opening_whatsapp.url);
      if (mode === 'blocked') await expect(page.getByRole('link', { name: 'Abrir mensagem de abertura no WhatsApp' })).toHaveAttribute('href', created.opening_whatsapp.url);
      await page.getByRole('button', { name: "PDF's", exact: true }).click();
      const manual = page.getByRole('link', { name: 'Mensagem de abertura', exact: true });
      await expect(manual).toHaveAttribute('href', created.opening_whatsapp.url);
      const text = new URL((await manual.getAttribute('href'))!).searchParams.get('text')!;
      expect(text).toContain(`Olá, Cliente WhatsApp ${mode}\n\nInformamos`);
      expect(text).toContain('avisaremos por este WhatsApp quando estivermos chegando.\n\nPermanecemos');
      expect(text).toContain('Atenciosamente,\n\nARL Informática');
      expect(text).not.toContain('já iniciou os procedimentos');
    } finally { await api(page, '/settings', 'PUT', original); }
  });
}
