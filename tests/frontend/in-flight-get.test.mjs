import assert from 'node:assert/strict';
import test from 'node:test';
import { createInFlightGet } from '../../resources/js/in-flight-get.ts';

test('GET simultâneo compartilha a mesma Promise e GET posterior volta ao servidor', async () => {
  const get = createInFlightGet();
  let resolve;
  let calls = 0;
  const request = () => { calls++; return new Promise(r => { resolve = r; }); };
  const first = get('account:catalog', {}, request);
  assert.equal(get('account:catalog', {}, request), first);
  assert.equal(calls, 1);
  resolve([{ id: 1 }]);
  await first;
  const later = get('account:catalog', {}, request);
  assert.notEqual(later, first);
  assert.equal(calls, 2);
  resolve([]);
  await later;
});

test('erro limpa mapa; escopos, URLs e métodos distintos não são compartilhados', async () => {
  const get = createInFlightGet();
  let calls = 0;
  const rejected = () => { calls++; return Promise.reject(new Error('failed')); };
  await assert.rejects(get('a:/catalog', {}, rejected));
  await assert.rejects(get('a:/catalog', {}, rejected));
  assert.equal(calls, 2);
  const request = () => { calls++; return Promise.resolve([]); };
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.notEqual(get('same', { method }, request), get('same', { method }, request));
  }
  assert.notEqual(get('user1:/catalog', {}, request), get('user2:/catalog', {}, request));
  assert.notEqual(get('a:/catalog', {}, request), get('a:/budgets', {}, request));
  await Promise.resolve();
});

test('sinais e headers próprios não compartilham cancelamento ou identidade', async () => {
  const get = createInFlightGet();
  const request = () => Promise.resolve([]);
  for (const options of [{ signal: new AbortController().signal }, { headers: { Authorization: 'test' } }]) {
    assert.notEqual(get('same', options, request), get('same', options, request));
  }
});
