import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';

// Real HTTP and real Service Worker: route interception would bypass this contract.
type Reply = { status: number; body: string; headers?: Record<string, string> };
let server: Server;
let origin: string;
let workerSource: string;
let networkUnavailable = false;
const replies = new Map<string, Reply>();
const requests = new Map<string, number>();
const currentCache = 'arl-static-v5';

test.use({ serviceWorkers: 'allow' });
test.beforeAll(async () => {
  workerSource = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
  server = createServer((request, response) => {
    const path = new URL(request.url || '/', 'http://localhost').pathname;
    requests.set(path, (requests.get(path) || 0) + 1);
    if (path === '/sw.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      response.end(workerSource);
      return;
    }
    if (path === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      response.end('<!doctype html><title>ARL Service Worker isolated verification</title>');
      return;
    }
    // BrowserContext offline mode does not reliably stop the worker's own network.
    // Close the real connection so the Service Worker receives a network rejection.
    if (networkUnavailable) {
      request.socket.destroy();
      return;
    }
    const reply = replies.get(path) || { status: 200, body: 'static-valid' };
    response.writeHead(reply.status, { 'Content-Type': path.endsWith('.js') ? 'application/javascript' : 'text/plain', 'Cache-Control': 'no-store', ...reply.headers });
    response.end(reply.body);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not bind a TCP port');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
test.beforeEach(() => {
  replies.clear();
  requests.clear();
  networkUnavailable = false;
  // Public production static resources intentionally do not carry private/no-store.
  for (const path of ['/manifest.webmanifest', '/arl-assets/icons/icon-192.png', '/arl-assets/icons/icon-512.png', '/arl-assets/icons/icon-maskable-512.png']) {
    replies.set(path, { status: 200, body: 'precache-valid', headers: { 'Cache-Control': 'public, max-age=0' } });
  }
});

async function controlledPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(origin);
  return { context, page };
}
async function register(page: Page) {
  await page.evaluate(async () => {
    const controlled = new Promise<void>(resolve => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    await controlled;
    const active = registration.active;
    if (!active) throw new Error('Missing active worker');
    if (active.state !== 'activated') await new Promise<void>(resolve => active.addEventListener('statechange', () => {
      if (active.state === 'activated') resolve();
    }));
  });
}
async function fetchResource(page: Page, path: string, method = 'GET') {
  return page.evaluate(async ({ path, method }) => {
    try {
      const response = await fetch(path, { cache: 'no-store', method });
      return { status: response.status, body: await response.text(), failed: false };
    } catch {
      return { status: 0, body: '', failed: true };
    }
  }, { path, method });
}
async function cached(page: Page, path: string) {
  return page.evaluate(async ({ path, name }) => {
    const response = await (await caches.open(name)).match(path);
    return response ? { status: response.status, body: await response.text() } : null;
  }, { path, name: currentCache });
}

test('HTTP 404/500 never become permanent cached errors; recovered static remains available offline', async ({ browser }) => {
  const { context, page } = await controlledPage(browser);
  try {
    await register(page);
    const path = '/build/recovery.js';
    for (const status of [404, 500]) {
      replies.set(path, { status, body: `error-${status}` });
      expect((await fetchResource(page, path)).status).toBe(status);
      expect(await cached(page, path)).toBeNull();
    }
    expect(requests.get(path)).toBe(2);
    replies.set(path, { status: 200, body: 'recovered-module', headers: { 'Cache-Control': 'public, max-age=0' } });
    expect((await fetchResource(page, path)).body).toBe('recovered-module');
    await expect.poll(() => cached(page, path)).toEqual({ status: 200, body: 'recovered-module' });
    networkUnavailable = true;
    await context.setOffline(true);
    expect((await fetchResource(page, path)).body).toBe('recovered-module');
    expect((await fetchResource(page, '/build/never-loaded.js')).failed).toBe(true);
    networkUnavailable = false;
    await context.setOffline(false);
    replies.set('/build/never-loaded.js', { status: 200, body: 'network-restored', headers: { 'Cache-Control': 'public' } });
    expect((await fetchResource(page, '/build/never-loaded.js')).body).toBe('network-restored');
  } finally { await context.close(); }
});

test('icons and manifest refresh online, expose HTTP errors, and recover valid offline content', async ({ browser }) => {
  const { context, page } = await controlledPage(browser);
  try {
    await register(page);
    for (const path of ['/arl-assets/icons/icon-192.png', '/manifest.webmanifest']) {
      replies.set(path, { status: 200, body: 'updated-static', headers: { 'Cache-Control': 'public' } });
      expect((await fetchResource(page, path)).body).toBe('updated-static');
      await expect.poll(() => cached(page, path)).toEqual({ status: 200, body: 'updated-static' });
      replies.set(path, { status: 500, body: 'visible-server-error' });
      expect((await fetchResource(page, path)).status).toBe(500);
      expect(await cached(page, path)).toEqual({ status: 200, body: 'updated-static' });
      networkUnavailable = true;
      await context.setOffline(true);
      expect((await fetchResource(page, path)).body).toBe('updated-static');
      networkUnavailable = false;
      await context.setOffline(false);
    }
  } finally { await context.close(); }
});

test('private financial APIs, documents, POST and build metadata are never stored', async ({ browser }) => {
  const { context, page } = await controlledPage(browser);
  try {
    await register(page);
    for (const path of ['/api/expense-control/summary', '/api/me', '/documents/private.pdf', '/build/manifest.json', '/build/.htaccess', '/build/manifest.json?version=2']) {
      replies.set(new URL(path, origin).pathname, { status: 200, body: 'must-not-cache', headers: { 'Cache-Control': 'public' } });
      expect((await fetchResource(page, path)).status).toBe(200);
      expect(await cached(page, path)).toBeNull();
    }
    replies.set('/build/post.js', { status: 200, body: 'must-not-cache', headers: { 'Cache-Control': 'public' } });
    expect((await fetchResource(page, '/build/post.js', 'POST')).status).toBe(200);
    expect(await cached(page, '/build/post.js')).toBeNull();
    await context.setOffline(true);
    expect((await fetchResource(page, '/api/expense-control/summary')).failed).toBe(true);
  } finally { await context.close(); }
});

test('invalid responses already in the current cache are discarded and recovered from the network', async ({ browser }) => {
  const { context, page } = await controlledPage(browser);
  try {
    await register(page);
    const path = '/build/contaminated.js';
    await page.evaluate(async ({ path, name }) => {
      await (await caches.open(name)).put(path, new Response('old-error', { status: 500 }));
    }, { path, name: currentCache });
    replies.set(path, { status: 200, body: 'valid-again', headers: { 'Cache-Control': 'public' } });
    expect((await fetchResource(page, path)).body).toBe('valid-again');
    await expect.poll(() => cached(page, path)).toEqual({ status: 200, body: 'valid-again' });
    expect(requests.get(path)).toBe(1);
  } finally { await context.close(); }
});

test('static paths do not cache private, no-store, partial, or redirected responses', async ({ browser }) => {
  const { context, page } = await controlledPage(browser);
  try {
    await register(page);
    const conditions: Reply[] = [
      { status: 200, body: 'private', headers: { 'Cache-Control': 'private, max-age=60' } },
      { status: 200, body: 'no-store', headers: { 'Cache-Control': 'no-store' } },
      { status: 206, body: 'partial', headers: { 'Cache-Control': 'public' } },
      { status: 302, body: '', headers: { Location: '/login' } },
      { status: 200, body: '<html>private fallback</html>', headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public' } },
    ];
    for (const [index, reply] of conditions.entries()) {
      const path = `/build/ineligible-${index}.js`;
      replies.set(path, reply);
      await fetchResource(page, path);
      expect(await cached(page, path)).toBeNull();
    }
    const rangePath = '/build/range.js';
    replies.set(rangePath, { status: 200, body: 'range-response', headers: { 'Cache-Control': 'public' } });
    await page.evaluate(path => fetch(path, { cache: 'no-store', headers: { Range: 'bytes=0-5' } }).then(response => response.text()), rangePath);
    expect(await cached(page, rangePath)).toBeNull();
    const authorizedPath = '/build/authorized.js';
    replies.set(authorizedPath, { status: 200, body: 'must-not-cache', headers: { 'Cache-Control': 'public' } });
    await page.evaluate(path => fetch(path, { cache: 'no-store', headers: { Authorization: 'Bearer test-only' } }).then(response => response.text()), authorizedPath);
    expect(await cached(page, authorizedPath)).toBeNull();
  } finally { await context.close(); }
});

test('failed precache preserves the active version until a successful update', async ({ browser }) => {
  const currentWorker = workerSource;
  const { context, page } = await controlledPage(browser);
  try {
    workerSource = "self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
    await register(page);
    await page.evaluate(async () => {
      await (await caches.open('arl-static-v4')).put('/sentinel', new Response('valid-old-static'));
    });
    for (const status of [404, 500]) {
      replies.set('/arl-assets/icons/icon-192.png', { status, body: 'failed-precache' });
      workerSource = `${currentWorker}\n// failed-update-${status}`;
      const result = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) throw new Error('Missing registered worker');
        const controller = navigator.serviceWorker.controller;
        const failed = new Promise<void>(resolve => registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) throw new Error('Missing installing worker');
          installing.addEventListener('statechange', () => {
            if (installing.state === 'redundant') resolve();
          });
        }, { once: true }));
        await registration.update();
        await failed;
        return {
          sameController: navigator.serviceWorker.controller === controller,
          names: await caches.keys(),
          oldStatic: await (await (await caches.open('arl-static-v4')).match('/sentinel'))?.text(),
        };
      });
      expect(result.sameController).toBe(true);
      expect(result.names).not.toContain(currentCache);
      expect(result.oldStatic).toBe('valid-old-static');
    }
    replies.set('/arl-assets/icons/icon-192.png', { status: 200, body: 'precache-valid', headers: { 'Cache-Control': 'public' } });
    workerSource = `${currentWorker}\n// recovered-update`;
    await page.evaluate(async () => {
      const changed = new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Missing registered worker');
      await registration.update();
      await changed;
      const active = registration.active;
      if (!active) throw new Error('Missing active worker');
      if (active.state !== 'activated') await new Promise<void>(resolve => active.addEventListener('statechange', () => {
        if (active.state === 'activated') resolve();
      }));
    });
    const names = await page.evaluate(() => caches.keys());
    expect(names).toContain(currentCache);
    expect(names).not.toContain('arl-static-v4');
  } finally {
    workerSource = currentWorker;
    await context.close();
  }
});

test('upgrade v4 to v5 removes old ARL errors while preserving other application caches', async ({ browser }) => {
  const currentWorker = workerSource;
  const { context, page } = await controlledPage(browser);
  try {
    workerSource = "self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
    await register(page);
    await page.evaluate(async () => {
      await (await caches.open('arl-static-v4')).put('/build/upgrade.js', new Response('legacy-error', { status: 500 }));
      await (await caches.open('other-application')).put('/sentinel', new Response('preserve'));
    });
    workerSource = currentWorker;
    await page.evaluate(async () => {
      const changed = new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Missing registered worker');
      await registration.update();
      await changed;
      const active = registration.active;
      if (!active) throw new Error('Missing active worker');
      if (active.state !== 'activated') await new Promise<void>(resolve => active.addEventListener('statechange', () => {
        if (active.state === 'activated') resolve();
      }));
    });
    const names = await page.evaluate(() => caches.keys());
    expect(names).not.toContain('arl-static-v4');
    expect(names).toContain(currentCache);
    expect(names).toContain('other-application');
    replies.set('/build/upgrade.js', { status: 200, body: 'new-version', headers: { 'Cache-Control': 'public' } });
    expect((await fetchResource(page, '/build/upgrade.js')).body).toBe('new-version');
    expect(requests.get('/build/upgrade.js')).toBe(1);
    expect(await page.evaluate(async () => (await (await caches.open('other-application')).match('/sentinel'))?.text())).toBe('preserve');
  } finally {
    workerSource = currentWorker;
    await context.close();
  }
});
