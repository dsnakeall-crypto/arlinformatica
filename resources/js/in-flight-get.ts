// Shares only identical default GETs while pending. No completed response is cached.
export function createInFlightGet() {
  const pending = new Map<string, Promise<unknown>>();
  return function get<T>(key: string, options: RequestInit, request: () => Promise<T>): Promise<T> {
    // A caller-owned signal or custom headers must retain its own cancellation/identity.
    if ((options.method || 'GET').toUpperCase() !== 'GET' || options.signal || options.headers || options.body) {
      return request();
    }
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const promise = request().then(
      value => { pending.delete(key); return value; },
      error => { pending.delete(key); throw error; },
    );
    pending.set(key, promise);
    return promise;
  };
}
