import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const uri = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const projectionUri = uri(compile('../resources/js/expense-statement-data.ts'));
const source = compile('../resources/js/expense-statement-pdf.ts')
  .replace("'./expense-statement-data'", JSON.stringify(projectionUri))
  .replaceAll("import('jspdf')", 'import(' + JSON.stringify(pathToFileURL(require.resolve('jspdf')).href) + ')');
const { createExpenseStatementPdf } = await import(uri(source));
const { projectStatement } = await import(projectionUri);
const rows = Array.from({ length: 60 }, (_, i) => {
  const responsibility = ['one', 'two', 'shared'][i % 3];
  const original = 10000 + i * 100;
  const one = responsibility === 'two' ? 0 : responsibility === 'shared' ? original * .7 : original;
  const two = original - one;
  const paidOne = one / 2, paidTwo = two / 2;
  return { id: i + 1, debt_id: i + 1, institution_id: i % 2 + 1,
    institution_name: i % 2 ? 'Mercado Pago' : 'Nubank', type_name: i % 4 ? 'Cartão de Crédito' : 'Empréstimo',
    debt_name: 'Compra fictícia ' + (i + 1) + ' — descrição longa para verificar tabelas, acentuação, quebra de linha e paginação sem sobrepor os valores ou cortar o conteúdo financeiro aprovado. '.repeat(2),
    number: 2, installment_count: 5, responsibility, due_on: '2026-10-12',
    original_cents: original, credit_cents: paidOne + paidTwo, remaining_cents: original - paidOne - paidTwo,
    share_one_cents: one, share_two_cents: two, credit_one_cents: paidOne, credit_two_cents: paidTwo,
    remaining_one_cents: one - paidOne, remaining_two_cents: two - paidTwo,
    paid_cents: paidOne + paidTwo, paid_one_cents: paidOne, paid_two_cents: paidTwo };
});
const totals = {};
for (const scope of ['month', 'one', 'two', 'shared']) {
  const result = projectStatement(scope, rows), prefix = scope === 'month' ? '' : scope + '_';
  totals[prefix + 'original_cents'] = result.original_cents;
  totals[prefix + 'remaining_cents'] = result.remaining_cents;
}
const config = { people: [{ id: 1, name: 'Allan' }, { id: 2, name: 'Carol' }] };
mkdirSync('output/final-financeiro-20261013', { recursive: true });
for (const scope of ['one', 'two', 'month', 'shared']) {
  const doc = await createExpenseStatementPdf(scope, { totals }, config, '2026-10', { month: '2026-10', data: rows });
  writeFileSync('output/final-financeiro-20261013/detalhado-longo-' + scope + '.pdf', Buffer.from(doc.output('arraybuffer')));
  console.log('PASS: PDF fictício ' + scope + '; páginas=' + doc.getNumberOfPages() + '; total=' + totals[(scope === 'month' ? '' : scope + '_') + 'original_cents']);
}
