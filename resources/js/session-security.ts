const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isApplicationRequest(input: RequestInfo | URL, origin: string): boolean {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, origin);
  return url.origin === origin && (
    url.pathname.startsWith('/api/') || url.pathname === '/login' || url.pathname === '/logout'
  );
}

export function prepareSessionRequest(
  input: RequestInfo | URL,
  options: RequestInit | undefined,
  origin: string,
  token: string,
): RequestInit | undefined {
  const request = input instanceof Request ? input : undefined;
  const method = (options?.method || request?.method || 'GET').toUpperCase();
  if (!isApplicationRequest(input, origin) || !UNSAFE_METHODS.has(method) || !token) return options;

  const headers = new Headers(request?.headers);
  new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
  headers.set('X-CSRF-TOKEN', token);
  return { ...options, headers };
}

export function createSessionFetch(
  nativeFetch: typeof fetch,
  origin: string,
  token: () => string,
  onExpired: (status: number) => void,
): typeof fetch {
  return async (input, options) => {
    const response = await nativeFetch(input, prepareSessionRequest(input, options, origin, token()));
    if (isApplicationRequest(input, origin) && (response.status === 401 || response.status === 419)) {
      onExpired(response.status);
    }
    // A failed mutation is never replayed, including after reconnection.
    return response;
  };
}

export function installSessionSecurity(): void {
  if (document.getElementById('arl-session-security-installed')) return;
  const marker = document.createElement('meta');
  marker.id = 'arl-session-security-installed';
  document.head.append(marker);

  const nativeFetch = window.fetch.bind(window);
  const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');

  const notify = (status: number) => {
    window.dispatchEvent(new Event('arl-cache-session-expired'));
    if (document.getElementById('arl-session-notice')) return;
    const notice = document.createElement('section');
    notice.id = 'arl-session-notice';
    notice.className = 'arl-session-notice';
    notice.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = status === 419 ? 'Sessão expirada' : 'Acesso encerrado';
    const message = document.createElement('p');
    message.textContent = 'Seu formulário continua nesta aba. Verifique a sessão; se necessário, entre novamente em outra aba. A operação não foi repetida.';
    const actions = document.createElement('div');
    const login = document.createElement('a');
    login.href = '/login';
    login.target = '_blank';
    login.rel = 'noopener noreferrer';
    login.textContent = 'Entrar em outra aba';
    const verify = document.createElement('button');
    verify.type = 'button';
    verify.textContent = 'Verificar sessão';
    verify.addEventListener('click', async () => {
      verify.disabled = true;
      try {
        const response = await nativeFetch('/session/csrf-token', {
          credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
        });
        const body = await response.json();
        if (!response.ok || !body.authenticated) {
          message.textContent = body.code === 'ACCOUNT_INACTIVE'
            ? body.message
            : 'Entre em outra aba e depois verifique a sessão aqui. Seus dados continuam nesta aba.';
          return;
        }
        if (typeof body.csrf_token !== 'string' || !body.csrf_token || !csrf()) throw new Error('Token inválido');
        csrf()!.content = body.csrf_token;
        window.dispatchEvent(new Event('arl-cache-verify'));
        title.textContent = 'Sessão verificada';
        message.textContent = 'Revise os dados e tente salvar novamente. Nenhuma operação foi repetida.';
        actions.replaceChildren();
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Fechar aviso';
        close.addEventListener('click', () => notice.remove());
        actions.append(close);
      } catch {
        message.textContent = 'Não foi possível verificar a sessão. Tente novamente; seus dados continuam nesta aba.';
      } finally {
        verify.disabled = false;
      }
    });
    actions.append(login, verify);
    notice.append(title, message, actions);
    document.body.append(notice);
  };

  window.fetch = createSessionFetch(nativeFetch, window.location.origin, () => csrf()?.content || '', notify);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') installSessionSecurity();
