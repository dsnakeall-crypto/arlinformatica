import { test } from '@playwright/test';
import { monthlyInvoiceFlow } from './expense-monthly-final-flow';
test('fatura final desktop: categorias, PDFs, CSRF, partes e mês quitado', async ({ page }) => { test.setTimeout(120000); await monthlyInvoiceFlow(page, false); });
