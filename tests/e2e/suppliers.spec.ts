import { test, expect } from "@playwright/test";
import { api, login, uniqueDocument } from "./helpers";
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
  await supplierModal.getByLabel("Nome / razão social").fill(supplierName);
  await supplierModal.getByLabel("CPF / CNPJ").fill(uniqueDocument());
  await supplierModal.getByLabel("Pessoa de contato").fill("Equipe comercial");
  await supplierModal.getByLabel("Telefone / WhatsApp").fill("35999991234");
  await supplierModal
    .getByLabel("Cidade", { exact: true })
    .fill("Campos Gerais");
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
  const purchaseSection = page.locator(".supplier-purchase-detail");
  await expect(
    purchaseSection.getByRole("heading", { name: /Compra #/ }),
  ).toBeVisible();
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
  await expect(editModal.getByLabel("Nome / razão social")).toHaveValue(
    supplierName,
  );
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
