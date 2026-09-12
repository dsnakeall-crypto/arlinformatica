import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { api, login, selectNewOrderClient, uniqueDocument } from './helpers';

async function waitForOfficialIcons(page: Page, sources: string[]) {
  for (const src of sources) {
    const icon = page.locator(`img[src="${src}"]`).first();
    await expect(icon).toBeAttached();
    await icon.evaluate(async (element) => {
      const image = element as HTMLImageElement;
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => reject(new Error(`Falha ao carregar ${image.src}`)), { once: true });
        });
      }
      if (image.naturalWidth <= 0) throw new Error(`Imagem sem conteúdo decodificado: ${image.src}`);
      await image.decode();
    });
  }
}

test('gera evidências para homologação visual desktop, mobile e PDF', async ({ page }) => {
  await mkdir('visual-artifacts', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  const equipment = await api(page, '/catalogs/equipment');
  const manufacturers = await api(page, '/catalogs/manufacturers');
  const services = await api(page, '/catalogs/services');
  expect(equipment.status).toBe(200);
  expect(manufacturers.status).toBe(200);
  expect(services.status).toBe(200);
  expect(equipment.body.length).toBeGreaterThan(0);
  expect(services.body.length).toBeGreaterThan(0);
  const service = services.body.find((item: any) => item.name === 'Formatação E2E') ?? services.body[0];

  const clientResponse = await api(page, '/clients', 'POST', {
    name: 'Cliente Homologação Visual',
    document: uniqueDocument(26090301),
    phone: '34999998888',
    postal_code: '38400000',
    street: 'Rua das Flores',
    number: '320',
    district: 'Centro',
    city: 'Araguari',
    state: 'MG',
    complement: '',
  });
  expect(clientResponse.status).toBe(201);

  const orderResponse = await api(page, '/orders', 'POST', {
    client_id: clientResponse.body.id,
    equipment_type_id: equipment.body[0].id,
    manufacturer_id: manufacturers.body[0]?.id ?? null,
    attendance_type: 'bench',
    reported_problem: 'Notebook lento para referência da homologação visual.',
    checklist: [],
    items: [{ catalog_id: service.id, quantity: 1 }],
  });
  expect(orderResponse.status).toBe(201);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByText(`#${orderResponse.body.number}`, { exact: true }).first()).toBeVisible();
  await waitForOfficialIcons(page, [
    '/arl-assets/icons/icon-whatsapp.png',
    '/arl-assets/icons/icon-maps.png',
    '/arl-assets/icons/icon-visualizar.png',
  ]);
  await page.screenshot({ path: 'visual-artifacts/01-painel-desktop.png', fullPage: true });

  const nav = page.locator('aside nav');
  await nav.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.getByText('Cliente Homologação Visual', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`Cliente Nº ${clientResponse.body.id}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Rua das Flores, 320 · Centro', { exact: true })).toBeVisible();
  await expect(page.getByText('Araguari - MG · CEP 38400-000', { exact: true })).toBeVisible();
  await waitForOfficialIcons(page, [
    '/arl-assets/icons/icon-whatsapp.png',
    '/arl-assets/icons/icon-maps.png',
    '/arl-assets/icons/icon-visualizar.png',
    '/arl-assets/icons/icon-editar.png',
    '/arl-assets/icons/icon-lixeira.png',
  ]);
  await page.screenshot({ path: 'visual-artifacts/02-clientes-lista-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const clientModal = page.getByRole('dialog', { name: 'Novo cliente' });
  await expect(clientModal).toBeVisible();
  await expect(clientModal.getByRole('heading', { name: 'Novo cliente' })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/02-clientes-cadastro-desktop.png', fullPage: true });
  await clientModal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(clientModal).toHaveCount(0);

  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  const newOrderForm = page.locator('form.os-form');
  await selectNewOrderClient(page, clientResponse.body.id);
  await expect(newOrderForm.getByPlaceholder('Buscar por nome, telefone ou CPF/CNPJ')).toHaveValue(clientResponse.body.name);
  await expect(newOrderForm.locator('.arl-client-results button')).toHaveCount(0);
  await newOrderForm.getByLabel('Equipamento / Modelo / Acessórios *').fill('Notebook Dell Inspiron 15 + carregador');
  await newOrderForm.getByLabel('Problema relatado *').fill('Notebook lento para referência da homologação visual.');
  await newOrderForm.locator('.opening-catalog button').first().click();
  await expect(newOrderForm.locator('.opening-item')).toHaveCount(1);
  await expect(page.getByPlaceholder('Buscar por nome, telefone ou CPF/CNPJ')).toBeVisible();
  await expect(page.getByPlaceholder('Pesquisar serviço ou produto…')).toBeVisible();
  await expect(page.getByRole('button', { name: /Usar câmera/ })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/03-nova-os-desktop.png', fullPage: true });

  await nav.getByRole('button', { name: 'Ordens de Serviço' }).click();
  const row = page.locator('.order-row').filter({ hasText: `#${orderResponse.body.number}` });
  await expect(row).toBeVisible();
  await waitForOfficialIcons(page, ['/arl-assets/icons/icon-visualizar.png']);
  await page.screenshot({ path: 'visual-artifacts/04-ordens-lista-desktop.png', fullPage: true });
  await row.getByRole('button', { name: 'Ver OS' }).click();
  await expect(page.getByRole('heading', { name: `OS #${orderResponse.body.number}`, exact: true })).toBeVisible();
  await expect(page.locator('.arl-order-photo-tools')).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/04-status-os-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.locator('.menu-toggle').click();
  await page.locator('aside nav').getByRole('button', { name: 'Painel' }).click();
  const mobileHome = page.getByRole('region', { name: 'Início mobile com Ordens de Serviço abertas' });
  await expect(mobileHome).toBeVisible();
  await expect(mobileHome.getByText(`OS #${orderResponse.body.number} · Em Análise`, { exact: true })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/01-painel-mobile.png', fullPage: true });
  await page.getByLabel('Layout neste dispositivo').selectOption('desktop');
  await page.setViewportSize({ width: 1440, height: 900 });

  const finalization = await api(page, `/orders/${orderResponse.body.id}/finalize`, 'POST', {
    result: 'repair_completed',
    technical_report: 'Instalação realizada com sucesso. Equipamento testado e em perfeito funcionamento.',
    discount_cents: 0,
    photo_ids: [],
    items: [{
      catalog_id: service.id,
      description: service.name,
      quantity: 1,
      unit_price_cents: service.price_cents,
      warranty_enabled: Boolean(service.warranty_enabled),
      warranty_term: service.warranty_enabled ? service.warranty_term : null,
      warranty_unit: service.warranty_enabled ? service.warranty_unit : null,
    }],
  });
  expect(finalization.status).toBe(201);

  const pdf = await page.context().request.get(`/api/orders/${orderResponse.body.id}/final/1/pdf`);
  expect(pdf.ok()).toBeTruthy();
  await writeFile('visual-artifacts/05-fechamento-final.pdf', Buffer.from(await pdf.body()));

  await nav.getByRole('button', { name: 'Clientes' }).click();
  const visualClient = page.locator('.client-list article').filter({ hasText: 'Cliente Homologação Visual' });
  await visualClient.getByRole('button', { name: 'Visualizar' }).click();
  await expect(page.getByText(service.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '2ª via PDF A4' })).toHaveAttribute('href', `/api/orders/${orderResponse.body.id}/final/1/pdf`);
  await page.screenshot({ path: 'visual-artifacts/02-clientes-historico-desktop.png', fullPage: true });

  await nav.getByRole('button', { name: 'Pós-Venda' }).click();
  await expect(page.getByRole('heading', { name: 'Pós-Venda & Reputação' })).toBeVisible();
  await expect(page.locator('.arl-post-toolbar')).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/06-pos-venda-desktop.png', fullPage: true });

  await nav.getByRole('button', { name: 'Serviços' }).click();
  await expect(page.getByRole('heading', { name: 'Serviços e Produtos' })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/07-servicos-desktop.png', fullPage: true });

  await nav.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('.arl-settings-tabs')).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/08-configuracoes-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.locator('.menu-toggle').click();
  await page.locator('aside').getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de Clientes' })).toBeVisible();
  await expect(page.getByText('Cliente Homologação Visual', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Araguari - MG · CEP 38400-000', { exact: true })).toBeVisible();
  await waitForOfficialIcons(page, [
    '/arl-assets/icons/icon-whatsapp.png',
    '/arl-assets/icons/icon-maps.png',
    '/arl-assets/icons/icon-visualizar.png',
    '/arl-assets/icons/icon-editar.png',
    '/arl-assets/icons/icon-lixeira.png',
  ]);
  await page.screenshot({ path: 'visual-artifacts/02-clientes-mobile.png', fullPage: true });

  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const mobileClientModal = page.getByRole('dialog', { name: 'Novo cliente' });
  await expect(mobileClientModal).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/02-clientes-cadastro-mobile.png', fullPage: true });
  await mobileClientModal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(mobileClientModal).toHaveCount(0);

  const mobileVisualClient = page.locator('.client-list article').filter({ hasText: 'Cliente Homologação Visual' });
  await mobileVisualClient.getByRole('button', { name: 'Visualizar' }).click();
  await expect(page.getByText(service.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '2ª via PDF A4' })).toHaveAttribute('href', `/api/orders/${orderResponse.body.id}/final/1/pdf`);
  await page.screenshot({ path: 'visual-artifacts/02-clientes-historico-mobile.png', fullPage: true });

  await page.locator('.menu-toggle').click();
  await page.locator('aside').getByRole('button', { name: 'Nova OS' }).click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS' })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/03-nova-os-mobile.png', fullPage: true });
});
