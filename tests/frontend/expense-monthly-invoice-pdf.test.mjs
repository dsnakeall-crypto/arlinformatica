import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../resources/js/expense-statement-pdf.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll("'./expense-statement-data'", JSON.stringify(new URL('../../resources/js/expense-statement-data.ts', import.meta.url).href))
  .replaceAll("import('jspdf')", 'import(' + JSON.stringify(pathToFileURL(require.resolve('jspdf')).href) + ')');
const { createMonthlyInvoicePdf, createExpenseStatementPdf } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const config = { people: [{ id: 1, name: 'Allan' }, { id: 2, name: 'Carol' }] };
const row = (responsibility, amount, one, two, name) => ({ responsibility, remaining_cents: amount, remaining_one_cents: one, remaining_two_cents: two, institution_name: 'Banco fixture', type_name: 'Cartao', debt_name: name, due_on: '2029-07-12' });
const statement = { month: '2029-07', totals: { one_cents: 12345, two_cents: 23456, shared_cents: 10001, total_cents: 45802, shared_one_cents: 7001, shared_two_cents: 3000 }, data: [row('one', 12345, 12345, 0, 'SomenteAllan'), row('two', 23456, 0, 23456, 'SomenteCarol'), row('shared', 10001, 7001, 3000, 'SomenteCasal')] };
function contents(doc) {
  const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  return [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    try { return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'); } catch { return match[1]; }
  }).join('\n');
}
for (const [scope, expected, excluded] of [['one', 'SomenteAllan', ['SomenteCarol', 'SomenteCasal']], ['two', 'SomenteCarol', ['SomenteAllan', 'SomenteCasal']], ['shared', 'SomenteCasal', ['SomenteAllan', 'SomenteCarol']]]) {
  test('PDF exclusivo ' + scope + ' inclui somente a categoria pendente', async () => {
    const text = contents(await createMonthlyInvoicePdf(scope, statement, config));
    assert.ok(text.includes(expected)); for (const value of excluded) assert.ok(!text.includes(value));
    assert.ok(text.includes('07/2029')); assert.ok(text.includes('12/07/2029'));
    if (scope === 'shared') { assert.ok(text.includes('70,01')); assert.ok(text.includes('30,00')); }
  });
}
test('PDF geral inclui três seções coloridas e Total Fatura uma vez, sem duplicar casal', async () => {
  const text = contents(await createMonthlyInvoicePdf('month', statement, config));
  for (const value of ['SomenteAllan', 'SomenteCarol', 'SomenteCasal', '458,02']) assert.ok(text.includes(value));
  assert.equal((text.match(/TOTAL FATURA/g) || []).length, 1);
  const colors = [...text.matchAll(/([0-9.]+) ([0-9.]+) ([0-9.]+) rg/g)].map(match => match.slice(1).map(Number));
  for (const expected of [[30,83,165], [26,126,69], [185,28,28]]) assert.ok(colors.some(color => color.every((value, i) => Math.abs(value - expected[i] / 255) < 0.01)));
});
test('PDF zerado identifica mês correto e não inventa dívidas', async () => {
  const empty = { month: '2029-08', totals: Object.fromEntries(Object.keys(statement.totals).map(key => [key, 0])), data: [] };
  for (const scope of ['one', 'two', 'shared', 'month']) {
    const text = contents(await createMonthlyInvoicePdf(scope, empty, config));
    assert.ok(text.includes('08/2029')); assert.ok(text.includes('0,00')); assert.ok(!text.includes('SomenteAllan'));
  }
});
test('PDF bloqueia divergência entre detalhes e somas financeiras', async () => {
  await assert.rejects(createMonthlyInvoicePdf('month', { ...statement, totals: { ...statement.totals, total_cents: 99999 } }, config), /não conferem/);
  await assert.rejects(createMonthlyInvoicePdf('one', { ...statement, data: [statement.data[0]] }, config), /não conferem/);
});

const detailed = {month:'2029-07',data:[
 {id:1,debt_id:1,institution_id:1,institution_name:'Banco A',type_name:'Cartao',debt_name:'IndividualAllan',number:1,installment_count:3,responsibility:'one',due_on:'2029-07-12',original_cents:10000,credit_cents:1000,paid_cents:1000,remaining_cents:9000,share_one_cents:10000,share_two_cents:0,credit_one_cents:1000,credit_two_cents:0,paid_one_cents:1000,paid_two_cents:0,remaining_one_cents:9000,remaining_two_cents:0},
 {id:2,debt_id:2,institution_id:2,institution_name:'Banco B',type_name:'Emprestimo',debt_name:'CompraCompartilhada',number:2,installment_count:4,responsibility:'shared',due_on:'2029-07-18',original_cents:10001,credit_cents:3001,paid_cents:2001,remaining_cents:7000,share_one_cents:7001,share_two_cents:3000,credit_one_cents:2001,credit_two_cents:1000,paid_one_cents:1001,paid_two_cents:1000,remaining_one_cents:5000,remaining_two_cents:2000}
]};
const detailedSummary={totals:{original_cents:20001,remaining_cents:16000,one_original_cents:17001,one_remaining_cents:14000,two_original_cents:3000,two_remaining_cents:2000,shared_original_cents:10001,shared_remaining_cents:7000,one_personal_original_cents:10000,one_shared_original_cents:7001,two_shared_original_cents:3000}};
for (const scope of ['one','two','shared']) test('PDF detalhado '+scope+': parcela mensal, pagamentos e partes reconciliadas',async()=>{
 const doc=await createExpenseStatementPdf(scope,detailedSummary,config,'2029-07',detailed);
 const text=contents(doc);
 assert.ok(text.includes('CompraCompartilhada')); assert.ok(text.includes('07/2029')||text.includes('julho'));
 if(scope==='one'){assert.ok(text.includes('IndividualAllan'));assert.ok(text.includes('Parcela mensal total do casal:'));assert.ok(text.includes('170,01'));assert.ok(text.includes('140,00'));assert.ok(text.includes('20,01'));}
 else {assert.ok(!text.includes('IndividualAllan'));}
 if(scope==='shared'){assert.ok(text.includes('Parte de Allan'));assert.ok(text.includes('Parte de Carol'));assert.ok(text.includes('70,01'));assert.ok(text.includes('30,00'));}
 assert.ok(!text.includes('300,00')); // Future installments are never multiplied into monthly figures.
});
