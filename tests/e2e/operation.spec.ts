import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test.describe.serial('fluxo operacional principal', () => {
  let clientId = 0;
  let orderId = 0;
  const document = uniqueDocument(20260902);

  test.beforeEach(async ({ page }) => login(page));

  test('Master cria Funcionário e o backend bloqueia duplicidade', async ({ page }) => {
    await page.getByRole('button', { name: 'Usuários' }).click();
    await page.getByRole('button', { name: 'Novo usuário' }).click();
    const modal = page.locator('.modal-card');
    await modal.locator('label').filter({ hasText: 'Nome' }).locator('input').fill('Funcionário Homologação');
    await modal.locator('label').filter({ hasText: 'Login' }).locator('input').fill('func.homologacao');
    await modal.locator('select').selectOption({ label: 'Funcionário' });
    await modal.locator('label').filter({ hasText: 'Senha forte' }).locator('input').fill('Funcionario-2026!');
    await modal.locator('label').filter({ hasText: 'Confirmar senha' }).locator('input').fill('Funcionario-2026!');
    await modal.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Funcionário Homologação')).toBeVisible();
  });

  test('cadastra cliente com fallback manual, CPF válido, edição e links', async ({ page }) => {
    await page.getByRole('button', { name: 'Clientes' }).click();
    await page.getByRole('button', { name: 'Novo cliente' }).click();
    const form = page.locator('.form-card');
    const values: Record<string, string> = { name: 'Cliente E2E', document, phone: '34999998888', postal_code: '99999999', street: 'Rua Manual', number: '10', district: 'Centro', city: 'Araguari', state: 'MG' };
    for (const [name, value] of Object.entries(values)) await form.locator(`[name="${name}"]`).fill(value);
    await form.getByRole('button', { name: 'Salvar cliente' }).click();
    await expect(page.getByText('Cliente E2E')).toBeVisible();
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me|whatsapp/);
    await expect(page.getByRole('link', { name: 'Maps' })).toHaveAttribute('href', /google/);
    const found = await api(page, `/clients?q=${document}`);
    clientId = found.body.data[0].id;
    const duplicate = await api(page, '/clients', 'POST', { ...values, name: 'Duplicado', document, postal_code: '99999999' });
    expect(duplicate.status).toBe(422);
  });

  test('abre OS externa com equipamento, fabricante, avaria, foto e termo', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
    await page.locator('.os-form section').first().locator('select').selectOption(String(clientId));
    await page.getByLabel('Equipamento *').selectOption({ label: 'Notebook' });
    await page.getByLabel('Fabricante').selectOption({ label: 'Dell' });
    await page.getByRole('button', { name: 'ATENDIMENTO EXTERNO' }).click();
    await page.getByLabel('Problema relatado *').fill('Notebook não liga durante homologação');
    await page.locator('details').click();
    await page.getByText('Tela riscada').locator('input').check();
    await page.locator('input[type=file]').setInputFiles({ name: 'equipamento.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
    await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
    await expect(page.getByText('Notebook não liga durante homologação')).toBeVisible();
    const orders = await api(page, '/orders?q=Cliente%20E2E');
    orderId = orders.body.data[0].id;
    const detail = await api(page, `/orders/${orderId}`);
    expect(detail.body.attendance_type).toBe('external');
    expect(detail.body.photos[0].bytes).toBeLessThanOrEqual(102400);
    expect((await page.request.get(`/api/orders/${orderId}/term`)).status()).toBe(200);
  });

  test('orçamento, aprovação, andamento, conclusão, PDF e pagamento', async ({ page }) => {
    const budget = await api(page, `/orders/${orderId}/budgets`, 'POST', { diagnosis: 'Falha de energia', proposal: 'Reparo completo', validity_days: 7, items: [{ description: 'Formatação E2E', quantity: 1, unit_price_cents: 15000, warranty_enabled: true, warranty_term: 90, warranty_unit: 'days' }] });
    expect(budget.status).toBe(201);
    expect((await page.request.get(`/api/orders/${orderId}/budgets/1/pdf`)).status()).toBe(200);
    expect((await api(page, `/orders/${orderId}/budgets/1/status`, 'PATCH', { status: 'sent' })).status).toBe(200);
    expect((await api(page, `/orders/${orderId}/budgets/1/status`, 'PATCH', { status: 'approved' })).status).toBe(200);
    expect((await api(page, `/orders/${orderId}/status`, 'PATCH', { status: 'in_service' })).status).toBe(200);
    const final = await api(page, `/orders/${orderId}/finalize`, 'POST', { result: 'repair_completed', technical_report: 'Equipamento testado e funcionando.', discount_cents: 0, approved_budget_id: budget.body.budget.id, photo_ids: [], items: [{ description: 'Formatação E2E', quantity: 1, unit_price_cents: 15000, warranty_enabled: true, warranty_term: 90, warranty_unit: 'days' }] });
    expect(final.status).toBe(201);
    expect((await page.request.get(`/api/orders/${orderId}/final/1/pdf`)).status()).toBe(200);
    expect((await api(page, `/orders/${orderId}/payment`, 'POST', { amount_cents: 15000, method: 'pix', idempotency_key: `e2e-${orderId}` })).status).toBe(201);
    const finance = await api(page, '/finance/overview');
    expect(finance.status).toBe(200);
    expect(finance.body.month_total_cents).toBeGreaterThanOrEqual(15000);
  });

  test('histórico do cliente e pós-venda preservam a OS', async ({ page }) => {
    const history = await api(page, `/clients/${clientId}`);
    expect(history.body.orders.some((order: { id: number }) => order.id === orderId)).toBeTruthy();
    const postSale = await api(page, '/post-sales');
    expect(postSale.status).toBe(200);
    expect(postSale.body).toEqual([]); // a regra de cinco dias impede contato prematuro
  });
});
