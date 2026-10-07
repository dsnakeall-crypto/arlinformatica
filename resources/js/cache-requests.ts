import { CACHE_POLICIES, sessionCache, type CacheParams } from './session-memory-cache';

// Keep only list presentation, never detail/password/payment/balance payloads.
export function orderListPresentation(result: { data: Record<string, unknown>[]; [key: string]: unknown }) {
  const fields = ['id', 'number', 'client', 'status', 'display_status', 'attendance_type', 'reported_problem', 'received_at', 'equipment_type_id', 'equipment_description', 'total_cents', 'completed_at', 'reopened', 'closing_reference_cents', 'closing_marked_at', 'closing_marked_by'];
  return { ...result, data: result.data.map(order => Object.fromEntries(fields.filter(field => field in order).map(field => [field, order[field]]))) };
}

export function auxiliaryResource(path: string) {
  const url = new URL(path, 'https://cache.invalid');
  const resource = ({ '/catalogs/equipment': 'equipment', '/catalogs/manufacturers': 'manufacturers', '/catalogs/checklist': 'checklist', '/operational-settings': 'operational-settings' } as Record<string, string>)[url.pathname];
  return resource ? { resource, params: { query: JSON.stringify([...url.searchParams].sort(([a], [b]) => a.localeCompare(b))) } as CacheParams } : undefined;
}

// Explicit allowlist; all other GETs (including stocks and balances) pass through.
const auxiliaryPending = new Map<string, { ticket: ReturnType<typeof sessionCache.begin>; promise: Promise<unknown> }>();
export async function safeAuxiliary<T>(path: string, options: RequestInit, request: () => Promise<T>): Promise<T> {
  const info = (options.method || 'GET').toUpperCase() === 'GET' && !options.headers && !options.body ? auxiliaryResource(path) : undefined;
  if (!info || !sessionCache.ready) return request();
  const cached = sessionCache.read<T>(info.resource, info.params);
  if (cached?.fresh) return cached.value;
  const key = sessionCache.key(info.resource, info.params);
  const pending = !options.signal && auxiliaryPending.get(key);
  if (pending && sessionCache.accepts(pending.ticket)) {
    return pending.promise as Promise<T>;
  }
  const ticket = sessionCache.begin(info.resource, info.params);
  const refresh = request().then(value => {
    if (!sessionCache.write(ticket, value, CACHE_POLICIES.auxiliary)) throw new DOMException('Consulta obsoleta', 'AbortError');
    return value;
  });
  if (!options.signal) {
    auxiliaryPending.set(key, { ticket, promise: refresh });
    while (auxiliaryPending.size > 128) auxiliaryPending.delete(auxiliaryPending.keys().next().value!);
    void refresh.finally(() => { if (auxiliaryPending.get(key)?.ticket === ticket) auxiliaryPending.delete(key); }).catch(() => undefined);
  }
  return refresh;
}

export function mutationResources(path: string): string[] {
  const pathname = new URL(path, 'https://cache.invalid').pathname;
  if (/^\/clients(?:\/\d+)?$/.test(pathname) || pathname === '/settings/clients/import') return ['clients', 'orders', 'dashboard'];
  if (/^\/orders(?:\/|$)/.test(pathname) || /^\/photos\/\d+$/.test(pathname) || /^\/finance\/transactions\/\d+\/adjust$/.test(pathname)) return ['orders', 'dashboard'];
  const catalog = pathname.match(/^\/catalogs\/(equipment|manufacturers|checklist)(?:\/|$)/)?.[1];
  if (catalog) return [catalog];
  if (pathname === '/settings') return ['operational-settings'];
  return [];
}

let channel: BroadcastChannel | undefined;
export function connectCacheTabs() {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  channel = new BroadcastChannel('arl-memory-cache-lifecycle');
  channel.onmessage = event => {
    if (event.data?.type === 'clear') { sessionCache.clear(); window.dispatchEvent(new Event('arl-cache-verify')); }
    if (event.data?.type === 'invalidate' && Array.isArray(event.data.resources)) {
      const allowed = event.data.resources.filter((r: unknown) => typeof r === 'string' && ['clients', 'orders', 'dashboard', 'equipment', 'manufacturers', 'checklist', 'operational-settings'].includes(r));
      sessionCache.invalidate(allowed);
    }
  };
  return () => { channel?.close(); channel = undefined; };
}
export function clearSessionCache(broadcast = true) {
  const hadIdentity = !sessionCache.sessionKey.startsWith('none:');
  auxiliaryPending.clear();
  sessionCache.clear();
  if (broadcast && hadIdentity) channel?.postMessage({ type: 'clear' });
}
export function completedRequest(path: string, options: RequestInit, status: number) {
  if (status === 401 || status === 419) { clearSessionCache(); return; }
  if (status === 403) {
    const resource = auxiliaryResource(path)?.resource ?? (/^\/clients/.test(path) ? 'clients' : /^\/orders/.test(path) ? 'orders' : undefined);
    if (resource) sessionCache.invalidate(resource === 'orders' ? ['orders', 'dashboard'] : [resource], true);
    return;
  }
  if (status < 200 || status >= 300 || (options.method || 'GET').toUpperCase() === 'GET') return;
  const resources = mutationResources(path);
  if (resources.length) { sessionCache.invalidate(resources); channel?.postMessage({ type: 'invalidate', resources }); }
}
