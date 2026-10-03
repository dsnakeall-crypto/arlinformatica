export type PhotoPurchase = {
  name: string; amount_cents: number; first_number: number; installment_count: number;
  purchased_on: string | null; source_line: string; warnings: string[]; duplicate: boolean;
};

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ignored = /^(?:total|subtotal|saldo|limite|resumo|vencimento|pagamento|valor\s+(?:total|minimo|da\s+fatura)|fatura\s+(?:fechada|atual)|credito|estorno|data\s+descricao)\b/;

export function parseExpensePhoto(text: string): { purchases: PhotoPurchase[]; ignored_lines: number } {
  const purchases: PhotoPurchase[] = [];
  let pending = '', ignoredLines = 0;
  const seen = new Set<string>();
  for (const raw of text.slice(0, 200000).split(/\r?\n/)) {
    const clean = raw.replace(/[|¦]/g, ' ').replace(/\s+/g, ' ').replace(/^[•·]\s*/, '').trim();
    if (!clean) continue;
    if (ignored.test(normalized(clean))) { pending = ''; ignoredLines++; continue; }
    const prices = [...clean.matchAll(/(?:^|\s)(-?\s*(?:R\$\s*)?\d[\d.]*,\d{2})(?!\d)/g)];
    if (!prices.length) {
      // Keep a short wrapped description/date, never an entire page header.
      pending = /^\d{2}[/.]\d{2}(?:[/.]\d{2,4})?\b/.test(clean) ? clean : pending && clean.length <= 100 ? (pending + ' ' + clean).slice(0, 200) : '';
      continue;
    }
    const price = prices[prices.length - 1];
    if (/^-/.test(price[1].trim()) || /-\s*$/.test(clean) || /\b(?:estorno|pagamento recebido|credito recebido)\b/.test(normalized(clean))) { pending = ''; ignoredLines++; continue; }
    const amount = Number(price[1].replace(/R\$|\s|\./g, '').replace(',', '.'));
    const amountCents = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000) { pending = ''; continue; }
    let description = (pending ? pending + ' ' : '') + clean.slice(0, price.index!) + ' ' + clean.slice(price.index! + price[0].length);
    pending = '';
    const date = description.match(/^\s*(\d{2}[/.]\d{2}(?:[/.]\d{2,4})?)\s+/);
    if (date) description = description.slice(date[0].length);
    const parcel = description.match(/(?:\bparc(?:ela)?[.:]?\s*)?\(?\b(\d{1,3})\s*(?:\/|\bde\b)\s*(\d{1,3})\b\)?/i);
    const times = !parcel ? description.match(/\b(\d{1,3})\s*[x×]\b/i) : null;
    let first = 1, count = 1;
    const warnings: string[] = [];
    if (parcel) { first = Number(parcel[1]); count = Number(parcel[2]); description = description.replace(parcel[0], ' '); }
    else if (times) { count = Number(times[1]); description = description.replace(times[0], ' '); }
    else warnings.push('Sem indicação de parcelas: confirme se é compra única.');
    if (first < 1 || count < first || count > 360) warnings.push('A indicação de parcelas precisa ser corrigida.');
    const name = description.replace(/\bR\$\b/g, '').replace(/\s+/g, ' ').replace(/[\s\-–:]+$/, '').trim().slice(0, 200);
    if (!/[a-zÀ-ÿ]{2}/i.test(name) || ignored.test(normalized(name))) { ignoredLines++; continue; }
    if (prices.length > 1) warnings.push('Mais de um valor nesta linha: confirme o valor de cada parcela.');
    const key = normalized(name) + '|' + amountCents + '|' + first + '/' + count + '|' + (date?.[1] || '');
    const duplicate = seen.has(key);
    if (duplicate) warnings.push('Linha repetida nesta foto: confira antes de incluir novamente.');
    seen.add(key);
    purchases.push({ name, amount_cents: amountCents, first_number: first, installment_count: count, purchased_on: date?.[1] || null, source_line: clean, warnings, duplicate });
    if (purchases.length >= 100) break;
  }
  return { purchases, ignored_lines: ignoredLines };
}
