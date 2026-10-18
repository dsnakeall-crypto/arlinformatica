# ARL Informática — Sino de notificações harmonizado no MOBILE — 18/10/2026

## Solicitação
Após aprovar os cinco botões flutuantes do mobile, o proprietário pediu que o sino de notificações, APENAS NO MOBILE, também siga o acabamento dos botões do novo layout. Manter área web inalterada.

## Alterações feitas no código LOCAL
- `resources/js/main.tsx`: adicionado ícone Lucide `Bell` ao lado da WebP oficial no interior do MESMO botão React de notificações. Ambos compartilham o mesmo clique, estado e contador; no desktop o ícone Lucide fica oculto e a WebP oficial continua.
- Importação final de `resources/css/arl-mobile-bell-matching-nav-20261018.css` com regras restritas a `.shell.layout-mobile:not(.arl-expense-workspace)`.
- CSS: botão de toque 44x44px; círculo visual de 38x38px; borda dourada 1px; degradê off-white/champagne, sombra discreta, sino contornado 20px. Contador vermelho de mensagens não lidas preservado, com z-index 2; o popup mantém sua localização e interações.
- **Nenhum componente financeiro, formulário, estado de notificações, permissão, backend, banco real, CSS desktop ou serviço online foi alterado.**

## Verificação REAL, não mock
Executado com os fontes React+Laravel do aplicativo no computador do proprietário; build Vite FINAL temporariamente carregado apenas durante QA em servidor Laravel isolado localhost 8134, banco SQLite FICTÍCIO copiado de outra base isolada, conta E2E Master.
- 390 e 320px: botão 44px, SVG visível 20px, WebP oculta no mobile, círculo pseudo com borda 1px, cinco botões inferiores inalterados, sem overflow horizontal.
- 390px: clique na campainha abriu a lista real de notificações, segundo clique fechou novamente, sem erro.
- A conta de teste tinha 0 notificações não lidas; **não afirmar ter validado alerta vermelho com dados reais**. Seu markup e estilos foram preservados.
- 66 testes unitários PASS, TypeScript PASS, build Vite em pasta isolada PASS.
- Após as capturas, a pasta original `public/build` foi restaurada e o processo de teste encerrado. Nenhuma publicação KingHost.
- Prévia local com três imagens do APP REAL, validada HTTP 200: http://127.0.0.1:8012/arl-publicidade-preview/APROVAR-SINO-MOBILE-NO-APP-REAL-20261018.html
- Imagens e player foram copiados ao diretório **SOMENTE DEMO** `arl-publicidade-preview`; não migrar ao servidor oficial.

## Ponto de restauração
`C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-ANTES-SINO-MOBILE-CIRCULAR-20261018`
- `PONTO-ORIGINAL-ANTES-SINO-MOBILE.zip` backup hashes SHA-256 dos arquivos `main.tsx` e `arl-mobile-floating-bottom-nav-20261018.css`.
- `REVERTER-SOMENTE-SINO-MOBILE.ps1` — com verificação SHA contra edições posteriores, restaura apenas `main.tsx` anterior e arquiva CSS específico do sino. Mantém os cinco botões e correções anteriores.
- `MANIFESTO-ANTES-SINO.json` + `CHECKPOINT-SINO-MOBILE.json`.

## Situação
🟢 Alteração local e testes real/browser concluídos. 🟡 Aprovação visual do proprietário pendente. 🔵 Nada publicado na KingHost ou base oficial; não alterar hospedagem sem autorização.
