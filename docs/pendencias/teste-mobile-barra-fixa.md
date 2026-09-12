# Teste pendente — barra fixa Mobile/Tablet

Este teste verifica que a barra fixa inferior não cobre cabeçalhos, campos, ações de formulários, o último item de listas longas ou ações em modais dentro de containers roláveis.

Sua reintrodução depende de o campo de equipamento manual sair do enhancer legado `resources/js/manual-equipment.ts` e passar a ser renderizado pelo React. O teste deve voltar à suíte no mesmo bloco que fizer essa migração; ele está adiado, não descartado.

## Código integral para reintrodução

```ts
test('shell mobile mantém cabeçalho, formulários, listas e modais livres da barra fixa', async ({ page }) => {
  await login(page);

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  await expect(page.locator('.app-head .mobile-logo img')).toHaveCount(0);
  await expect(page.locator('.app-head .mobile-logo')).toBeHidden();

  const layout = page.getByLabel('Layout neste dispositivo');
  const bell = page.getByRole('button', { name: 'Notificações', exact: true });
  const [layoutBox, bellBox] = await Promise.all([layout.boundingBox(), bell.boundingBox()]);
  expect(layoutBox).not.toBeNull();
  expect(bellBox).not.toBeNull();
  expect(layoutBox!.x + layoutBox!.width).toBeLessThanOrEqual(bellBox!.x);

  const bottom = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  const assertAboveBottomBar = async (locator: ReturnType<typeof page.locator>) => {
    await locator.scrollIntoViewIfNeeded();
    const [targetBox, bottomBox] = await Promise.all([locator.boundingBox(), bottom.boundingBox()]);
    expect(targetBox).not.toBeNull();
    expect(bottomBox).not.toBeNull();
    expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(bottomBox!.y);
    const hit = await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element
        || element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    });
    expect(hit).toBe(true);
  };

  const suffix = Date.now();
  const clientName = `Cliente Bloco Mobile ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '34999995555',
    postal_code: '38400000',
    street: 'Rua Mobile',
    number: '91',
    district: 'Centro',
    city: 'Uberlândia',
    state: 'MG',
  });
  expect(client.status).toBe(201);

  await bottom.getByRole('button', { name: 'Nova OS', exact: true }).click();
  const fields = page.locator('.os-form input:not([type="hidden"]), .os-form select, .os-form textarea');
  const fontSizes = await fields.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)));
  expect(fontSizes.length).toBeGreaterThan(0);
  for (const fontSize of fontSizes) expect(fontSize).toBeGreaterThanOrEqual(16);

  await page.locator('.os-form section').filter({ hasText: 'Dados do cliente' }).locator('select').selectOption(String(client.body.id));
  await page.getByLabel('Equipamento / Modelo / Acessórios *').fill('Notebook para validação mobile');
  await page.getByLabel('Problema relatado *').fill('Validação do botão de salvar no mobile');
  const createOrder = page.getByRole('button', { name: 'Criar ordem de serviço' });
  await assertAboveBottomBar(createOrder);
  const createdResponse = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await createOrder.click();
  expect((await createdResponse).status()).toBe(201);

  await bottom.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const modal = page.getByRole('dialog', { name: 'Novo cliente' });
  const modalFields = modal.locator('input, select, textarea');
  const modalFontSizes = await modalFields.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)));
  for (const fontSize of modalFontSizes) expect(fontSize).toBeGreaterThanOrEqual(16);
  await assertAboveBottomBar(modal.getByRole('button', { name: 'Salvar cliente' }));
  await modal.getByRole('button', { name: 'Fechar' }).click();

  const longListNames: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    const name = `ZZ Lista Mobile ${suffix}-${String(index).padStart(2, '0')}`;
    longListNames.push(name);
    const response = await api(page, '/clients', 'POST', {
      name,
      document: uniqueDocument(suffix + index + 1),
      phone: '34999994444',
      postal_code: '38400000',
      street: 'Rua Lista',
      number: String(index + 1),
      district: 'Centro',
      city: 'Uberlândia',
      state: 'MG',
    });
    expect(response.status).toBe(201);
  }
  await page.reload();
  const lastItem = page.locator('.clients-list-panel .client-list article').filter({ hasText: longListNames.at(-1)! });
  await expect(lastItem).toBeVisible();
  await assertAboveBottomBar(lastItem);
});
```
