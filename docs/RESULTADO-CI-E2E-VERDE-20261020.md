# Resultado — CI E2E verde — 20/10/2026 (noite)

## Estado confirmado

- Branch: `release/integracao-completa-20261018`.
- Commit validado: `750c9b67639cf58dd8def63bf4cefd7cabfd8f1d`.
- GitHub Actions run `39518902945`: **backend, backend-mysql, frontend e e2e — todos SUCCESS no mesmo commit**.
  - O passo iPhone/WebKit (`playwright.ios-nav.config.ts`, 2 testes) e a suíte completa (`npm run test:e2e`, 302 testes em 118 arquivos, `retries: 0`, `forbidOnly`) passaram.
  - Duração do job e2e: ~24 min (antes: ~53 min com 65 falhas e timeouts).
- Execução anterior de referência: run `39425236328` (`8280da1`) com 65 falhas E2E.
- Nada foi publicado na KingHost; banco oficial e dados reais não foram acessados.

## Como o checkpoint do PC chegou ao GitHub

1. Conferido no PC: HEAD `eae9f32`, quatro commits adiante de `origin` (`8280da1`) e 42 arquivos modificados sem commit.
2. Gerados `git format-patch 8280da1..HEAD` e `git diff --binary`, aplicados num clone limpo de `8280da1` na nuvem.
3. Árvore do HEAD conferida: `8f756f2928345417d2b314edb1fdf59c3799b262` **idêntica** à do PC.
4. Os quatro commits ganharam SHAs novos (mesma autoria, mensagem e conteúdo): `aeabf02` (=7ce1e56), `373f91c` (=2f732ae), `0a9dfed` (=d3ec46e), `73b5ba8` (=eae9f32). O trabalho sem commit virou `a2a9807`.
5. Arquivos não rastreados do PC (diagnósticos, `.agents/`, docs antigas, 10 specs `performance-*` diagnósticas) **não** foram enviados, exceto as quatro matrizes/prompts citados no Projeto Mestre.

## Execução integral na nuvem (ambiente compatível com a CI)

Ubuntu 22.04, PHP 8.3 sem OPcache (a CI usa 8.2), Node 22, Playwright 1.55.1 Chromium, SQLite isolado recriado por `scripts/e2e-server.mjs`. WebKit não pôde ser baixado nesse ambiente (rede restrita); foi validado pela CI.

Rodada 1 sobre o checkpoint do PC: **302 testes — 292 aprovados, 6 reprovados, 4 não executados** (os 4 são os passos seguintes da série `operation.spec.ts`, interrompida pela falha 3).

## Matriz das 6 falhas restantes — causa individual

| Nº | Teste | Categoria | Causa comprovada | Correção |
|---:|---|---|---|---|
| 1 | `expense-monthly-final.spec.ts` (desktop) | Contrato de teste incorreto | A edição local sem commit passou a exigir cifrão preto também no desktop. A regra CSS aprovada (`arl-correcao-global-popups-settings-20261015.css`, item 4) pinta o cifrão **dourado somente no Controle de Gasto Web com aparência Original**; Mobile/Clean continuam pretos. | O fluxo compartilhado calcula a cor esperada pela aparência e pelo layout reais. |
| 2 | `mobile-operacao-clean-20261009.spec.ts:5` | Contrato visual legado | Teste exigia `drop-shadow` e 20px no ícone ativo do dock Premium. Medido na aplicação: `border 0`, `box-shadow none`, `filter none`, `width 21px` (regras de maior especificidade em `arl-mobile-premium-20261019.css` / `arl-premium-internal-pages-20261019.css`). | Asserções atualizadas para os valores renderizados; mantidos "sem aro/sem sombra", Clean obrigatório, sem Web/PC e sem Pós-Venda. CSS não alterado. |
| 3 | `operation.spec.ts:177` (fechamento da OS) | Dependência externa / ambiente | O app abre `https://wa.me/...`; o teste esperava o redirecionamento real do WhatsApp para `api.whatsapp.com`. Sem internet o popup vira `chrome-error://`. Passava no GitHub só porque o runner tem internet. | `wa.me`/`api.whatsapp.com` respondidos localmente pelo Playwright; continuam verificados destino, link `/share/final/<hash>` e texto da mensagem. |
| 4 | `quantity-finalization-diagnostic.spec.ts:52` | Dependência externa / ambiente | Mesma causa do item 3. | Mesma correção; valor, link e ausência de caracteres inválidos continuam verificados. |
| 5 | `zz-visual-homologation.spec.ts:46` | Contrato visual legado (em cadeia) | Na CI antiga falhava antes, no ícone "Ver OS". Corrigido esse ponto, apareceram: lista de clientes mostra `#id` (o texto "Cliente Nº" existe só no histórico do cliente); ícone Visualizar agora é a imagem oficial `icon-web-eye-compact-2x.png`; região mobile Premium chama-se "Painel mobile ARL Informática". | Seletores atualizados com escopo na linha do cliente; endereço, ícones oficiais, PDF e capturas preservados. |
| 6 | `visual-fiel-imagens.mobile.spec.ts:6` | Instabilidade por lentidão do ambiente | Estourou 30s no 5º screenshot de página inteira numa máquina de 2 vCPU. Isolado: 15,9s. Passou na CI. | Nenhuma (timeouts não foram aumentados). Monitorar. |

Nenhuma das 6 falhas era defeito do aplicativo. Os demais itens da matriz de 65 da CI e da matriz local de 41 já estavam resolvidos pelas edições locais do checkpoint (navegação Premium, gaveta, Projeção na gaveta, confirmação React no lugar do diálogo nativo etc.).

## Validações adicionais

- `npm run lint`, `npm run typecheck`, `npm run test:unit` (61 testes rastreados), `npm run build`, `vendor/bin/pint --test`, `git diff --check`: aprovados.
- `php artisan test` (SQLite): **412 testes / 7.549 assertions** aprovados.
- Arquivos E2E que o Windows tinha convertido para CRLF voltaram para LF (diff real mínimo).

## Diferenças entre o PC (Windows/Laragon) e o GitHub Actions — evidências

1. **Conjunto de testes diferente:** o PC tem 10 specs `performance-*` e outros arquivos não rastreados que entram no `npm run test:e2e` local, mas não existem no GitHub (312 local × 302 CI).
2. **Edições locais não validadas:** algumas expectativas foram ajustadas no PC sem rodar no ambiente Linux (ex.: cor do cifrão no desktop), invertendo testes que antes passavam.
3. **Rede externa:** testes que abriam o WhatsApp dependiam da internet do executor.
4. **Desempenho do executor:** testes longos com várias capturas de página inteira ficam perto de 30s em máquinas lentas.
5. **Caminhos absolutos do Windows:** alguns specs gravam evidências em `C:/Users/Allan/...`; no Linux isso cria uma pasta `C:` dentro do projeto (sem efeito no resultado; está fora do Git).
6. **GitHub Actions não executa nada na KingHost.** Um erro na CI não prova falha no servidor de produção, e um problema relatado no ambiente remoto (KingHost) **não foi reproduzido aqui** porque produção não foi acessada (fora do escopo autorizado). Se o problema remoto persistir, é preciso investigá-lo à parte, com autorização, logs do servidor e backup validado.

## Pendências

- Apagar no GitHub a branch `work`, criada por engano (cópia idêntica de `750c9b6`). O proxy desta sessão não permite apagar branches.
- `claude/checkpoint-ci-e2e-20261020` é a cópia de segurança; pode ser apagada depois que o PC estiver alinhado.
- Alinhar o PC com o GitHub (os SHAs mudaram, o conteúdo é o mesmo) sem perder os arquivos não rastreados.
- Publicação na KingHost continua **não autorizada** nesta etapa.
