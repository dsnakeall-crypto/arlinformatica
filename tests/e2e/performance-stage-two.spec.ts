import { expect, test, type Page, type Route } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

const start = new Date('2026-10-04T12:00:00Z');
const nav = (page: Page, name: string) => {
  const button = page.getByRole('button', { name, exact: true });
  return (name === 'Nova OS' ? button.first() : button).click();
};
const clients = Array.from({ length: 65 }, (_, i) => ({ id: i + 100, name: `Cache Cliente ${String(i).padStart(2, '0')}`, document: '', phone: '35999990000', postal_code: '37160000', street: 'Rua Teste', number: '1', district: 'Centro', city: 'Campos Gerais', state: 'MG' }));
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function setup(page: Page) { await page.clock.setFixedTime(start); await login(page); }
async function orderFixture(page: Page) {
  const c = await api(page, '/clients', 'POST', { ...clients[0], id: undefined, document: uniqueDocument() });
  expect(c.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', { client_id: c.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench', reported_problem: 'Cache isolado', checklist: [] });
  expect(order.status).toBe(201); return order.body;
}
function orderResult(order: any, url: URL, name = 'Cache OS') {
  const current = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('per_page') || 12);
  return { data: [{ ...order, client: { ...order.client, name } }], total: 61, current_page: current, last_page: Math.ceil(61 / size), per_page: size, from: (current - 1) * size + 1, to: current * size, next_page_url: current < Math.ceil(61 / size) ? '/api/orders?page=2' : null, tab_counts: {} };
}

test('Clientes volta imediatamente com pesquisa, ordenação, página e tamanho preservados', async ({ page }) => {
  await setup(page); let calls = 0;
  await page.route('**/api/clients?all=1', route => { calls++; return route.fulfill({ json: { data: clients } }); });
  await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toHaveCount(12);
  await page.getByLabel('Buscar clientes').fill('Cache');
  await page.getByLabel('Ordenar clientes').selectOption('id');
  await page.getByLabel('Clientes por página').selectOption('30');
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  const first = await page.locator('.clients-row').first().textContent();
  await nav(page, 'Painel'); await nav(page, 'Clientes');
  await expect(page.locator('.clients-row').first()).toHaveText(first!);
  await expect(page.getByLabel('Buscar clientes')).toHaveValue('Cache');
  await expect(page.getByLabel('Ordenar clientes')).toHaveValue('id');
  await expect(page.getByLabel('Clientes por página')).toHaveValue('30');
  await expect(page.getByText('Página 2 de 3', { exact: true })).toBeVisible(); expect(calls).toBe(1);
  await page.screenshot({ path: test.info().outputPath('clientes-cache.png') });
});

test('Clientes mostra loading inicial e mantém linhas durante TTL expirado e falha de refresh', async ({ page }) => {
  await setup(page); let calls = 0; const initial = gate(), refresh = gate();
  await page.route('**/api/clients?all=1', async route => {
    calls++; if (calls === 1) { await initial.promise; await route.fulfill({ json: { data: clients } }); }
    else if (calls === 2) { await refresh.promise; await route.fulfill({ status: 500, json: { message: 'Falha de atualização controlada' } }); }
    else { await route.fulfill({ json: { data: clients.map(c => ({ ...c, name: `${c.name} atualizado` })) } }); }
  });
  await nav(page, 'Clientes'); await expect(page.getByText('Carregando clientes…', { exact: true })).toBeVisible();
  initial.release(); await expect(page.locator('.clients-row')).toHaveCount(12);
  await page.getByLabel('Buscar clientes').fill('Cache Cliente 01');
  await nav(page, 'Painel'); await page.clock.setFixedTime(new Date(start.getTime() + 31_000)); await nav(page, 'Clientes');
  await expect.poll(() => calls).toBe(2); await expect(page.locator('.clients-row')).toHaveCount(1);
  await expect(page.getByText('Atualizando clientes…')).toBeVisible();
  await expect(page.getByText('Carregando clientes…', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('clientes-refresh.png') });
  refresh.release(); await expect(page.getByRole('alert')).toContainText('Falha de atualização controlada');
  await expect(page.locator('.clients-row')).toHaveCount(1); await expect(page.getByLabel('Buscar clientes')).toHaveValue('Cache Cliente 01');
  await nav(page, 'Painel'); await nav(page, 'Clientes');
  await expect(page.locator('.clients-row')).toContainText('Cache Cliente 01 atualizado'); expect(calls).toBe(3);
});

test('Clientes confirma edição e exclusão, invalida e volta com resultado atualizado', async ({ page }) => {
  await setup(page); let data = [clients[0]], calls = 0;
  await page.route('**/api/clients?all=1', route => { calls++; return route.fulfill({ json: { data } }); });
  await page.route(`**/api/clients/${clients[0].id}`, route => {
    if (route.request().method() === 'PUT') { data = [{ ...data[0], ...route.request().postDataJSON() }]; return route.fulfill({ json: data[0] }); }
    if (route.request().method() === 'DELETE') { data = []; return route.fulfill({ status: 204 }); }
    return route.continue();
  });
  await nav(page, 'Clientes'); await page.locator('.clients-row').getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('[data-testid="client-form"]').getByLabel(/Nome/).fill('Cliente Editado Cache');
  await page.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
  await expect(page.locator('.clients-row')).toContainText('Cliente Editado Cache'); await expect.poll(() => calls).toBe(2);
  await nav(page, 'Painel'); await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toContainText('Cliente Editado Cache'); expect(calls).toBe(2);
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Excluir cliente Cliente Editado Cache', exact: true }).click();
  await expect.poll(() => calls).toBe(3); await expect(page.locator('.clients-row')).toHaveCount(0);
  await nav(page, 'Painel'); await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toHaveCount(0); expect(calls).toBe(3);
});

test('Ordens preserva aba, busca, página e quantidade sem misturar combinações', async ({ page }) => {
  await setup(page); const order = await orderFixture(page); const calls: URL[] = [];
  await page.route('**/api/orders?*', route => { const url = new URL(route.request().url()); calls.push(url); return route.fulfill({ json: orderResult(order, url, `${url.searchParams.get('tab')} ${url.searchParams.get('q')}`) }); });
  await nav(page, 'Ordens'); await expect(page.locator('.order-row')).toContainText('progress');
  await page.getByRole('button', { name: 'Finalizadas', exact: true }).click();
  await page.getByPlaceholder('Número da OS ou nome do cliente…').fill('dell');
  await expect(page.locator('.order-row')).toContainText('dell');
  await page.getByLabel('Itens por página').selectOption('30');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.searchParams.get('page')).toBe('2');
  await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeEnabled();
  const count = calls.length; await nav(page, 'Clientes'); await nav(page, 'Ordens');
  await expect(page.locator('.order-row')).toContainText('finalized dell');
  await expect(page.getByPlaceholder('Número da OS ou nome do cliente…')).toHaveValue('dell');
  await expect(page.getByLabel('Itens por página')).toHaveValue('30'); expect(calls.length).toBe(count);
  await page.screenshot({ path: test.info().outputPath('ordens-cache.png') });
  await page.getByRole('button', { name: 'Em Andamento', exact: true }).click();
  await expect(page.locator('.order-row')).toContainText('progress dell');
});

test('Ordens mantém linhas no refresh e rejeita busca antiga após nova resposta', async ({ page }) => {
  await setup(page); const order = await orderFixture(page); const refresh = gate(), old = gate(); let calls = 0;
  await page.route('**/api/orders?*', async route => {
    const url = new URL(route.request().url()), q = url.searchParams.get('q'); calls++;
    if (q === 'antiga') await old.promise;
    else if (!q && calls > 1) await refresh.promise;
    await route.fulfill({ json: orderResult(order, url, q || (calls === 1 ? 'Anterior visível' : 'Atualizada')) }).catch(() => {});
  });
  await nav(page, 'Ordens'); await expect(page.locator('.order-row')).toContainText('Anterior visível');
  await nav(page, 'Clientes'); await page.clock.setFixedTime(new Date(start.getTime() + 16_000)); await nav(page, 'Ordens');
  await expect(page.getByText('Atualizando ordens…')).toBeVisible(); await expect(page.locator('.order-row')).toContainText('Anterior visível');
  refresh.release(); await expect(page.locator('.order-row')).toContainText('Atualizada');
  const search = page.getByPlaceholder('Número da OS ou nome do cliente…'); await search.fill('antiga'); await expect.poll(() => calls).toBe(3);
  await search.fill('nova'); await expect(page.locator('.order-row')).toContainText('nova'); old.release();
  await expect(page.locator('.order-row')).toContainText('nova'); await expect(search).toHaveValue('nova');
});

test('Troca de identidade descarta lista e resposta pendente da geração anterior', async ({ page }) => {
  await setup(page); let calls = 0; const old = gate();
  await page.route('**/api/clients?all=1', async route => {
    calls++; const n = calls; if (n === 2) await old.promise;
    await route.fulfill({ json: { data: [{ ...clients[0], name: n < 3 ? 'Privado usuário A' : 'Privado usuário B' }] } }).catch(() => {});
  });
  await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toContainText('Privado usuário A');
  await nav(page, 'Painel'); await page.clock.setFixedTime(new Date(start.getTime() + 31_000)); await nav(page, 'Clientes'); await expect.poll(() => calls).toBe(2);
  await page.route('**/api/me', async (route: Route) => { const response = await route.fetch(); const body = await response.json(); await route.fulfill({ json: { ...body, id: body.id + 999, name: 'Usuário B' } }); });
  await page.evaluate(() => window.dispatchEvent(new Event('arl-cache-verify')));
  await expect(page.locator('.clients-row')).toContainText('Privado usuário B'); old.release();
  await expect(page.locator('.clients-row')).not.toContainText('Privado usuário A');
});

test('Criar cliente invalida após sucesso, mas erro de validação preserva cache e formulário', async ({ page }) => {
  await setup(page); let data = [clients[0]], calls = 0, fail = true;
  await page.route('**/api/clients?all=1', route => { calls++; return route.fulfill({ json: { data } }); });
  await page.route('**/api/clients', route => {
    if (route.request().method() !== 'POST') return route.continue();
    if (fail) return route.fulfill({ status: 422, json: { message: 'Cadastro recusado', errors: { name: ['Nome rejeitado no teste'] } } });
    const created = { ...clients[0], ...route.request().postDataJSON(), id: 999 }; data = [...data, created]; return route.fulfill({ status: 201, json: created });
  });
  await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
  const form = page.locator('[data-testid="client-form"]');
  for (const [name, value] of Object.entries({ name: 'Novo Cache', document: uniqueDocument(), phone: '35999990000', street: 'Rua Cache' })) await form.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
  await expect(form).toContainText('Nome rejeitado no teste'); await expect(form.locator('input[name="name"]')).toHaveValue('Novo Cache'); expect(calls).toBe(1);
  fail = false; await page.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
  await expect(page.locator('.clients-row')).toHaveCount(2); await expect.poll(() => calls).toBe(2);
  await nav(page, 'Painel'); await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toContainText(['Cache Cliente 00', 'Novo Cache']); expect(calls).toBe(2);
});

test('Alteração confirmada de status invalida Ordens sem apagar pesquisa', async ({ page }) => {
  await setup(page); const order = await orderFixture(page); let calls = 0, status = order.status;
  await page.route('**/api/orders?*', route => { calls++; return route.fulfill({ json: orderResult({ ...order, status, display_status: status }, new URL(route.request().url())) }); });
  await page.route(`**/api/orders/${order.id}/status`, route => { status = route.request().postDataJSON().status; return route.fulfill({ json: { ...order, status } }); });
  await nav(page, 'Ordens'); await expect(page.locator('.order-row')).toHaveCount(1);
  const search = page.getByPlaceholder('Número da OS ou nome do cliente…'); await search.fill('Cache'); await expect.poll(() => calls).toBe(2);
  await page.getByLabel(`Status da OS ${order.number}`).selectOption('waiting_part');
  await expect.poll(() => calls).toBe(3); await expect(page.getByLabel(`Status da OS ${order.number}`)).toHaveValue('waiting_part');
  await nav(page, 'Clientes'); await nav(page, 'Ordens'); await expect(search).toHaveValue('Cache'); await expect(page.getByLabel(`Status da OS ${order.number}`)).toHaveValue('waiting_part'); expect(calls).toBe(3);
});

test('Equipamentos auxiliares reutilizam consulta fresca, expiram em cinco minutos e buscas Nova OS seguem independentes', async ({ page }) => {
  await setup(page); let equipmentCalls = 0, searchCalls = 0;
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/catalogs/equipment') equipmentCalls++; if (url.pathname === '/api/clients' && url.searchParams.has('q')) searchCalls++; });
  const initialEquipment = page.waitForResponse(response => new URL(response.url()).pathname === '/api/catalogs/equipment');
  await nav(page, 'Nova OS'); await expect.poll(() => equipmentCalls).toBe(1);
  await (await initialEquipment).finished();
  await page.getByPlaceholder('Buscar por nome, apelido, telefone ou CPF/CNPJ').fill('Cache'); await expect.poll(() => searchCalls).toBe(1);
  await nav(page, 'Clientes'); await nav(page, 'Nova OS');
  await expect(page.getByPlaceholder('Buscar por nome, apelido, telefone ou CPF/CNPJ')).toBeVisible(); expect(equipmentCalls).toBe(1);
  await page.getByPlaceholder('Buscar por nome, apelido, telefone ou CPF/CNPJ').fill('Cache'); await expect.poll(() => searchCalls).toBe(2);
  await nav(page, 'Clientes');
  const afterReuse = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(new Date(afterReuse + 300_001)); await nav(page, 'Nova OS');
  await expect.poll(() => equipmentCalls).toBe(2);
});

test('Clientes que permaneceu aberta por minutos conserva apresentação ao sair e voltar', async ({ page }) => {
  await setup(page); let calls = 0; const refresh = gate();
  await page.route('**/api/clients?all=1', async route => { calls++; if (calls > 1) await refresh.promise; await route.fulfill({ json: { data: clients } }); });
  await nav(page, 'Clientes'); await expect(page.locator('.clients-row')).toHaveCount(12);
  const whileVisible = await page.evaluate(() => Date.now()); await page.clock.setFixedTime(new Date(whileVisible + 180_000));
  await nav(page, 'Painel'); await nav(page, 'Clientes');
  await expect.poll(() => calls).toBe(2); await expect(page.locator('.clients-row')).toHaveCount(12);
  await expect(page.getByText('Atualizando clientes…')).toBeVisible(); refresh.release();
  await expect(page.getByText('Atualizando clientes…')).toHaveCount(0);
});
