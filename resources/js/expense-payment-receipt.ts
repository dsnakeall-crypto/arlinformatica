import { expenseControlApi as api } from './expense-control-api';

export type PaymentReceipt = { operation_id: number; recorded_at: string; total_paid_cents: number; status: 'confirmed' | 'reversed' | 'partially_reversed';
  rows: { entry_id: number; debt_name: string; institution_name: string; type_name: string; month: string; number: number; payer: string; part: 'one' | 'two' | 'both'; kind: string; occurred_on: string; before_cents: number; paid_cents: number; after_cents: number }[] };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function validatePaymentReceipt(receipt: PaymentReceipt) {
  if (!Number.isSafeInteger(receipt.operation_id) || receipt.operation_id <= 0 || !receipt.rows.length
    || !Number.isSafeInteger(receipt.total_paid_cents) || receipt.total_paid_cents <= 0
    || receipt.rows.some(row => [row.before_cents, row.paid_cents, row.after_cents].some(value => !Number.isSafeInteger(value) || value < 0)
      || row.paid_cents <= 0 || row.before_cents - row.paid_cents !== row.after_cents)
    || receipt.rows.reduce((sum, row) => sum + row.paid_cents, 0) !== receipt.total_paid_cents) throw new Error('O comprovante não confere com o pagamento.');
}

export async function createPaymentReceiptPdf(receipt: PaymentReceipt) {
  validatePaymentReceipt(receipt);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = 20;
  const write = (text: string, size = 10, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); const lines = doc.splitTextToSize(text.replace(/\s+/g, ' ').trim(), 170) as string[]; doc.text(lines, 20, y); y += lines.length * 5 + 3; };
  const header = () => { write('Controle de Gastos - ARL Informática', 16, true); write('Comprovante de pagamento | Operação ' + receipt.operation_id, 12, true); write('Registrado em: ' + new Date(receipt.recorded_at).toLocaleString('pt-BR')); };
  header();
  if (receipt.status !== 'confirmed') write(receipt.status === 'reversed' ? 'ATENÇÃO: operação estornada. Comprovante histórico.' : 'ATENÇÃO: operação parcialmente estornada. Comprovante histórico.', 10, true);
  for (const row of receipt.rows) {
    const title = doc.splitTextToSize(row.debt_name, 165) as string[];
    const origin = doc.splitTextToSize(row.institution_name + ' - ' + row.type_name, 165) as string[];
    const height = 39 + (title.length + origin.length) * 5;
    if (y + height > 271) { doc.addPage(); y = 20; header(); }
    doc.setFillColor(235, 247, 240); doc.roundedRect(16, y - 5, 178, height, 3, 3, 'F');
    write(row.debt_name, 11, true); write(row.institution_name + ' - ' + row.type_name, 9);
    write('Pagador: ' + row.payer + ' | Referência: ' + row.month.split('-').reverse().join('/') + ' | Parcela ' + row.number, 9);
    write('Data do pagamento: ' + row.occurred_on.split('-').reverse().join('/') + ' | ' + (row.kind === 'advance' ? 'Quitação incluindo parcelas futuras' : row.after_cents === 0 ? 'Quitação mensal da parte selecionada' : 'Pagamento parcial'), 9);
    write('Saldo antes: ' + money(row.before_cents) + ' | Pago: ' + money(row.paid_cents) + ' | Saldo restante: ' + money(row.after_cents), 10, true);
    y += 5;
  }
  if (y > 253) { doc.addPage(); y = 20; header(); }
  write('TOTAL EFETIVAMENTE PAGO: ' + money(receipt.total_paid_cents), 12, true);
  write('Os valores correspondem à parte baixada nesta operação. Reemitir este comprovante não registra outro pagamento.', 8);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { doc.setPage(page); doc.setFontSize(8); doc.text('Operação ' + receipt.operation_id + ' | Página ' + page + '/' + pages, 20, 289); }
  return doc;
}

export async function downloadExpensePaymentReceipt(operation: number) {
  const receipt = await api<PaymentReceipt>('/operations/' + operation + '/receipt');
  const pdf = await createPaymentReceiptPdf(receipt);
  pdf.save('comprovante-arl-operacao-' + operation + '.pdf');
}
