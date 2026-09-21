<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>{{ $title }} · ARL Informática</title>
    @php
        $primary = preg_match('/^#[0-9A-Fa-f]{6}$/', (string) ($company['theme_primary'] ?? '')) ? $company['theme_primary'] : '#C9001C';
        $sidebar = preg_match('/^#[0-9A-Fa-f]{6}$/', (string) ($company['theme_sidebar'] ?? '')) ? $company['theme_sidebar'] : '#09080A';
        $privacyUrl = trim((string) ($company['privacy_policy_url'] ?? ''));
    @endphp
    <style>
        :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2026;background:#f5f6f8}
        *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 85% 8%,{{ $primary }}18,transparent 31%),linear-gradient(145deg,#fff 0%,#f6f7f9 58%,#eef0f3 100%)}
        main{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(100%,560px);overflow:hidden;border:1px solid #e4e5e8;border-radius:20px;background:#fff;box-shadow:0 22px 60px rgba(10,12,16,.15)}
        header{padding:26px 30px;background:linear-gradient(145deg,{{ $sidebar }},#17171a);color:#fff}.brand{display:flex;align-items:center;gap:12px}.brand img{width:48px;height:48px;object-fit:contain}.brand strong{font-size:25px;font-style:italic;letter-spacing:-1px}.brand span{display:block;margin-top:2px;font-size:10px;font-weight:800;letter-spacing:3px}
        section{padding:31px 30px 27px}h1{margin:0 0 12px;font-size:25px;line-height:1.2;color:{{ $sidebar }}}p{margin:0;color:#626a76;font-size:15px;line-height:1.55}.contact{margin-top:22px;padding-top:18px;border-top:1px solid #eceef1;color:#3f4650;font-size:14px}.contact a{color:{{ $primary }};font-weight:700;text-decoration:none;overflow-wrap:anywhere}.privacy{margin-top:22px;text-align:center;font-size:12px}.privacy a{color:#69717d;text-decoration:underline}
        @media(max-width:520px){main{padding:14px}.card{border-radius:16px}header{padding:22px}.brand img{width:42px;height:42px}section{padding:26px 22px 23px}h1{font-size:22px}}
    </style>
</head>
<body>
    <main>
        <article class="card" aria-labelledby="share-link-title">
            <header><div class="brand"><img src="{{ asset('arl-assets/arl.svg') }}" alt="ARL Informática"><div><strong>ARL</strong><span>INFORMÁTICA</span></div></div></header>
            <section>
                <h1 id="share-link-title">{{ $title }}</h1>
                <p>Se precisar do documento, entre em contato com a ARL Informática.</p>
                <p class="contact"><a href="tel:{{ preg_replace('/\D/', '', (string) ($company['phone'] ?? '')) }}">{{ $company['phone'] ?? '' }}</a><br><a href="mailto:{{ $company['email'] ?? '' }}">{{ $company['email'] ?? '' }}</a></p>
                @if($privacyUrl)<p class="privacy"><a href="{{ $privacyUrl }}" target="_blank" rel="noopener noreferrer">Como tratamos seus dados</a></p>@endif
            </section>
        </article>
    </main>
</body>
</html>
