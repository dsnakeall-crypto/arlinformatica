import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test.describe.serial('fluxo operacional principal', () => {
  let clientId = 0;
  let orderId = 0;
  let orderNumber = '';
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
    orderNumber = orders.body.data[0].number;
    const detail = await api(page, `/orders/${orderId}`);
    expect(detail.body.attendance_type).toBe('external');
    expect(detail.body.photos[0].bytes).toBeLessThanOrEqual(102400);
    expect((await page.request.get(`/api/orders/${orderId}/term`)).status()).toBe(200);
  });

  test('orçamento, aprovação, andamento, conclusão, PDF e pagamento pela UI', async ({ page }) => {
    await page.getByRole('button', { name: 'Ordens de Serviço' }).click();
    const orderRow = page.locator('.order-row').filter({ hasText: 'Cliente E2E' });
    await orderRow.getByRole('button', { name: 'Ver OS' }).click();
    await expect(page.getByRole('heading', { name: `OS #${orderNumber}` })).toBeVisible();
    await expect(page.getByText('Pagamento ainda não registrado.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar pagamento' })).toBeVisible();
    await expect(page.getByText(/NaN|Invalid Date/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Gerar orçamento' }).click();
    const budgetForm = page.locator('.budget-form');
    await budgetForm.getByLabel('Diagnóstico').fill('Falha de energia');
    await budgetForm.getByLabel('Serviço proposto').fill('Reparo completo');
    await budgetForm.getByLabel('Validade (dias)').fill('7');
    await budgetForm.getByRole('textbox', { name: 'Item *', exact: true }).fill('Formatação E2E');
    await budgetForm.getByLabel('Quantidade').fill('1');
    await budgetForm.getByLabel('Valor unitário').fill('150,00');
    await budgetForm.getByRole('checkbox', { name: /Este item tem garantia/ }).check();
    await budgetForm.getByLabel('Duração').fill('90');
    await budgetForm.getByLabel('Unidade').selectOption('days');
    await budgetForm.getByRole('button', { name: 'Salvar e gerar PDF' }).click();
    await expect(page.getByText(/Revisão 1/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir PDF' })).toHaveAttribute('href', `/api/orders/${orderId}/budgets/1/pdf`);

    await page.getByRole('button', { name: 'Marcar enviado' }).click();
    await expect(page.getByRole('button', { name: 'Aprovar orçamento' })).toBeVisible();
    await page.getByRole('button', { name: 'Aprovar orçamento' }).click();
    await expect(page.getByRole('button', { name: 'Aprovar orçamento' })).toHaveCount(0);

    const statusSelect = page.locator('.status-picker select');
    await statusSelect.selectOption('in_service');
    await expect(page.getByText(/Em Serviço ·/).last()).toBeVisible();
    await statusSelect.selectOption('completed');
    const finalModal = page.locator('.modal-card').filter({ hasText: 'FINALIZAÇÃO DA OS' });
    await expect(finalModal).toBeVisible();
    await finalModal.getByRole('button', { name: 'USAR ITENS DO ORÇAMENTO APROVADO' }).click();
    await finalModal.locator('textarea').fill('Equipamento testado e funcionando.');
    await finalModal.getByRole('button', { name: 'Salvar e concluir OS' }).click();
    await expect(statusSelect).toHaveValue('completed');
    await expect(page.locator('.completion').getByText('Concluído', { exact: true })).toBeVisible();
    await expect(page.getByText('PDF Final')).toBeVisible();

    await page.getByRole('button', { name: 'Registrar pagamento' }).click();
    const paymentModal = page.locator('.modal-card').filter({ hasText: `Pagamento da OS #${orderNumber}` });
    await paymentModal.getByLabel('Valor recebido (R$)').fill('150,00');
    await paymentModal.getByLabel('Forma de pagamento *').selectOption('pix');
    await paymentModal.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(page.getByText(/Pago · R\$ 150,00/)).toBeVisible();

    await page.getByRole('button', { name: 'Financeiro' }).click();
    await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
    await expect(page.getByText('Total do mês')).toBeVisible();
    const finance = await api(page, '/finance/overview');
    expect(finance.status).toBe(200);
    expect(finance.body.month_total_cents).toBeGreaterThanOrEqual(15000);
  });

  test('histórico do cliente e pós-venda são acessíveis pela UI e preservam a OS', async ({ page }) => {
    await page.getByRole('button', { name: 'Clientes' }).click();
    const clientCard = page.locator('.client-list article').filter({ hasText: 'Cliente E2E' });
    await clientCard.getByRole('button', { name: 'Visualizar' }).click();
    await expect(page.getByRole('heading', { name: 'Cliente E2E' })).toBeVisible();
    await expect(page.getByText(`OS #${orderNumber}`)).toBeVisible();

    const history = await api(page, `/clients/${clientId}`);
    expect(history.body.orders.some((order: { id: number }) => order.id === orderId)).toBeTruthy();

    await page.getByRole('button', { name: 'Pós-Venda' }).click();
    await expect(page.getByRole('heading', { name: 'Pós-Venda' })).toBeVisible();
    await expect(page.getByText('Nenhum pós-venda pendente.')).toBeVisible();
    const postSale = await api(page, '/post-sales');
    expect(postSale.status).toBe(200);
    expect(postSale.body).toEqual([]); // a regra de cinco dias impede contato prematuro
  });
});
