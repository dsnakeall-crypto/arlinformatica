import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { sessionCache } from '../../resources/js/session-memory-cache.ts';

// Node strip-only mode requires explicit TS extensions; production uses Vite resolution.
const moduleUrl = new URL('../../resources/js/cache-requests.ts', import.meta.url);
const source = (await readFile(moduleUrl, 'utf8')).replace("'./session-memory-cache'", JSON.stringify(new URL('../../resources/js/session-memory-cache.ts', import.meta.url).href));
const { auxiliaryResource, completedRequest, mutationResources, safeAuxiliary, clearSessionCache, orderListPresentation, connectCacheTabs } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const confirm = () => sessionCache.confirm(1, 'Master', 'test');

test('cached order presentation excludes balances, payments, passwords and full details', () => {
  assert.deepEqual(orderListPresentation({ data: [{ id: 1, number: '000001', status: 'analysis', total_cents: 100, paid_cents: 50, balance_cents: 50, payments: [1], system_password: 'secret', technical_report: 'private', photos: [1], share_token: 'secret' }], total: 1 }), { data: [{ id: 1, number: '000001', status: 'analysis', total_cents: 100 }], total: 1 });
});

test('only four safe auxiliary endpoints are allowed; complete parameters retained', () => {
  for (const path of ['/catalogs/products', '/catalogs/items', '/finance/overview', '/orders/1/payments', '/post-sales', '/expense-control/summary', '/orders/1/system-password']) assert.equal(auxiliaryResource(path), undefined);
  assert.notDeepEqual(auxiliaryResource('/catalogs/checklist?equipment_type_id=1'), auxiliaryResource('/catalogs/checklist?equipment_type_id=2'));
  assert.notDeepEqual(auxiliaryResource('/catalogs/equipment?q=a&q=b'), auxiliaryResource('/catalogs/equipment?q=b'));
});
test('successful mutations invalidate related resources; failures keep valid data', () => {
  clearSessionCache(false); confirm();
  sessionCache.write(sessionCache.begin('clients', { all: 1 }), { data: ['A'] }, { ttl: 30_000, retention: 120_000 });
  completedRequest('/clients/1', { method: 'PUT' }, 422);
  assert.equal(sessionCache.read('clients', { all: 1 }).fresh, true);
  for (const [path, method, status] of [['/clients', 'POST', 201], ['/clients/1', 'PUT', 200], ['/clients/1', 'DELETE', 204], ['/settings/clients/import', 'POST', 200]]) {
    completedRequest(path, { method }, status);
    assert.equal(sessionCache.read('clients', { all: 1 }).fresh, false);
  }
  for (const path of ['/orders', '/orders/1', '/orders/1/status', '/orders/1/finalize', '/orders/1/reopen', '/orders/1/payment', '/orders/1/refunds', '/finance/transactions/1/adjust']) assert.deepEqual(mutationResources(path), ['orders', 'dashboard']);
  for (const [path, resource] of [['/catalogs/equipment/1', 'equipment'], ['/catalogs/manufacturers', 'manufacturers'], ['/catalogs/checklist/options/1', 'checklist'], ['/settings', 'operational-settings']]) assert.deepEqual(mutationResources(path), [resource]);
});
test('401/419 clear generation, 403 removes appropriate resource, logout rejects old response', () => {
  for (const status of [401, 419]) {
    confirm(); const old = sessionCache.begin('clients');
    completedRequest('/clients?all=1', {}, status);
    confirm(); assert.equal(sessionCache.write(old, ['old'], { ttl: 30, retention: 120 }), false);
  }
  sessionCache.write(sessionCache.begin('clients'), ['A'], { ttl: 30, retention: 120 });
  completedRequest('/clients', {}, 403); assert.equal(sessionCache.read('clients'), undefined);
  const old = sessionCache.begin('orders'); clearSessionCache(false); confirm();
  assert.equal(sessionCache.write(old, ['old'], { ttl: 30, retention: 120 }), false);
});
test('safe auxiliaries share a pending GET, reuse completed data, revalidate after invalidation', async () => {
  clearSessionCache(false); confirm();
  let calls = 0, release;
  const request = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const a = safeAuxiliary('/catalogs/equipment', {}, request);
  const b = safeAuxiliary('/catalogs/equipment', {}, request);
  assert.equal(calls, 1); release(['old']);
  assert.deepEqual(await a, ['old']); assert.deepEqual(await b, ['old']);
  assert.deepEqual(await safeAuxiliary('/catalogs/equipment', {}, request), ['old']); assert.equal(calls, 1);
  completedRequest('/catalogs/equipment/1', { method: 'PATCH' }, 200);
  const refreshed = safeAuxiliary('/catalogs/equipment', {}, request); assert.equal(calls, 2);
  release(['new']); assert.deepEqual(await refreshed, ['new']);
  assert.deepEqual(await safeAuxiliary('/catalogs/equipment', {}, request), ['new']);
});

test('pending auxiliary response cannot return user A data after identity change', async () => {
  clearSessionCache(false); confirm(); let release;
  const pending = safeAuxiliary('/operational-settings', {}, () => new Promise(resolve => { release = resolve; }));
  clearSessionCache(false); sessionCache.confirm(2, 'Master', 'other-session'); release({ company_name: 'A' });
  await assert.rejects(pending, { name: 'AbortError' });
  const info = auxiliaryResource('/operational-settings'); assert.equal(sessionCache.read(info.resource, info.params), undefined);
});

test('tabs exchange topic names/clear only, never cached clients, tokens or personal payloads', () => {
  const previousChannel = globalThis.BroadcastChannel, previousWindow = globalThis.window;
  const messages = [], instances = [];
  globalThis.window = new EventTarget();
  globalThis.BroadcastChannel = class { constructor() { instances.push(this); } postMessage(value) { messages.push(value); } close() {} };
  const disconnect = connectCacheTabs();
  try {
    clearSessionCache(false); confirm();
    sessionCache.write(sessionCache.begin('clients'), ['Personal data never sent'], { ttl: 30, retention: 120 });
    completedRequest('/clients/1', { method: 'PUT' }, 200);
    assert.deepEqual(messages, [{ type: 'invalidate', resources: ['clients', 'orders', 'dashboard'] }]);
    instances[0].onmessage({ data: { type: 'clear' } }); assert.equal(sessionCache.ready, false);
    confirm(); clearSessionCache(); assert.deepEqual(messages.at(-1), { type: 'clear' });
  } finally { disconnect(); globalThis.BroadcastChannel = previousChannel; globalThis.window = previousWindow; clearSessionCache(false); }
});
