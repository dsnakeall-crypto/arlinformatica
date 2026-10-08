type Movement = { effective_cents: number; method?: string | null; kind?: string };

// Daily API already applies the São Paulo day bounds and audited adjustments.
// Refunds/expenses are outflows, never receipts; unclassified quick entries are Other.
export function dailyPaymentMethods(transactions: Movement[]) {
  const entries: Record<string, number> = { cash: 0, pix: 0, credit: 0, debit: 0, transfer: 0, other: 0 };
  for (const row of transactions) {
    if (row.kind === 'refund' || row.kind === 'expense' || row.effective_cents <= 0) continue;
    const key = row.method && Object.hasOwn(entries, row.method) ? row.method : 'other';
    entries[key] += row.effective_cents;
  }
  return entries;
}
