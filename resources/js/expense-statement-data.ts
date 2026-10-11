import type { SummaryScope } from './expense-summary-overview';

export type StatementInstallment = {
  id: number; debt_id: number; institution_id: number;
  institution_name: string; type_name: string; debt_name: string;
  number: number; installment_count: number; responsibility: 'one' | 'two' | 'shared';
  due_on: string; original_cents: number; credit_cents: number; remaining_cents: number;
  share_one_cents: number; share_two_cents: number; credit_one_cents: number; credit_two_cents: number;
  remaining_one_cents: number; remaining_two_cents: number;
};
export type StatementResponse = {month: string; data: StatementInstallment[]};
export type ScopedStatementRow = StatementInstallment & {
  scope_original_cents: number; scope_credit_cents: number; scope_remaining_cents: number;
  scope_label: string;
};
export type StatementInvoice = {
  key: string; label: string; type_name: string; due_on: string;
  rows: ScopedStatementRow[]; original_cents: number; credit_cents: number; remaining_cents: number;
};
export type StatementInstitution = {
  id: number; name: string; invoices: StatementInvoice[];
  original_cents: number; credit_cents: number; remaining_cents: number;
};
export type StatementProjection = {
  institutions: StatementInstitution[]; original_cents: number; credit_cents: number;
  remaining_cents: number; count: number;
};
const sum = (rows: ScopedStatementRow[], field: 'scope_original_cents' | 'scope_credit_cents' | 'scope_remaining_cents') =>
  rows.reduce((total, row) => total + row[field], 0);
export const isCardType = (type: string) =>
  /cart[aã]o|cr[eé]dito/iu.test(type) && !/d[eé]bito/iu.test(type);

export function projectStatement(scope: SummaryScope, rows: StatementInstallment[]): StatementProjection {
  const perInstitution = new Map<number, { name: string; invoices: Map<string, { label: string; type_name: string; rows: ScopedStatementRow[] }> }>();
  for (const row of rows) {
    const partOriginal = scope === 'one' ? row.share_one_cents :
      scope === 'two' ? row.share_two_cents : row.original_cents;
    const partCredit = scope === 'one' ? row.credit_one_cents :
      scope === 'two' ? row.credit_two_cents : row.credit_cents;
    const partRemaining = scope === 'one' ? row.remaining_one_cents :
      scope === 'two' ? row.remaining_two_cents : row.remaining_cents;
    // Casal contains only shared debts; for individuals include personal and their shared share.
    if ((scope === 'shared' && row.responsibility !== 'shared') || partOriginal <= 0) continue;
    const scoped: ScopedStatementRow = {
      ...row, scope_original_cents: partOriginal, scope_credit_cents: partCredit,
      scope_remaining_cents: partRemaining,
      scope_label: scope === 'shared' ? 'Compartilhada' :
        row.responsibility === 'shared' ? 'Casal - minha parte' : 'Pessoal',
    };
    let institution = perInstitution.get(row.institution_id);
    if (!institution) {
      institution = { name: row.institution_name, invoices: new Map() };
      perInstitution.set(row.institution_id, institution);
    }
    const isCard = isCardType(row.type_name);
    const key = isCard ? 'card:' + row.type_name.toLocaleLowerCase('pt-BR') : 'debt:' + row.debt_id;
    let invoice = institution.invoices.get(key);
    if (!invoice) {
      invoice = {
        label: isCard ? 'Fatura de ' + row.type_name : row.debt_name,
        type_name: row.type_name, rows: [],
      };
      institution.invoices.set(key, invoice);
    }
    invoice.rows.push(scoped);
  }

  const institutions: StatementInstitution[] = [...perInstitution.entries()]
    .map(([id, institution]) => {
      const invoices: StatementInvoice[] = [...institution.invoices.entries()].map(([key, value]) => {
        const sorted = value.rows.sort((a,b) =>
          a.due_on.localeCompare(b.due_on) || a.debt_name.localeCompare(b.debt_name,'pt-BR') || a.id-b.id);
        return {
          key, label: value.label, type_name:value.type_name,
          due_on: sorted[0].due_on, rows: sorted,
          original_cents:sum(sorted,'scope_original_cents'),
          credit_cents:sum(sorted,'scope_credit_cents'),
          remaining_cents:sum(sorted,'scope_remaining_cents'),
        };
      }).sort((a,b) => a.due_on.localeCompare(b.due_on) || a.label.localeCompare(b.label,'pt-BR'));
      const allRows = invoices.flatMap(x=>x.rows);
      return {
        id, name: institution.name, invoices,
        original_cents:sum(allRows,'scope_original_cents'),
        credit_cents:sum(allRows,'scope_credit_cents'),
        remaining_cents:sum(allRows,'scope_remaining_cents'),
      };
    }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));

  const all = institutions.flatMap(i=>i.invoices.flatMap(x=>x.rows));
  return {
    institutions,
    original_cents:sum(all,'scope_original_cents'),
    credit_cents:sum(all,'scope_credit_cents'),
    remaining_cents:sum(all,'scope_remaining_cents'),
    count:all.length,
  };
}
