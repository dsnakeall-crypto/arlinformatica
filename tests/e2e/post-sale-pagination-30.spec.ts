import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("Pós-venda lista 30 por página sem perder busca ou seleção em lote", async ({ page }, testInfo) => {
  const fixture = Array.from({ length: 65 }, (_, index) => {
    const n = index + 1;
    return {
      id: n,
      number: String(n).padStart(6, "0"),
      name: `Cliente Teste ${String(n).padStart(3, "0")}`,
      eligible_at: "2026-10-01T10:00:00-03:00",
      available: true,
      actions: { google: { confirmed_at: null }, instagram: { confirmed_at: null } },
      whatsapp: { google: "https://wa.me/5535999999999", instagram: "https://wa.me/5535999999999" },
    };
  });
  await page.setViewportSize({ width: 1366, height: 850 });
  await login(page);
  await page.route(/\/api\/post-sales\?/, (route) => {
    const url = new URL(route.request().url());
    const requestedPage = Number(url.searchParams.get("page") || 1);
    const search = (url.searchParams.get("q") || "").toLocaleLowerCase("pt-BR");
    const matching = fixture.filter((row) => (row.number + " " + row.name).toLocaleLowerCase("pt-BR").includes(search));
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        data: matching.slice((requestedPage - 1) * 30, requestedPage * 30),
        total: matching.length, current_page: requestedPage,
        last_page: Math.max(1, Math.ceil(matching.length / 30)), per_page: 30,
      }),
    });
  });
  await page.route("**/api/post-sales/bulk-delete", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ deleted: true }) }));
  await page.goto("/post-sale");

  const rows = page.locator(".post-sale-list-item");
  const next = page.getByRole("button", { name: "Próxima página do Pós-Venda" });
  const previous = page.getByRole("button", { name: "Página anterior do Pós-Venda" });
  const pagination = page.getByRole("navigation", { name: "Paginação do Pós-Venda" });

  await expect(rows).toHaveCount(30);
  await expect(pagination).toContainText("Exibindo 1–30 de 65");
  await expect(pagination).toContainText("Página 1 de 3");
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(rows.first()).toContainText("Cliente Teste 001");
  await expect(rows.last()).toContainText("Cliente Teste 030");

  await next.click();
  await expect(rows).toHaveCount(30);
  await expect(rows.first()).toContainText("Cliente Teste 031");
  await expect(rows.last()).toContainText("Cliente Teste 060");
  await expect(pagination).toContainText("Exibindo 31–60 de 65");

  await page.getByRole("button", { name: "Selecionar listas" }).click();
  await page.getByRole("button", { name: /Selecionar todos \(30\)/ }).click();
  await expect(page.getByRole("region", { name: "Registros selecionados" })).toContainText("30 registros selecionados");
  await next.click();
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("Cliente Teste 061");
  await expect(rows.last()).toContainText("Cliente Teste 065");
  await expect(next).toBeDisabled();
  await expect(page.getByRole("button", { name: /Selecionar todos \(5\)/ })).toBeVisible();
  await page.getByRole("button", { name: /Selecionar todos \(5\)/ }).click();
  await expect(page.getByRole("region", { name: "Registros selecionados" })).toContainText("35 registros selecionados");

  await page.getByPlaceholder("Buscar por cliente ou número da OS…").fill("Cliente Teste 065");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Cliente Teste 065");
  await expect(pagination).toContainText("Página 1 de 1");
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await page.getByPlaceholder("Buscar por cliente ou número da OS…").fill("");
  await expect(rows).toHaveCount(30);
  await expect(pagination).toContainText("Página 1 de 3");
  await next.click();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await next.click();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();

  await page.getByRole("button", { name: /Desmarcar todos \(5\)/ }).click();
  await expect(page.getByRole("region", { name: "Registros selecionados" })).toContainText("30 registros selecionados");
  await previous.click();
  await expect(rows).toHaveCount(30);
  await expect(rows.first()).toContainText("Cliente Teste 031");
  // A edição mobile Premium não expõe o Pós-Venda: verifica redirecionamento seguro
  // sem perder cobertura funcional da paginação, busca e seleção acima no Web/PC.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.arl-mobile-home-premium')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })).toBeVisible();
  const widthProbe = await page.evaluate(() => ({
    viewport: innerWidth, total: document.documentElement.scrollWidth,
    nav: document.querySelector('.arl-global-mobile-nav')?.getBoundingClientRect().toJSON(),
  }));
  expect(widthProbe.nav).toBeTruthy();
  expect(widthProbe.nav!.right).toBeLessThanOrEqual(widthProbe.viewport + 1);
  expect(widthProbe.total).toBeLessThanOrEqual(widthProbe.viewport + 1);
  await page.screenshot({ path: testInfo.outputPath("pos-venda-premium-mobile.png") });
});

test("Pós-venda ajusta a última página depois de excluir registros fictícios", async ({ page }) => {
  let fixture = Array.from({ length: 65 }, (_, index) => ({
    id: index + 1,
    number: String(index + 1).padStart(6, "0"),
    name: `Cliente Exclusão ${index + 1}`,
    eligible_at: "2026-10-01T10:00:00-03:00",
    available: true,
    actions: {},
    whatsapp: { google: "https://wa.me/5535999999999", instagram: "https://wa.me/5535999999999" },
  }));
  await login(page);
  await page.route(/\/api\/post-sales\?/, (route) => {
    const url = new URL(route.request().url());
    const requestedPage = Number(url.searchParams.get("page") || 1);
    const search = (url.searchParams.get("q") || "").toLocaleLowerCase("pt-BR");
    const matching = fixture.filter((row) => (row.number + " " + row.name).toLocaleLowerCase("pt-BR").includes(search));
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        data: matching.slice((requestedPage - 1) * 30, requestedPage * 30),
        total: matching.length, current_page: requestedPage,
        last_page: Math.max(1, Math.ceil(matching.length / 30)), per_page: 30,
      }),
    });
  });
  let sentIds: number[] = [];
  await page.route("**/api/post-sales/bulk-delete", async route => {
    sentIds = (route.request().postDataJSON() as { ids: number[] }).ids;
    fixture = fixture.filter((row) => !sentIds.includes(row.id));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ deleted: true, ids: sentIds }) });
  });
  await page.goto("/post-sale");
  const rows = page.locator(".post-sale-list-item");
  await page.getByRole("button", { name: "Próxima página do Pós-Venda" }).click();
  await page.getByRole("button", { name: "Próxima página do Pós-Venda" }).click();
  await expect(rows).toHaveCount(5);
  await page.getByRole("button", { name: "Selecionar listas" }).click();
  await page.getByRole("button", { name: /Selecionar todos \(5\)/ }).click();
  await page.getByRole("region", { name: "Registros selecionados" }).getByRole("button", { name: "Excluir selecionados" }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir 5 cards de Pós-Venda?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Excluir selecionados" }).click();
  await expect(dialog).toHaveCount(0);
  expect(sentIds).toEqual([61, 62, 63, 64, 65]);
  await expect(rows).toHaveCount(30);
  await expect(page.getByRole("navigation", { name: "Paginação do Pós-Venda" })).toContainText("Página 2 de 2");
  await expect(page.getByRole("navigation", { name: "Paginação do Pós-Venda" })).toContainText("Exibindo 31–60 de 60");
  await expect(rows.first()).toContainText("Cliente Exclusão 31");
  await expect(rows.last()).toContainText("Cliente Exclusão 60");
});
