import { test, expect } from "@playwright/test";
import { api, login, uniqueDocument } from "./helpers";

test("falha ao anexar nota permite repetir sem duplicar compra ou estoque", async ({
  page,
}) => {
  await login(page);
  const stamp = Date.now();
  const supplierResult = await api(page, "/suppliers", "POST", {
    name: `Fornecedor anexo ${stamp}`,
    trade_name: `Parceiro ${stamp}`,
    document: uniqueDocument(),
    phone: "35999991234",
    whatsapp: "35999991234",
    postal_code: "37160000",
    street: "Rua Teste",
    number: "1",
    district: "Centro",
    city: "Campos Gerais",
    state: "MG",
  });
  expect(supplierResult.status).toBe(201);
  const productResult = await api(page, "/catalogs/products", "POST", {
    name: `SSD anexo ${stamp}`,
    price_cents: 48000,
    stock_quantity: 0,
    active: true,
    warranty_enabled: false,
  });
  expect(productResult.status).toBe(201);
  await page.goto(`/suppliers?supplier=${supplierResult.body.id}`);
  await page
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Registrar compra",
    exact: true,
  });
  await modal
    .getByLabel("Buscar produto para a compra")
    .fill(productResult.body.name);
  await modal.locator(".supplier-product-results button").first().click();
  await modal
    .getByLabel(`Custo de ${productResult.body.name}`, { exact: true })
    .fill("20000");
  await modal.getByLabel("Anexar imagem ou PDF da nota fiscal").setInputFiles({
    name: "nota-retry.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
    ),
  });
  let calls = 0;
  await page.route("**/api/supplier-purchases/*/invoices", (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({
          status: 422,
          json: { message: "Falha simulada no upload" },
        })
      : route.continue();
  });
  await modal
    .getByRole("button", { name: "Registrar e receber", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toContainText("Compra registrada");
  await expect(modal.getByLabel("Data da compra")).toBeDisabled();
  await modal
    .getByRole("button", { name: "Reenviar anexo", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  expect(calls).toBe(2);
  const detail = (await api(page, `/suppliers/${supplierResult.body.id}`)).body;
  expect(detail.purchases.data).toHaveLength(1);
  const purchase = (
    await api(page, `/supplier-purchases/${detail.purchases.data[0].id}`)
  ).body;
  expect(purchase.invoices).toHaveLength(1);
  expect(purchase.receipts).toHaveLength(1);
  const products = (await api(page, "/catalogs/products")).body;
  expect(
    products.find((p: any) => p.id === productResult.body.id).stock_quantity,
  ).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Notificações", exact: true }).click();
  await page
    .locator(".notification-wrap button")
    .filter({ hasText: `Compra #${purchase.id} · parcela 1` })
    .click();
  await expect(page).toHaveURL(
    new RegExp(
      `/suppliers\\?supplier=${supplierResult.body.id}&purchase=${purchase.id}$`,
    ),
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: /Compra #/ }),
  ).toBeVisible();
});
test("fornecedor registra compra, recebe parcialmente sem duplicar e preserva brindes sem fornecedor", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.getByRole("button", { name: "Fornecedores", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fornecedores", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Novo fornecedor", exact: true })
    .click();
  const supplierModal = page.getByRole("dialog", {
    name: "Novo fornecedor",
    exact: true,
  });
  const supplierName = `Distribuidora E2E ${Date.now()}`,
    productName = `SSD Fornecedor E2E ${Date.now()}`;
  await supplierModal
    .getByLabel("Razão social / nome completo")
    .fill(supplierName);
  await supplierModal.getByLabel("CPF / CNPJ").fill(uniqueDocument());
  await supplierModal.getByLabel("Pessoa de contato").fill("Equipe comercial");
  await supplierModal.getByLabel("Telefone celular").fill("35999991234");
  await supplierModal.getByLabel("Nome fantasia").fill(supplierName);
  await supplierModal
    .getByRole("button", { name: "Usar celular no WhatsApp" })
    .click();
  await page.route("https://viacep.com.br/ws/37160000/json/", (route) =>
    route.fulfill({
      json: {
        logradouro: "Rua Um",
        bairro: "Centro",
        localidade: "Campos Gerais",
        uf: "MG",
      },
    }),
  );
  await supplierModal.getByLabel("CEP").fill("37160000");
  await expect(supplierModal.getByLabel("Rua / avenida")).toHaveValue("Rua Um");
  await supplierModal.getByLabel("Número").fill("10");
  await supplierModal.getByLabel("Cidade").fill("Campos Gerais");
  await supplierModal.getByLabel("UF", { exact: true }).selectOption("MG");
  await page.screenshot({ path: "output/fornecedores/cadastro-desktop.png" });
  await supplierModal
    .getByRole("button", { name: "Salvar fornecedor" })
    .click();
  await expect(
    page
      .locator(".supplier-profile")
      .getByRole("heading", { name: supplierName, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  const purchaseModal = page.getByRole("dialog", {
    name: "Registrar compra",
    exact: true,
  });
  await purchaseModal
    .getByRole("button", { name: "Cadastrar produto" })
    .click();
  await purchaseModal.getByLabel("Nome do novo produto").fill(productName);
  await purchaseModal.getByLabel("Preço de venda (R$)").fill("48000");
  await purchaseModal
    .getByRole("button", { name: "Criar e adicionar" })
    .click();
  await purchaseModal
    .getByLabel(`Quantidade de ${productName}`, { exact: true })
    .fill("3");
  await purchaseModal
    .getByLabel(`Custo de ${productName}`, { exact: true })
    .fill("20000");
  await purchaseModal.getByLabel("Mercadoria recebida agora").uncheck();
  await purchaseModal.getByLabel("Nota / referência").fill("NF-1001");
  await expect(supplierModal).not.toBeVisible();
  await purchaseModal
    .getByLabel("Condição de pagamento")
    .selectOption("installments");
  await purchaseModal.getByLabel("Forma de pagamento").selectOption("boleto");
  await purchaseModal.getByLabel("Número de parcelas").fill("2");
  await expect(purchaseModal.getByLabel("Valor da parcela 1 (R$)")).toHaveValue(
    "300,00",
  );
  await purchaseModal
    .getByLabel("Anexar imagem ou PDF da nota fiscal")
    .setInputFiles({
      name: "nota-e2e.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
      ),
    });

  await page.screenshot({ path: "output/fornecedores/compra-desktop.png" });
  await purchaseModal
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  await expect(
    page.getByText("Aguardando recebimento", { exact: true }),
  ).toBeVisible();
  const products = (await api(page, "/catalogs/products")).body;
  const product = products.find((row: any) => row.name === productName);
  expect(product.stock_quantity).toBe(0);
  await page.locator(".supplier-purchase-list button").first().click();
  const purchaseSection = page.getByRole("dialog", { name: /Compra #/ });
  await expect(
    purchaseSection.getByRole("heading", { name: /Compra #/ }),
  ).toBeVisible();
  await purchaseSection.getByRole("button", {name: /Notas fiscais/}).click();
  await expect(
    purchaseSection.getByRole("link", { name: /nota-e2e.pdf/ }),
  ).toBeVisible();
  await purchaseSection.getByRole("button", {name: "Parcelas (2)", exact:true}).click();
  await purchaseSection.getByRole("button", {name: /Ver parcelas/}).click();
  await expect(
    purchaseSection.locator(".supplier-installment-history"),
  ).toHaveCount(2);
  await purchaseSection
    .getByRole("button", { name: "Registrar pagamento" })
    .first()
    .click();
  await purchaseSection.getByLabel("Forma utilizada").selectOption("pix");
  await purchaseSection
    .getByRole("button", { name: "Confirmar pagamento", exact: true })
    .click();
  await expect(
    purchaseSection.locator(".supplier-installment-history").first(),
  ).toContainText("Paga em");
  await page.screenshot({
    path: "output/fornecedores/pagamentos-nota-desktop.png",
  });
  await purchaseSection.getByRole("button", {name: "Itens e dados", exact:true}).click();
  await purchaseSection
    .getByRole("button", { name: "Receber mercadoria" })
    .click();
  const receiveModal = page.getByRole("dialog", {
    name: "Receber mercadoria",
    exact: true,
  });
  await receiveModal
    .getByLabel(`Receber ${productName}`, { exact: true })
    .fill("2");
  const receiving = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/supplier-purchases/") &&
      request.url().endsWith("/receipts"),
  );
  await receiveModal
    .getByRole("button", { name: "Confirmar recebimento" })
    .click();
  const receiptRequest = await receiving;
  await expect(
    purchaseSection.getByText("Recebido parcialmente", { exact: true }),
  ).toBeVisible();
  const receiptPath = new URL(receiptRequest.url()).pathname.replace(
    "/api",
    "",
  );
  expect(
    (await api(page, receiptPath, "POST", receiptRequest.postDataJSON()))
      .status,
  ).toBe(201);
  expect(
    (await api(page, "/catalogs/products")).body.find(
      (row: any) => row.id === product.id,
    ).stock_quantity,
  ).toBe(2);
  await purchaseSection
    .getByRole("button", { name: "Receber mercadoria" })
    .click();
  await page
    .getByRole("dialog", { name: "Receber mercadoria", exact: true })
    .getByRole("button", { name: "Confirmar recebimento" })
    .click();
  await expect(
    purchaseSection.getByText("Recebido", { exact: true }),
  ).toBeVisible();
  await purchaseSection.getByRole("button", {name: "Fechar compra", exact:true}).click();
  await page
    .getByRole("tab", { name: "Produtos adquiridos", exact: true })
    .click();
  await expect(
    page
      .locator(".supplier-product-history")
      .getByText("3 unidades recebidas deste fornecedor"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Todos os fornecedores" }).click();
  await page.screenshot({ path: "output/fornecedores/lista-desktop.png" });
  await page.getByLabel("Buscar fornecedor").fill(supplierName);
  const detailLoaded = page.waitForResponse(
    (response) =>
      /^\/api\/suppliers\/\d+$/.test(new URL(response.url()).pathname) &&
      response.status() === 200,
  );
  await page
    .locator(".supplier-directory-row")
    .filter({ hasText: supplierName })
    .click();
  await detailLoaded;
  await expect(
    page.getByRole("heading", { name: supplierName, exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "output/fornecedores/ficha-desktop.png" });
  await page.getByLabel("Layout neste dispositivo").selectOption("mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "output/fornecedores/ficha-mobile.png" });
  expect(
    await page
      .locator(".supplier-page")
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await page.getByRole("button", { name: "Editar cadastro" }).click();
  const editModal = page.getByRole("dialog", {
    name: "Editar fornecedor",
    exact: true,
  });
  await expect(
    editModal.getByLabel("Razão social / nome completo"),
  ).toHaveValue(supplierName);
  await page.screenshot({ path: "output/fornecedores/cadastro-mobile.png" });
  await editModal
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Layout neste dispositivo").selectOption("desktop");
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  const card = page.locator(".services-row").filter({ hasText: productName });
  await card
    .getByRole("button", { name: "Entrada de estoque", exact: true })
    .click();
  const entryModal = page.getByRole("dialog", {
    name: "Entrada de estoque",
    exact: true,
  });
  await entryModal.getByLabel("Origem da entrada").selectOption("gift");
  await entryModal
    .getByLabel("Motivo da entrada")
    .fill("Brinde sem fornecedor");
  await expect(
    entryModal.getByLabel("Custo por unidade da entrada"),
  ).toHaveValue("0,00");
  await entryModal
    .getByRole("button", { name: "Somar ao estoque", exact: true })
    .click();
  await expect(card.getByText(/Estoque: 4/)).toBeVisible();
  const movements = (
    await api(page, `/catalogs/products/${product.id}/stock-movements`)
  ).body;
  expect(movements[0].origin).toBe("gift");
  expect(movements[0].unit_cost_cents).toBe(0);
  expect(movements[0].supplier_snapshot).toBeNull();
  expect(
    movements.slice(1).every((row: any) => row.unit_cost_cents === 20000),
  ).toBe(true);
  const noCsrf = await page.request.post("/api/suppliers", {
    data: { name: "Sem CSRF" },
    headers: { Accept: "application/json" },
  });
  expect(noCsrf.status()).toBe(419);
});
