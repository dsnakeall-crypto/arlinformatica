import test from 'node:test';
import assert from 'node:assert/strict';
import {projectStatement} from '../../resources/js/expense-statement-data.ts';

const installment = (overrides={}) => ({
 id:1,debt_id:1,institution_id:1,institution_name:'Mercado Pago',type_name:'Cartão de Crédito',
 debt_name:'Compras da casa',number:2,installment_count:5,responsibility:'shared',
 due_on:'2026-10-12',original_cents:40000,credit_cents:5000,remaining_cents:35000,
 share_one_cents:30000,share_two_cents:10000,credit_one_cents:2000,credit_two_cents:3000,
 remaining_one_cents:28000,remaining_two_cents:7000,...overrides,
});
const rows = [
 installment(),
 installment({id:2,debt_id:2,debt_name:'Fatura pessoal Carol',responsibility:'two',
   original_cents:30000,credit_cents:30000,remaining_cents:0,
   share_one_cents:0,share_two_cents:30000,credit_one_cents:0,credit_two_cents:30000,
   remaining_one_cents:0,remaining_two_cents:0}),
 installment({id:3,debt_id:3,institution_id:2,institution_name:'Nubank',type_name:'Empréstimo',
   debt_name:'Empréstimo Carol',number:1,installment_count:3,responsibility:'two',
   original_cents:12501,credit_cents:1,remaining_cents:12500,
   share_one_cents:0,share_two_cents:12501,credit_one_cents:0,credit_two_cents:1,
   remaining_one_cents:0,remaining_two_cents:12500}),
];

test('Carol: inclui sua parte das compras do casal, sua fatura paga e empréstimo de outro banco',()=>{
  const p=projectStatement('two',rows);
  assert.equal(p.institutions.length,2);
  assert.equal(p.original_cents,52501);
  assert.equal(p.credit_cents,33001);
  assert.equal(p.remaining_cents,19500);
  assert.equal(p.institutions[0].invoices[0].rows.length,2);
  const mp=p.institutions.find(b=>b.name==='Mercado Pago');
  assert.equal(mp.original_cents,40000);
  assert.equal(mp.credit_cents,33000);
  assert.equal(mp.remaining_cents,7000);
  assert.deepEqual(mp.invoices[0].rows.map(x=>x.scope_original_cents),[10000,30000]);
  assert.deepEqual(mp.invoices[0].rows.map(x=>x.scope_label),['Casal - minha parte','Pessoal']);
});
test('Allan: não contabiliza despesas próprias da Carol, nem a parcela dela nas compartilhadas',()=>{
  const p=projectStatement('one',rows);
  assert.equal(p.institutions.length,1);
  assert.equal(p.original_cents,30000);
  assert.equal(p.credit_cents,2000);
  assert.equal(p.remaining_cents,28000);
  assert.equal(p.institutions[0].invoices[0].rows.length,1);
});
test('Casal: mostra só dívidas compartilhadas e preserva a divisão entre responsáveis',()=>{
  const p=projectStatement('shared',rows);
  assert.equal(p.institutions.length,1);
  assert.equal(p.original_cents,40000);
  assert.equal(p.credit_cents,5000);
  assert.equal(p.remaining_cents,35000);
  assert.equal(p.institutions[0].invoices[0].rows[0].share_two_cents,10000);
});
test('Global: soma originais e créditos sem somar novamente as cotas do casal',()=>{
  const p=projectStatement('month',rows);
  assert.equal(p.institutions.length,2);
  assert.equal(p.original_cents,82501);
  assert.equal(p.credit_cents,35001);
  assert.equal(p.remaining_cents,47500);
  const mp=p.institutions.find(b=>b.name==='Mercado Pago');
  assert.equal(mp.invoices[0].original_cents,70000);
});
test('Fatura quitada continua detalhada mesmo com saldo restante zero',()=>{
  const carol=projectStatement('two',rows);
  assert.equal(carol.institutions[0].invoices[0].rows.find(i=>i.debt_name==='Fatura pessoal Carol').scope_remaining_cents,0);
});
