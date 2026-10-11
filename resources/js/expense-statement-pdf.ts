import type { Summary, Configuration } from './expense-control-page';
import type { SummaryScope } from './expense-summary-overview';
import { projectStatement, type StatementResponse, type StatementInvoice, type ScopedStatementRow } from './expense-statement-data';

const money = (cents: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const clean = (text: string) => text.replace(/\s+/g,' ').normalize('NFC');
const formatDate = (value: string) => value?.substring(0,10).split('-').reverse().join('/') || '—';
const monthLabel = (month: string) => new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const num = (totals: Record<string,number>, key:string) => Number(totals[key]||0);

/** Generates a detailed, reconciled statement solely in the browser.
 * The read-only endpoint returns the same per-share cents as ExpenseControl::figures.
 */
export async function downloadExpenseStatement(scope: SummaryScope, summary: Summary, config: Configuration, month: string, details: StatementResponse): Promise<void> {
  if (details.month !== month || !Array.isArray(details.data)) throw new Error('Os detalhes do relatório não correspondem ao mês selecionado.');
  const totals = summary.totals;
  const result = projectStatement(scope,details.data);
  const prefix = scope === 'month' ? '' : scope === 'shared' ? 'shared_' : scope + '_';
  const original = num(totals,prefix+'original_cents');
  const remaining = num(totals,prefix+'remaining_cents');
  if (original !== result.original_cents || remaining !== result.remaining_cents
      || result.credit_cents !== result.original_cents-result.remaining_cents) {
    throw new Error('Os valores detalhados não conferem com o resumo. Atualize a página e tente novamente; nenhum PDF foi gerado.');
  }
  const one = config.people.find(p=>p.id===1)?.name || 'Responsável 1';
  const two = config.people.find(p=>p.id===2)?.name || 'Responsável 2';
  const owner = scope==='one'?one:scope==='two'?two:scope==='shared'?'Casal':'Todos os responsáveis';
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  const W=210,L=16,R=194, maxY=273;
  let y=20;
  const theme={red:[190,16,58] as const,navy:[27,49,78] as const,secondary:[90,109,132] as const,soft:[242,247,252] as const};
  const font=(size:number,bold=false,color:readonly [number,number,number]=theme.navy)=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);
  };
  const newPage=()=>{doc.addPage();y=20;};
  const reserve=(height:number)=>{if(y+height>maxY)newPage();};
  const paragraph=(value:string,width=162,size=9,emphasis=false) => {
    font(size,emphasis);
    const lines=doc.splitTextToSize(clean(value),width) as string[];
    return lines;
  };
  const topHeader=()=>{
    doc.setFillColor(...theme.red);doc.rect(0,0,W,9,'F');
    doc.setFillColor(...theme.navy);doc.roundedRect(L,17,39,10,2,2,'F');
    font(8,true,[255,255,255]);doc.text('ARL  |  GASTOS',L+4,23.5);
    font(17,true);doc.text('Relatório financeiro detalhado',L,39);y=49;
    font(10,false,theme.secondary);
    const description=doc.splitTextToSize(clean('Mês: '+monthLabel(month)+'   •   Responsável: '+owner),R-L) as string[];
    doc.text(description,L,y);
    y+=description.length*5+6;
    doc.setFillColor(...theme.soft);doc.roundedRect(L,y,R-L,27,4,4,'F');
    font(8,false,theme.secondary);
    doc.text('TOTAL ORIGINAL',L+6,y+8);doc.text('PAGO / ABATIDO',L+65,y+8);doc.text('FALTA PAGAR',L+125,y+8);
    font(12,true);
    doc.text(money(original),L+6,y+19);doc.text(money(result.credit_cents),L+65,y+19);doc.text(money(remaining),L+125,y+19);
    y+=37;
    if(scope==='one'||scope==='two'){
      const personal=num(totals,scope+'_personal_original_cents');
      const shared=num(totals,scope+'_shared_original_cents');
      font(9,false,theme.secondary);
      doc.text('Pessoal: '+money(personal)+'     Casal (minha parte): '+money(shared),L,y);y+=10;
    } else if(scope==='shared'){
      font(9,false,theme.secondary);
      doc.text(clean('Parte de '+one+': '+money(num(totals,'one_shared_original_cents'))),L,y);y+=6;
      doc.text(clean('Parte de '+two+': '+money(num(totals,'two_shared_original_cents'))),L,y);y+=9;
    }
    font(8,false,theme.secondary);doc.text('Instituições, faturas e parcelas do mês selecionado (inclusive já quitadas).',L,y);y+=10;
  };
  topHeader();
  if(!result.institutions.length){
    reserve(14);font(10,false,theme.secondary);doc.text('Nenhuma fatura cadastrada para esta visão e este mês.',L,y);y+=15;
  }
  const subline=(label:string,amount:string)=>{
    reserve(7);font(8,false,theme.secondary);doc.text(clean(label),L+5,y);
    font(9,true);doc.text(amount,R-4,y,{align:'right'});y+=7;
  };
  const installment=(row:ScopedStatementRow) => {
    // two-column description + right-aligned original/paid/balance amounts.
    const part=row.scope_label;
    const title=clean(row.debt_name+'  •  '+part);
    const desc=paragraph(title,91,8.4);
    const height=Math.max(15,desc.length*4.1+7)+(scope==='shared'?5:0);
    reserve(height);
    doc.setDrawColor(229,235,243);doc.line(L+4,y-3,R-4,y-3);
    font(8.5,false);doc.text(desc,L+5,y+2);
    font(8,false,theme.secondary);
    doc.text(clean('Parcela '+row.number+'/'+Math.max(row.installment_count,row.number)+' · vence '+formatDate(row.due_on)),
      L+5,y+desc.length*4.1+3);
    font(8,true);doc.text(money(row.scope_original_cents),L+118,y+3,{align:'right'});
    doc.text(money(row.scope_credit_cents),L+148,y+3,{align:'right'});
    doc.text(money(row.scope_remaining_cents),R-4,y+3,{align:'right'});
    y+=Math.max(15,desc.length*4.1+7);
    if(scope==='shared'){
      font(7.5,false,theme.secondary);
      doc.text(clean(one+': '+money(row.share_one_cents)+'  |  '+two+': '+money(row.share_two_cents)),L+5,y);
      y+=5;
    }
  };
  const invoice=(i:StatementInvoice) => {
    const labelLines=paragraph(i.label,111,9.5,true);
    const headerHeight=Math.max(16,10+labelLines.length*5);
    reserve(headerHeight+14);
    doc.setFillColor(...theme.soft);doc.roundedRect(L+2,y-2,R-L-4,headerHeight,2,2,'F');
    font(9.5,true);doc.text(labelLines,L+6,y+5);
    font(8,false,theme.secondary);doc.text('Vence '+formatDate(i.due_on),R-5,y+5,{align:'right'});
    y+=headerHeight+3;
    reserve(8);
    font(7.5,true,theme.secondary);
    doc.text('DÍVIDA / PARCELA',L+5,y);
    doc.text('ORIGINAL',L+118,y,{align:'right'});
    doc.text('PAGO',L+148,y,{align:'right'});
    doc.text('FALTA',R-4,y,{align:'right'});y+=8;
    for(const row of i.rows)installment(row);
    reserve(9);doc.setDrawColor(208,219,231);doc.line(L+3,y-1,R-3,y-1);
    font(8.5,true);
    doc.text('Subtotal da fatura',L+5,y+5);
    doc.text(money(i.original_cents),L+118,y+5,{align:'right'});
    doc.text(money(i.credit_cents),L+148,y+5,{align:'right'});
    doc.text(money(i.remaining_cents),R-4,y+5,{align:'right'});y+=14;
  };
  for(const institution of result.institutions){
    const name=paragraph(institution.name,R-L-13,10.5,true);
    const headingHeight=Math.max(15,7+name.length*5.5);
    reserve(headingHeight+5);
    doc.setFillColor(...theme.navy);doc.roundedRect(L,y,R-L,headingHeight,2.5,2.5,'F');
    font(10.5,true,[255,255,255]);doc.text(name,L+5,y+9);y+=headingHeight+6;
    for(const inv of institution.invoices)invoice(inv);
    subline('TOTAL DA INSTITUIÇÃO', money(institution.original_cents));
    reserve(7);font(8,false,theme.secondary);
    doc.text('Pago / abatido: '+money(institution.credit_cents)+'   |   Falta pagar: '+money(institution.remaining_cents),L+5,y);y+=13;
  }
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);
    doc.setDrawColor(225,232,241);doc.line(L,282,R,282);
    font(8,false,theme.secondary);
    doc.text('Emitido no dispositivo. Sem armazenamento de PDF no servidor.',L,288);
    doc.text('Página '+page+' de '+pages,R,288,{align:'right'});
  }
  doc.save('controle-gastos-detalhado-'+month.replace(/[^0-9-]/g,'')+'-'+scope+'.pdf');
}
