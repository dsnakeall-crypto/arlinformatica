import { CACHE_POLICIES, sessionCache, type CacheParams } from './session-memory-cache';

export function auxiliaryResource(path: string) {
  const url = new URL(path, 'https://cache.invalid');
  const resource = ({ '/catalogs/equipment': 'equipment', '/catalogs/manufacturers': 'manufacturers', '/catalogs/checklist': 'checklist', '/operational-settings': 'operational-settings' } as Record<string, string>)[url.pathname];
  return resource ? { resource, params: Object.fromEntries(url.searchParams) as CacheParams } : undefined;
}

// Explicit allowlist; all other GETs (including stocks and balances) pass through.
export async function safeAuxiliary<T>(path: string, options: RequestInit, request: () => Promise<T>): Promise<T> {
  const info = (options.method || 'GET').toUpperCase() === 'GET' ? auxiliaryResource(path) : undefined;
  if (!info || !sessionCache.ready) return request();
  const cached = sessionCache.read<T>(info.resource, info.params);
  if (cached?.fresh) return cached.value;
  const ticket = sessionCache.begin(info.resource, info.params);
  const refresh = request().then(value => { sessionCache.write(ticket, value, CACHE_POLICIES.auxiliary); return value; });
  if (cached) { void refresh.catch(() => undefined); return cached.value; }
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
    if (event.data?.type === 'clear') sessionCache.clear();
    if (event.data?.type === 'invalidate' && Array.isArray(event.data.resources)) {
      const allowed = event.data.resources.filter((r: unknown) => typeof r === 'string' && ['clients', 'orders', 'dashboard', 'equipment', 'manufacturers', 'checklist', 'operational-settings'].includes(r));
      sessionCache.invalidate(allowed);
    }
  };
  return () => { channel?.close(); channel = undefined; };
}
export function clearSessionCache(broadcast = true) {
  sessionCache.clear();
  if (broadcast) channel?.postMessage({ type: 'clear' });
}
export function completedRequest(path: string, options: RequestInit, status: number) {
  if (status === 401 || status === 419) { clearSessionCache(); return; }
  if (status === 403) {
    const resource = auxiliaryResource(path)?.resource ?? (/^\/clients/.test(path) ? 'clients' : /^\/orders/.test(path) ? 'orders' : undefined);
    if (resource) sessionCache.invalidate([resource], true);
    return;
  }
  if (status < 200 || status >= 300 || (options.method || 'GET').toUpperCase() === 'GET') return;
  const resources = mutationResources(path);
  if (resources.length) { sessionCache.invalidate(resources); channel?.postMessage({ type: 'invalidate', resources }); }
}
