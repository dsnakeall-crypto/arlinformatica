import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionFetch, prepareSessionRequest } from '../../resources/js/session-security.ts';

const origin = 'https://arl.test';
test('headers objeto, Headers e tuplas preservam CSRF e campos personalizados', () => {
  for (const headers of [{ 'X-Test': 'ok' }, new Headers({ 'X-Test': 'ok' }), [['X-Test', 'ok']]]) {
    const request = prepareSessionRequest('/api/orders', { method: 'POST', headers, body: '{}' }, origin, 'fresh');
    assert.equal(request.headers.get('X-CSRF-TOKEN'), 'fresh');
    assert.equal(request.headers.get('X-Test'), 'ok');
  }
});
test('Request mantém método, headers e corpo sem consumir o upload', () => {
  const input = new Request(`${origin}/api/orders/1/photos`, { method: 'POST', headers: { 'X-Test': 'ok' }, body: 'photo' });
  const init = prepareSessionRequest(input, undefined, origin, 'fresh');
  assert.equal(init.headers.get('X-Test'), 'ok');
  assert.equal(init.headers.get('X-CSRF-TOKEN'), 'fresh');
  assert.equal(input.bodyUsed, false);
});
test('FormData não ganha Content-Type forçado e requisição externa não recebe token', () => {
  const options = { method: 'POST', body: new FormData() };
  assert.equal(prepareSessionRequest('/api/orders/1/photos', options, origin, 'fresh').headers.has('Content-Type'), false);
  assert.equal(prepareSessionRequest('https://outside.test/api/orders', options, origin, 'fresh'), options);
});
test('401/419 preservam Response e não repetem pagamentos após erro', async () => {
  for (const status of [401, 419]) {
    let count = 0;
    let notified = 0;
    const response = new Response('{"message":"expired"}', { status });
    const secureFetch = createSessionFetch(async () => { count++; return response; }, origin, () => 'fresh', value => { notified = value; });
    assert.equal(await secureFetch('/api/orders/1/payment', { method: 'POST', body: '{}' }), response);
    assert.equal(count, 1);
    assert.equal(notified, status);
    assert.equal(response.bodyUsed, false);
  }
});
test('GET e erros de outra origem não disparam a recuperação de sessão', async () => {
  assert.equal(prepareSessionRequest('/api/orders', undefined, origin, 'fresh'), undefined);
  let notifications = 0;
  const secureFetch = createSessionFetch(async () => new Response('', { status: 401 }), origin, () => 'fresh', () => notifications++);
  await secureFetch('https://outside.test/api/orders');
  assert.equal(notifications, 0);
});
