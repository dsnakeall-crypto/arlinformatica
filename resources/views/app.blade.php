<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#09080A">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="manifest" href="/manifest.webmanifest">
    <title>ARL Informática</title>
    @auth
        @vite(['resources/js/brand2026.ts','resources/js/brand2026-access.ts','resources/js/client-search.ts','resources/js/main.tsx','resources/css/brand2026.css'])
        <style>
            .post-sale .post-action:not([href]){pointer-events:none;cursor:not-allowed;background:#e3e6e4;color:#66716b;opacity:.72}
            .post-sale article:has(.post-action:not([href]))>div::after{content:'Disponível após 24 horas';display:block;margin-top:4px;color:#8a6426;font-size:12px;font-weight:700}
        </style>
    @else
        <style>
            :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15151a;background:#f7f7f8}
            *{box-sizing:border-box}
            body{margin:0;min-height:100vh;background:radial-gradient(circle at 82% 10%,rgba(201,0,28,.07),transparent 28%),linear-gradient(145deg,#fff 0%,#f8f8f9 55%,#f2f2f4 100%)}
            .login-shell{min-height:100vh;display:grid;place-items:center;padding:24px}
            .login-card{width:min(100%,420px);background:#fff;border:1px solid #eadfe2;border-radius:20px;box-shadow:0 22px 60px rgba(35,0,7,.15);overflow:hidden}
            .login-brand{background:radial-gradient(circle at 110% 50%,rgba(210,0,34,.45),transparent 36%),linear-gradient(150deg,#050506,#1b080d 58%,#09080a);color:#fff;padding:28px 32px 24px}
            .login-brand strong{display:block;font-size:34px;font-style:italic;letter-spacing:-2px}
            .login-brand span{display:block;margin-top:3px;font-size:11px;font-weight:700;letter-spacing:5px}
            .login-body{padding:30px 32px 32px}
            .login-body h1{margin:0 0 6px;font-size:24px}
            .login-body p{margin:0 0 24px;color:#747987;font-size:14px}
            .login-field{display:grid;gap:7px;margin-bottom:16px;font-size:13px;font-weight:700}
            .login-field input{width:100%;height:46px;border:1px solid #dedde1;border-radius:10px;padding:0 13px;font:inherit;font-weight:500;outline:none;background:#fff}
            .login-field input:focus{border-color:#c9001c;box-shadow:0 0 0 3px rgba(201,0,28,.10)}
            .login-remember{display:flex;align-items:center;gap:9px;margin:2px 0 20px;color:#555b67;font-size:13px}
            .login-button{width:100%;height:47px;border:0;border-radius:10px;background:linear-gradient(180deg,#e40b2e,#980018);color:#fff;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 10px 21px rgba(196,0,27,.22)}
            .login-button:disabled{opacity:.65;cursor:wait}
            .login-error{display:none;margin:0 0 16px;padding:11px 13px;border-radius:9px;background:#fff0f3;color:#a7001b;font-size:13px}
            .login-error.visible{display:block}
            .login-note{margin-top:18px;text-align:center;color:#8a8e99;font-size:12px}
            @media(max-width:520px){.login-shell{padding:14px}.login-card{border-radius:16px}.login-brand,.login-body{padding-left:22px;padding-right:22px}}
        </style>
    @endauth
</head>
<body>
@auth
    <div id="root"></div>
@else
    <main class="login-shell">
        <section class="login-card" aria-labelledby="login-title">
            <div class="login-brand"><strong>ARL</strong><span>INFORMÁTICA</span></div>
            <form class="login-body" id="login-form">
                <h1 id="login-title">Acesso restrito</h1>
                <p>Entre com seu usuário autorizado para acessar o sistema.</p>
                <div class="login-error" id="login-error" role="alert"></div>
                <label class="login-field">Login
                    <input id="login" name="login" autocomplete="username" required autofocus>
                </label>
                <label class="login-field">Senha
                    <input id="password" name="password" type="password" autocomplete="current-password" required>
                </label>
                <label class="login-remember"><input id="remember" type="checkbox"> Permanecer conectado</label>
                <button class="login-button" id="login-button" type="submit">Entrar</button>
                <div class="login-note">ARL Informática · acesso administrativo</div>
            </form>
        </section>
    </main>
    <script>
        (() => {
            const form = document.getElementById('login-form');
            const button = document.getElementById('login-button');
            const errorBox = document.getElementById('login-error');
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                button.disabled = true;
                button.textContent = 'Entrando…';
                errorBox.classList.remove('visible');
                errorBox.textContent = '';

                try {
                    const response = await fetch('/login', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrf,
                        },
                        body: JSON.stringify({
                            login: document.getElementById('login').value,
                            password: document.getElementById('password').value,
                            remember: document.getElementById('remember').checked,
                        }),
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        throw new Error(payload?.errors?.login?.[0] || payload?.message || 'Não foi possível entrar.');
                    }
                    window.location.reload();
                } catch (error) {
                    errorBox.textContent = error instanceof Error ? error.message : 'Não foi possível entrar.';
                    errorBox.classList.add('visible');
                    button.disabled = false;
                    button.textContent = 'Entrar';
                }
            });
        })();
    </script>
@endauth
</body>
</html>
