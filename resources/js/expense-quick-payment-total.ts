/** Somente os saldos pendentes do mês para o responsável já selecionado.
 * Não soma valores originais, pagos/abatidos ou parcelas futuras.
 */
export function pendingTotalInCents(rows: ReadonlyArray<{ month_remaining_cents: number }>): number {
  return rows.reduce((total, row) => total + Math.max(0, row.month_remaining_cents), 0);
}
