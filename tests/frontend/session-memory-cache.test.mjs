import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionMemoryCache } from '../../resources/js/session-memory-cache.ts';

const policy = { ttl: 30, retention: 120 };
function fixture(limit = 128) {
  let time = 0;
  const cache = new SessionMemoryCache(limit, () => time);
  cache.confirm(1, 'Master', 'session-a');
  return { cache, advance: n => { time += n; } };
}
test('identity must be confirmed; session generation prevents old responses and user leaks', () => {
  const cache = new SessionMemoryCache();
  assert.equal(cache.read('clients'), undefined);
  cache.confirm(1, 'Master', 'a');
  const old = cache.begin('clients');
  cache.write(old, ['A'], policy);
  cache.pause(); assert.equal(cache.read('clients'), undefined);
  cache.confirm(1, 'Master', 'a'); assert.deepEqual(cache.read('clients').value, ['A']);
  cache.clear(); cache.confirm(2, 'Administrador', 'b');
  assert.equal(cache.write(old, ['A late'], policy), false);
  assert.equal(cache.read('clients'), undefined);
  cache.confirm(1, 'Master', 'new-login');
  assert.equal(cache.write(old, ['same-user old session'], policy), false);
});
test('TTL, idle retention and bounded LRU are separate', () => {
  const { cache, advance } = fixture(2);
  cache.write(cache.begin('clients'), ['old'], policy);
  advance(30); assert.equal(cache.read('clients').fresh, false);
  advance(100); assert.deepEqual(cache.read('clients').value, ['old']);
  advance(120); assert.equal(cache.read('clients'), undefined);
  for (const page of [1, 2, 3]) cache.write(cache.begin('orders', { page }), page, policy);
  assert.equal(cache.read('orders', { page: 1 }), undefined);
  assert.equal(cache.read('orders', { page: 2 }).value, 2);
});
test('canonical parameters separate pages/search/tabs and completed responses cannot race', () => {
  const { cache } = fixture();
  const a = cache.begin('orders', { tab: 'progress', q: 'dell', page: 2, per_page: 12 });
  const b = cache.begin('orders', { per_page: 12, page: 2, q: 'dell', tab: 'progress' });
  cache.write(b, ['new'], policy);
  assert.equal(cache.write(a, ['old'], policy), false);
  assert.deepEqual(cache.read('orders', { q: 'dell', tab: 'progress', page: 2, per_page: 12 }).value, ['new']);
  for (const params of [{ tab: 'finalized', q: 'dell', page: 2, per_page: 12 }, { tab: 'progress', q: 'hp', page: 2, per_page: 12 }, { tab: 'progress', q: 'dell', page: 1, per_page: 12 }]) assert.equal(cache.read('orders', params), undefined);
});
test('invalidation retains presentation, rejects pending writes; revocation removes content', () => {
  const { cache } = fixture();
  cache.write(cache.begin('clients'), ['valid'], policy);
  const pending = cache.begin('clients');
  cache.invalidate(['clients']);
  assert.equal(cache.read('clients').fresh, false);
  assert.equal(cache.write(pending, ['pre-mutation'], policy), false);
  cache.write(cache.begin('clients'), ['updated'], policy);
  cache.invalidateKey('clients'); assert.equal(cache.read('clients').fresh, false);
  cache.invalidate(['clients'], true); assert.equal(cache.read('clients'), undefined);
});
test('auxiliary TTL is five minutes and invalidation overrides freshness', () => {
  const { cache, advance } = fixture();
  const aux = { ttl: 300_000, retention: 600_000 };
  cache.write(cache.begin('checklist', { equipment_type_id: 1 }), ['options'], aux);
  advance(299_999); assert.equal(cache.read('checklist', { equipment_type_id: 1 }).fresh, true);
  advance(1); assert.equal(cache.read('checklist', { equipment_type_id: 1 }).fresh, false);
  assert.equal(cache.read('checklist', { equipment_type_id: 2 }), undefined);
  cache.invalidate(['checklist']); assert.equal(cache.read('checklist', { equipment_type_id: 1 }).fresh, false);
});
