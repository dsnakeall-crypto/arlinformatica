import { useSyncExternalStore, type ReactNode } from 'react';
import { sessionCache } from './session-memory-cache';

// Keep mounted forms during identity verification; hide data until it succeeds.
export default function CacheBoundary({ children }: { children: ReactNode }) {
  useSyncExternalStore(sessionCache.subscribe, () => sessionCache.snapshot);
  return <>{!sessionCache.ready && <p role="status">Verificando sessão…</p>}<div key={sessionCache.sessionKey} style={{ display: sessionCache.ready ? 'contents' : 'none' }}>{children}</div></>;
}
