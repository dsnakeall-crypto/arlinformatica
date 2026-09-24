export function centsFromMoneyInput(value: string): number {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  const cents = Number(digits);
  return Number.isSafeInteger(cents) ? cents : 0;
}

export function moneyInputFromCents(cents = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, Math.trunc(cents)) / 100);
}

export function maskMoneyInput(value: string): string {
  return moneyInputFromCents(centsFromMoneyInput(value));
}
