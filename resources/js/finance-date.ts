import { createElement } from 'react';

const timeZone = 'America/Sao_Paulo';

export function FinanceDate({ value }: { value?: string | null }) {
  if (!value?.trim()) return createElement('time', undefined, '—');
  // Despesas são datas civis; timestamps SQL sem offset são UTC, conforme a sessão do banco.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = dateOnly ? `${value}T12:00:00-03:00` : value.replace(' ', 'T');
  const withOffset = dateOnly || /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`;
  const date = new Date(withOffset);
  if (Number.isNaN(date.getTime())) return createElement('time', undefined, '—');
  const label = dateOnly
    ? date.toLocaleDateString('pt-BR', { timeZone })
    : date.toLocaleString('pt-BR', { timeZone });

  return createElement('time', { dateTime: date.toISOString() }, label);
}
