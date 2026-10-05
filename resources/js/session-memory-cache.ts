export type CacheParams = Record<string, string | number | boolean | null>;
export type CachePolicy = { ttl: number; retention: number };
export type CacheTicket = { key: string; resource: string; generation: number; version: number; sequence: number };
type Entry = { resource: string; value: unknown; timestamp: number; lastUsed: number; policy: CachePolicy; stale: boolean };
export type CacheEvent = { type: 'session' | 'invalidate' | 'revoke'; resources: string[] };

// Tab-local, bounded storage. No HTTP interception or browser persistence.
export class SessionMemoryCache {
  private entries = new Map<string, Entry>();
  private versions = new Map<string, number>();
  private requests = new Map<string, number>();
  private listeners = new Set<(event: CacheEvent) => void>();
  private sequence = 0;
  private generation = 0;
  private identity: string | null = null;
  private confirmed = false;
  private limit: number;
  private now: () => number;
  constructor(limit = 128, now: () => number = () => Date.now()) { this.limit = limit; this.now = now; }
  get ready() { return this.confirmed && this.identity !== null; }
  get sessionKey() { return `${this.identity ?? 'none'}:${this.generation}`; }
  get snapshot() { return `${this.sessionKey}:${this.ready}`; }
  subscribe = (listener: (event: CacheEvent) => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(event: CacheEvent) { this.listeners.forEach(listener => listener(event)); }
  confirm(userId: number, role: string, nonce: string) {
    const identity = JSON.stringify([userId, role, nonce]);
    if (identity !== this.identity) { this.clear(); this.identity = identity; }
    this.confirmed = true;
    this.emit({ type: 'session', resources: [] });
  }
  pause() { this.confirmed = false; this.emit({ type: 'session', resources: [] }); }
  clear() {
    this.generation++; this.identity = null; this.confirmed = false;
    this.entries.clear(); this.versions.clear(); this.requests.clear();
    this.emit({ type: 'session', resources: [] });
  }
  key(resource: string, params: CacheParams = {}) {
    return JSON.stringify([this.sessionKey, resource, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
  }
  read<T>(resource: string, params: CacheParams = {}): { value: T; fresh: boolean; timestamp: number } | undefined {
    if (!this.ready) return;
    const key = this.key(resource, params), entry = this.entries.get(key);
    if (!entry) return;
    const now = this.now();
    if (now - entry.lastUsed >= entry.policy.retention) { this.entries.delete(key); return; }
    entry.lastUsed = now;
    this.entries.delete(key); this.entries.set(key, entry);
    return { value: entry.value as T, fresh: !entry.stale && now - entry.timestamp < entry.policy.ttl, timestamp: entry.timestamp };
  }
  begin(resource: string, params: CacheParams = {}): CacheTicket {
    const key = this.key(resource, params), sequence = ++this.sequence;
    this.requests.delete(key); this.requests.set(key, sequence);
    while (this.requests.size > this.limit) this.requests.delete(this.requests.keys().next().value!);
    return { key, resource, sequence, generation: this.generation, version: this.versions.get(resource) ?? 0 };
  }
  accepts(ticket: CacheTicket) {
    return this.ready && ticket.generation === this.generation && ticket.version === (this.versions.get(ticket.resource) ?? 0) && this.requests.get(ticket.key) === ticket.sequence;
  }
  write(ticket: CacheTicket, value: unknown, policy: CachePolicy) {
    if (!this.accepts(ticket)) return false;
    const now = this.now();
    this.entries.delete(ticket.key);
    this.entries.set(ticket.key, { resource: ticket.resource, value, policy, timestamp: now, lastUsed: now, stale: false });
    for (const [key, entry] of this.entries) if (now - entry.lastUsed >= entry.policy.retention) this.entries.delete(key);
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
    return true;
  }
  update<T>(resource: string, params: CacheParams, transform: (value: T) => T) {
    if (!this.ready) return;
    const entry = this.entries.get(this.key(resource, params));
    if (entry) { entry.value = transform(entry.value as T); entry.lastUsed = this.now(); }
  }
  touch(resource: string, params: CacheParams = {}) {
    if (!this.ready) return;
    const entry = this.entries.get(this.key(resource, params));
    if (entry) entry.lastUsed = this.now();
  }
  invalidateKey(resource: string, params: CacheParams = {}) {
    const key = this.key(resource, params);
    const entry = this.entries.get(key); if (entry) entry.stale = true;
    this.requests.delete(key);
    this.emit({ type: 'invalidate', resources: [resource] });
  }
  invalidate(resources: string[], revoke = false) {
    for (const resource of resources) {
      this.versions.set(resource, (this.versions.get(resource) ?? 0) + 1);
      for (const [key, entry] of this.entries) if (entry.resource === resource) {
        if (revoke) this.entries.delete(key); else entry.stale = true;
      }
    }
    this.emit({ type: revoke ? 'revoke' : 'invalidate', resources });
  }
}

export const sessionCache = new SessionMemoryCache();
export const CACHE_POLICIES = {
  clients: { ttl: 30_000, retention: 120_000 },
  orders: { ttl: 15_000, retention: 120_000 },
  view: { ttl: Infinity, retention: 120_000 },
  auxiliary: { ttl: 300_000, retention: 600_000 },
};
