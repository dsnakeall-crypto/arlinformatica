import type { Summary, Configuration } from './expense-control-page';
import type { SummaryScope } from './expense-summary-overview';
import { projectStatement, type StatementResponse, type ScopedStatementRow } from './expense-statement-data';

const money = (cents: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const clean = (text: string) => text.replace(/\s+/g,' ').normalize('NFC');
const formatDate = (value: string) => value?.substring(0,10).split('-').reverse().join('/') || '—';
const monthLabel = (month: string) => new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const num = (totals: Record<string,number>, key:string) => Number(totals[key]||0);

/** Generates a detailed, reconciled statement solely in the browser.
 * The read-only endpoint returns the same per-share cents as ExpenseControl::figures.
 */
export async function createExpenseStatementPdf(scope: SummaryScope, summary: Summary, config: Configuration, month: string, details: StatementResponse) {
  if (details.month !== month || !Array.isArray(details.data)) throw new Error('Os detalhes do relatório não correspondem ao mês selecionado.');
  const totals = summary.totals;
  const result = projectStatement(scope,details.data);
  const prefix = scope === 'month' ? '' : scope === 'shared' ? 'shared_' : scope + '_';
  const original = num(totals,prefix+'original_cents');
  const remaining = num(totals,prefix+'remaining_cents');
  const scopedPaid = (row: ScopedStatementRow) => scope === 'one' ? row.paid_one_cents ?? row.credit_one_cents : scope === 'two' ? row.paid_two_cents ?? row.credit_two_cents : row.paid_cents ?? row.credit_cents;
  const paid = result.institutions.flatMap(i => i.invoices.flatMap(v => v.rows)).reduce((sum, row) => sum + scopedPaid(row), 0);
  if (original !== result.original_cents || remaining !== result.remaining_cents
      || result.credit_cents !== result.original_cents-result.remaining_cents) {
    throw new Error('Os valores detalhados não conferem com o resumo. Atualize a página e tente novamente; nenhum PDF foi gerado.');
  }
  const one = config.people.find(p=>p.id===1)?.name || 'Responsável 1';
  const two = config.people.find(p=>p.id===2)?.name || 'Responsável 2';
  const owner = scope==='one'?one:scope==='two'?two:scope==='shared'?'Casal':'Todos os responsáveis';
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  const L=16,R=194,maxY=274;
  let y=20,tableNumber=0,currentGroup='';
  const font=(size:number,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(22,43,63);};
  const text=(value:string,size=9,bold=false)=>{font(size,bold);const lines=doc.splitTextToSize(clean(value),R-L-10) as string[];doc.text(lines,L+5,y);y+=lines.length*4.5+3;};
  const heading=()=>{font(13,true);doc.text('Controle de Gastos - ARL Informática',L,y);y+=8;text(currentGroup || 'Relatório financeiro',10,true);text('Mês: '+monthLabel(month)+' | Responsável: '+owner,9);y+=3;};
  const newPage=()=>{doc.addPage();y=20;heading();};
  const reserve=(height:number)=>{if(y+height>maxY)newPage();};
  heading();
  text('Total da fatura: '+money(original)+' | Pago: '+money(paid)+' | Falta pagar: '+money(remaining),10,true);
  if(result.credit_cents>paid)text('Abatimentos sem pagamento: '+money(result.credit_cents-paid),9);
  const allRows=result.institutions.flatMap(i=>i.invoices.flatMap(v=>v.rows));
  const groups=new Map<string,{name:string;rows:ScopedStatementRow[]}>();
  for(const row of allRows){const key=row.institution_id+':'+row.type_name;let group=groups.get(key);if(!group){group={name:row.institution_name+' - '+row.type_name,rows:[]};groups.set(key,group);}group.rows.push(row);}
  let first=true;
  for(const group of groups.values()){
    currentGroup=group.name;
    if(!first)newPage();else {text(currentGroup,12,true);first=false;}
    for(const row of group.rows){
      font(10,true);
      const titleLines=doc.splitTextToSize(clean(row.debt_name),R-L-10) as string[];
      const responsible=row.responsibility==='shared'?'Casal':row.responsibility==='one'?one:two;
      const fields: [string,number,boolean][] = [
        ['Responsável: '+responsible+(row.responsibility==='shared'&&(scope==='one'||scope==='two')?' - participação de '+owner:''),9,false],
        ['Referência: '+month.split('-').reverse().join('/')+' | Parcela '+row.number+'/'+Math.max(row.installment_count,row.number)+' | Vencimento '+formatDate(row.due_on),8,false],
        [(row.responsibility==='shared'&&(scope==='one'||scope==='two')?'Parcela mensal total do casal: ':'Valor total da parcela: ')+money(row.original_cents),9,true],
      ];
      if(row.responsibility==='shared'&&(scope==='one'||scope==='two'))fields.push(['Participação de '+owner+': '+money(row.scope_original_cents),9,false]);
      fields.push(['Já pago: '+money(scopedPaid(row))+' | Falta pagar: '+money(row.scope_remaining_cents),10,true]);
      if(row.responsibility==='shared'&&(scope==='month'||scope==='shared')){
        fields.push(['Parte de '+one+': '+money(row.share_one_cents)+' | Pago: '+money(row.paid_one_cents??row.credit_one_cents)+' | Falta: '+money(row.remaining_one_cents),8,false]);
        fields.push(['Parte de '+two+': '+money(row.share_two_cents)+' | Pago: '+money(row.paid_two_cents??row.credit_two_cents)+' | Falta: '+money(row.remaining_two_cents),8,false]);
      }
      if(row.scope_credit_cents>scopedPaid(row))fields.push(['Abatimento sem pagamento: '+money(row.scope_credit_cents-scopedPaid(row)),8,false]);
      const height=titleLines.length*4.5+5+fields.reduce((sum,[value,size,bold])=>{
        font(size,bold);return sum+(doc.splitTextToSize(clean(value),R-L-10) as string[]).length*4.5+3;
      },0)+8;
      reserve(height+4);
      if(tableNumber++%2===0)doc.setFillColor(228,240,255);else doc.setFillColor(214,241,221);
      doc.setDrawColor(174,193,208);doc.roundedRect(L,y-4,R-L,height,3,3,'FD');
      font(10,true);doc.text(titleLines,L+5,y+2);y+=titleLines.length*4.5+5;
      for(const [value,size,bold] of fields)text(value,size,bold);
      y+=12;
    }
    const subtotal=group.rows.reduce((sum,row)=>sum+row.scope_original_cents,0);
    const subtotalPaid=group.rows.reduce((sum,row)=>sum+scopedPaid(row),0);
    const subtotalRemaining=group.rows.reduce((sum,row)=>sum+row.scope_remaining_cents,0);
    font(10,true);reserve((doc.splitTextToSize(clean('Subtotal '+group.name),R-L-10) as string[]).length*4.5+15);text('Subtotal '+group.name,10,true);text('Fatura: '+money(subtotal)+' | Pago: '+money(subtotalPaid)+' | Falta: '+money(subtotalRemaining),9,true);
  }
  if(!groups.size)text('Nenhuma fatura cadastrada neste período.',10);
  reserve(14);text('TOTAL GERAL DO RELATÓRIO: '+money(original)+' | Pago: '+money(paid)+' | Falta: '+money(remaining),10,true);
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){doc.setPage(page);font(8);doc.text('Mês '+month+' | '+owner+' | Página '+page+'/'+pages,L,288);}
  return doc;
}

export async function downloadExpenseStatement(scope: SummaryScope, summary: Summary, config: Configuration, month: string, details: StatementResponse): Promise<void> {
  const doc = await createExpenseStatementPdf(scope, summary, config, month, details);
  doc.save('controle-gastos-detalhado-'+month.replace(/[^0-9-]/g,'')+'-'+scope+'.pdf');
}


/** Pending-only monthly invoices. Business totals come exclusively from the backend. */
export async function createMonthlyInvoicePdf(scope: import('./expense-monthly-invoice').InvoiceScope | 'month', statement: import('./expense-monthly-invoice').MonthlyStatement, config: Configuration) {
  const { month, totals, data } = statement;
  if (!/^\d{4}-\d{2}$/.test(month) || !Array.isArray(data)) throw new Error('Relatório mensal inválido.');
  for (const value of Object.values(totals)) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Saldo inválido no relatório.');
  const scopes = ['one', 'two', 'shared'] as const;
  for (const key of scopes) {
    const expected = totals[key === 'one' ? 'one_cents' : key === 'two' ? 'two_cents' : 'shared_cents'];
    const rows = data.filter(row => row.responsibility === key);
    if (rows.some(row => !Number.isSafeInteger(row.remaining_cents) || row.remaining_cents <= 0 || row.remaining_cents !== row.remaining_one_cents + row.remaining_two_cents)
      || rows.reduce((sum, row) => sum + row.remaining_cents, 0) !== expected) throw new Error('Detalhes e totais do mês não conferem. Atualize o resumo.');
  }
  if (totals.total_cents !== totals.one_cents + totals.two_cents + totals.shared_cents
    || totals.shared_cents !== totals.shared_one_cents + totals.shared_two_cents) throw new Error('Categorias da fatura não conferem.');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const labels = { one: config.people.find(p => p.id === 1)?.name || 'Allan', two: config.people.find(p => p.id === 2)?.name || 'Carol', shared: 'Casal' };
  const colors = { one: [30, 83, 165], two: [26, 126, 69], shared: [185, 28, 28] } as const;
  let y = 20;
  const reserve = (height: number) => { if (y + height > 273) { doc.addPage(); y = 20; } };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('ARL | Fatura do mês', 16, y); y += 9;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text('Mês: ' + month.split('-').reverse().join('/'), 16, y); y += 7;
  doc.setFontSize(9); doc.text('Somente saldos pendentes. Valores em reais.', 16, y); y += 12;
  for (const key of scope === 'month' ? scopes : [scope]) {
    const rows = data.filter(row => row.responsibility === key);
    reserve(24); doc.setTextColor(colors[key][0], colors[key][1], colors[key][2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(labels[key] + (key === 'shared' ? ' - compartilhadas' : ' - individual'), 16, y); y += 9;
    doc.setTextColor(35, 48, 65); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    if (!rows.length) { doc.text('Nenhum saldo pendente neste mês.', 16, y); y += 9; }
    for (const row of rows) {
      const title = doc.splitTextToSize(clean(row.debt_name), 133) as string[];
      const origin = doc.splitTextToSize(clean(row.institution_name + ' / ' + row.type_name), 170) as string[];
      const height = 12 + title.length * 4.5 + origin.length * 4.5 + (key === 'shared' ? 6 : 0);
      reserve(height); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(title, 16, y);
      doc.text(money(row.remaining_cents), 194, y, { align: 'right' }); y += title.length * 4.5 + 1;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(origin, 16, y); y += origin.length * 4.5;
      doc.text('Vencimento: ' + formatDate(row.due_on), 16, y); y += 6;
      if (key === 'shared') { doc.text(labels.one + ': ' + money(row.remaining_one_cents) + ' | ' + labels.two + ': ' + money(row.remaining_two_cents), 16, y); y += 6; }
      y += 4;
    }
    reserve(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Total ' + labels[key] + ': ' + money(totals[key === 'one' ? 'one_cents' : key === 'two' ? 'two_cents' : 'shared_cents']), 16, y); y += 14;
  }
  if (scope === 'month') { reserve(15); doc.setFontSize(13); doc.text('TOTAL FATURA: ' + money(totals.total_cents), 16, y); }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 109, 132); doc.text('Gerado no dispositivo | Página ' + i + '/' + pages, 16, 288); }
  return doc;
}

export async function downloadMonthlyInvoice(scope: import('./expense-monthly-invoice').InvoiceScope | 'month', statement: import('./expense-monthly-invoice').MonthlyStatement, config: Configuration): Promise<void> {
  const doc = await createMonthlyInvoicePdf(scope, statement, config);
  doc.save('fatura-pendente-' + statement.month + '-' + scope + '.pdf');
}
