# Continuidade do projeto ARL Informática no ChatGPT


## CHECKPOINT OPERACIONAL 18/10/2026 - CI DE INTEGRACAO

ATENCAO: ESTADO ATUAL NA CONTINUIDADE MAIS RECENTE: docs/CONTINUIDADE-ARL-20261018-PRONTO-PARA-NOVO-CHAT.md
PROMPT DE RETOMADA: docs/PROMPT-NOVO-CHAT-ARL-INFORMATICA-CI-20261018.txt
DIAGNOSTICO: docs/CHECKPOINT-CI-GITHUB-ARL-20261018-EM-CORRECAO.md

- Branch release/integracao-completa-20261018, HEAD 8903365. GitHub Actions #1321: backend/backend-mysql/frontend VERDES, E2E VERMELHO (254 PASS, 23 FAIL, 8 nao executados).
- Correcoes E2E ainda locais e em progresso; nao declarar CI totalmente verde.
- Git status tinha 377 entradas; NAO usar git add ponto, git clean, reset hard, force push ou apagar logs/backups.
- Objetivo imediato: corrigir E2E e testar integralmente; push seletivo; confirmar os quatro jobs verdes no HEAD novo; so entao preparar KingHost preservando todo banco/dados reais.
- A PR #11/CI #356 mencionada adiante e HISTORICA, nao representa o estado atual.

---


Este arquivo é o ponto de retomada do projeto em um novo chat. O GitHub é a fonte oficial; não reconstruir requisitos apenas por memória de conversa.

## Fonte oficial e estado atual

- Repositório privado: `dsnakeall-crypto/arlinformatica`.
- Branch principal: `main`.
- Base atual da PR #11 na `main`: `4c4e753c004c6f834a989f13d6ab1e66ba2612e9`.
- Etapa atual: **PR #11**, branch `codex/implementar-etapa-10-do-projeto`.
- Último head **técnico** validado antes do fechamento documental: `cdffc543df5c147b64b9c87f14a20831145d962a`.
- CI #356 desse head: **backend SQLite OK, backend MySQL 8 OK, frontend OK e Playwright E2E normal OK**. O E2E executou 26 testes, 26 aprovados, com `retries: 0`, Zend OPcache ausente no runtime do servidor embutido e sem SIGSEGV/`ERR_CONNECTION_REFUSED` observado no log.
- Depois do fechamento documental, a CI do novo head final deve ficar verde novamente antes de qualquer liberação de merge.
- Não há autorização de merge enquanto existirem gates externos pendentes ou checks do head final não verificados.

## Arquivos obrigatórios para um novo chat

Leia, nesta ordem:

1. `AGENTS.md`
2. `docs/PROJETO_MESTRE.md`
3. `docs/REFERENCIAS_VISUAIS.md`
4. `CHECKLIST_FINAL.md`
5. `docs/ARQUITETURA.md`
6. `docs/KINGHOST_DEPLOY.md`
7. `docs/CONTINUIDADE_CHATGPT.md`

`docs/PROJETO_MESTRE.md` é a especificação funcional oficial. `CHECKLIST_FINAL.md` contém o estado verificável.

## Referências visuais oficiais recebidas

Em 04/09/2026 o proprietário reenviou e confirmou as oito referências oficiais:

- `01 - tela inicial e menu.jpg`
- `02 - Cadastro clientes.png`
- `03 - Nova OS.jpeg`
- `04 - Opcao de Alteracoes dos chamados abertos na lista.jpg`
- `05 - Impressao A4 Fechamento do Chamado.jpg`
- `06 - Menu Pos Venda.jpg`
- `LOGO.png`
- `TIMBRADO.png`

Os SHA-256 estão registrados em `docs/REFERENCIAS_VISUAIS.md`. Se esses anexos não estiverem montados em um chat futuro, **pesquisar a ChatGPT Library pelos nomes exatos antes de pedir novo envio**.

As referências são fonte visual; não restaurar regras antigas que conflitem com o Projeto Mestre atual. Em especial:

- Painel continua operacional e sem faturamento.
- Pagamento continua separado do status da OS; não restaurar `Pago` como status operacional.
- Pós-Venda continua no modelo simplificado/auditado atual.
- Não recriar módulos antigos de menu quando as funções atuais estão consolidadas no Financeiro.

O Instagram oficial atual da empresa é `https://www.instagram.com/allanluttembarck`. O `instagram.com/arlinformatica` impresso no timbrado histórico está desatualizado e não deve retornar ao código, seed, teste ou documento dinâmico.

## Forma de trabalho com o proprietário

O proprietário não quer programar, interpretar logs ou executar passos técnicos do GitHub quando o assistente consegue fazê-los. O assistente deve conduzir análise, alterações e CI diretamente pela PR e explicar apenas o necessário.

Nunca fazer merge automaticamente nem atualizar `main`. Antes de qualquer escrita no GitHub, conferir novamente o head da PR e os SHAs dos arquivos relevantes. Não usar force-push.

Não enfraquecer testes para obter verde. Playwright deve permanecer com `retries: 0`; não usar `force: true`, clique JavaScript ou aumento artificial de timeout para esconder hitbox, concorrência ou defeito funcional. Só considerar revisão pronta quando **backend SQLite + backend MySQL + frontend + E2E normal** estiverem verdes no head atual.

## Regra permanente de interface

Priorizar **mobile first**. Controles devem ter alvos de toque adequados e inputs invisíveis não podem invadir hitboxes vizinhas.

Os atalhos externos de OS — WhatsApp, Maps, Foto, Status e Finalizar — são validados geometricamente pelo E2E. O teste usa clique normal; não reintroduzir `HTMLElement.click()` para contornar a interface.

A listagem de Clientes também passou a ter regressão geométrica mobile: ações precisam ficar dentro do card, com altura mínima de 44 px, telefone em uma linha e sem overflow horizontal do documento.

## Etapa 10 — implementado na PR #11

### Painel e Mesa
O Painel e a Mesa usam `/api/orders/desk`, sem paginação; a Lista de OS usa `/api/orders` com abas e paginação server-side de 50 itens.

### Orçamento e finalização
A aprovação do orçamento altera apenas status. Na finalização, quando `approved_budget_id` é escolhido, o backend valida o orçamento e reconstrói itens/preço/quantidade/garantia a partir do banco, ignorando valores manipuláveis do navegador.

### Financeiro
Visão Geral e Caixa Diário não dependem do relatório mensal. Mensal/Relatórios carregam sob demanda; falha de relatório não derruba a tela Financeiro inteira.

### Perfis
`/api/me` fornece contexto seguro. Master, Administrador e Funcionário têm interface adequada ao perfil, mas o backend é sempre a autoridade de autorização.

### Serviços e garantias
Serviços/Produtos têm tipo, preço e garantia adicional em dias/meses/anos. Garantia Geral é configurável e preservada no snapshot histórico dos documentos.

### Atendimento externo mobile
OS externa oferece WhatsApp, Maps, Foto, Status e Finalizar. WhatsApp inclui número da OS e avarias; abrir a conversa não registra envio.

### Layout por dispositivo
`automatic`, `desktop` e `mobile` são preferências locais em `localStorage`; não existe `layout_mode` global em Settings.

### Backup e restauração
Backup automático é persistido/auditado. Restore usa staging e snapshot apenas do domínio privado gerenciado; framework, logs, backups, temporários de recuperação, `.env` e arquivos externos são preservados. Banco e filesystem são fases separadas; não afirmar atomicidade única entre ambos.

## Correções estruturais importantes

1. **Orçamento stale:** solução estrutural tornou o orçamento aprovado autoritativo no servidor por ID.
2. **Financeiro:** relatório mensal desacoplado do carregamento inicial; não foi resolvido por timeout.
3. **Mobile externo:** o input de foto interceptava Status/Finalizar; correção real foi CSS/hitbox mobile-first e regressão geométrica.
4. **SIGSEGV intermitente no E2E:** bisseção mostrou correlação com Zend OPcache carregado no PHP do servidor embutido. CI/release desabilitam OPcache somente nesse runtime de testes e verificam explicitamente sua ausência. Não afirmar bug upstream exato do PHP.
5. **Tema após reload:** teste passou a aguardar a resposta real de `GET /api/theme`; sem retry/force/timeout artificial.
6. **Capturas visuais prematuras:** `zz-visual-homologation.spec.ts` podia fotografar antes de o carregamento assíncrono começar. Commit `53b21279fb689938eb84f663242107a22aca9339` passou a aguardar a OS/cliente criados pelo próprio teste.
7. **Clientes visual:** capturas válidas revelaram ações cortadas no desktop e telefone quebrando demais no mobile. Commit `4601f74d83a96d0b68698b276b25f3bdf9328920` corrigiu o CSS; commit `cdffc543df5c147b64b9c87f14a20831145d962a` adicionou regressão geométrica mobile. CI #356 ficou integralmente verde.
8. **Instagram oficial:** `@arlinformatica` foi removido dos defaults ativos; o oficial é `@allanluttembarck`.

## Homologação visual atual

- Referências oficiais recebidas e catalogadas.
- Painel/Menu, Clientes, Nova OS, Status/OS, PDF A4 e Pós-Venda foram comparados com os artefatos carregados da CI.
- Diferenças funcionais antigas não foram restauradas quando conflitavam com a arquitetura atual.
- PDF final automatizado permaneceu em uma única página A4 sem corte/overlap observado.
- A pipeline de logo já aceita a imagem configurada e gera variantes privadas. O artefato de teste cai no fallback textual `ARL` porque o seed não cadastra binário de logo.
- **Antes de aceitar produção**, cadastrar a `LOGO.png` oficial em Configurações e gerar um PDF real de conferência. Não redesenhar a logo.

## Diagnóstico temporário removido

`.github/workflows/diagnose-segfault.yml` foi removido no commit `5f47b8cd7f87e5a8c987a95e514795634b955202`. Não recriar por padrão. Se surgir novo SIGSEGV com OPcache já ausente, investigar o novo log/artefato antes de assumir a mesma causa.

## Validações externas ainda pendentes

- Executar manualmente o workflow **Preparar release** no **head final**; o conector atual não expõe `workflow_dispatch`.
- Configurar KingHost real e realizar deploy/smoke test.
- Cadastrar a `LOGO.png` no ambiente real e conferir documento gerado.
- Imprimir A4 em impressora física.
- Web Push em Android/iPhone físico com HTTPS e VAPID reais.
- Recuperação pública por e-mail continua opcional enquanto SMTP não estiver definido; reset administrativo pelo Master funciona.

## Ordem recomendada para publicação

1. Fechar docs e confirmar CI verde no head final.
2. Executar manualmente **Preparar release** e validar o artefato + `.sha256`.
3. Preparar KingHost: PHP 8.2+, extensões, MySQL/MariaDB, HTTPS, document root `public/`.
4. Publicar pacote, criar `.env` somente no servidor, rodar migrations/instalador/optimize e configurar cron.
5. Primeiro acesso: cadastrar LOGO oficial e conferir dados da empresa/Instagram.
6. Smoke test de login, clientes, OS, fotos, PDF, financeiro, backup, scheduler/heartbeat e diagnóstico.
7. Impressão A4 física e Web Push em dispositivo real.
8. Só então avaliar autorização de merge/publicação definitiva. Merge é manual do proprietário.

## Regra para merge

“Able to merge” significa apenas ausência de conflito. Não autorizar merge sem CI do head final verde, revisão final sem falha crítica e gates externos definidos acima concluídos conforme a exigência do proprietário.

## Prompt curto para um novo chat

> Continue a PR #11 de `dsnakeall-crypto/arlinformatica`, branch `codex/implementar-etapa-10-do-projeto`. Leia os sete documentos obrigatórios e confira head/CI antes de qualquer escrita. O último head técnico validado antes do fechamento documental foi `cdffc543df5c147b64b9c87f14a20831145d962a`, CI #356 com SQLite, MySQL, frontend e 26/26 Playwright verdes. As 8 referências visuais oficiais foram reenviadas em 04/09/2026 e seus nomes/SHA-256 estão em `docs/REFERENCIAS_VISUAIS.md`; se não estiverem anexadas, procure a Library antes de pedir reenvio. O Instagram oficial é `@allanluttembarck`. Capturas visuais prematuras e overflow de Clientes já foram corrigidos e protegidos por E2E. Playwright permanece `retries: 0`, sem force/clique JS/timeout artificial. Não faça merge automaticamente. Próximo gate: CI do head documental final, depois workflow manual `Preparar release`, KingHost real, logo/PDF físico e Web Push real.

## 19/10/2026 — Prévia mobile com dados fictícios persistentes + layout Web/Mobile automático

Retomada completa em `docs/RETOMADA-ARL-20261019-DEMO-E-LAYOUT-AUTOMATICO.md`.
Ambiente de teste persistente `http://127.0.0.1:8012`; banco privado externo em `Backups/ARL-PREVIA-DADOS-20261019/preview-persistente.sqlite` (pasta `App Arl Informatica` no PC). Inicialização via `INICIAR-PREVIA-ARL.bat` da mesma pasta. Criados 20 fornecedores, 20 produtos, 20 serviços, 20 clientes e 20 OS abertas com orçamentos e estoque, sem dados oficiais. Verificações de integridade, navegação e API 200. Layout alterna automaticamente Web ↔ Mobile quando a largura cruza 1024px, teste E2E direcionado aprovado. **Não houve commit/push/deploy**. Próximo gate: atualizar testes E2E antigos incompatíveis com a nova alternância e validar CI integral, antes de considerar KingHost.

## 19/10 — Quatro layouts mantidos para comparação
Implementado `Configurações → Layouts`: Web / PC; Mobile barra inferior clássica; Mobile Premium (novo); Mobile menu lateral compacto. Premium condicionado por classe da shell, home e dock específicos; clássicos preservados, mesmo banco de dados. LocalStorage por usuário salva a escolha. Teste E2E quatro opções e fluxo Premium aprovado (4/4 direcionados). Conferir `docs/QUATRO-LAYOUTS-PARA-TESTE-20261019.md`; backup anterior em `Backups/QUATRO-LAYOUTS-20261019` fora do repo. Nenhum commit/push/deploy. CIs integrais ainda não verdes.

## 19/10 — Menu flutuante premium e estudo visual das telas
Dock Premium: Painel, Clientes, + Abrir OS, Gastos, Menu. Menu abre modal bottom sheet com grupos e permissões existentes; sidebar antiga preservada nos layouts clássicos. Typecheck/lint/build e Playwright focado 4/4 PASS. Estudo INTERATIVO APENAS VISUAL de 10 áreas em Backups/ESBOCOS-AREAS-PREMIUM-20261019/index.html. Detalhes em docs/MOBILE-PREMIUM-MENU-FLUTUANTE-E-ESBOCOS-20261019.md. Sem commits, push ou deploy.

## 19/10 — Mobile Premium único + docks compactos ARL/Gastos
Proprietário aprovou remover opções Mobile clássico e compacto (mantidas apenas em backup/histórico para reversão). Configurações -> Layouts: somente Web/PC e Mobile Premium. Preferências antigas bottom/compact são migradas por usuário para Premium. Dock ARL Painel|Clientes|+Abrir OS|Gastos|Menu; dock financeiro mantém Resumo|Instituições|Adicionar|Projeção|Gastos. Ambos agora medem 59 px no navegador (botões 49 px), com testes E2E direcionados 6/6 PASS, TypeScript/lint/build PASS. Reformulação visual interna dos módulos aplica CSS somente ao Premium, sem alterações funcionais. Detalhes em docs/RETOMADA-ARL-20261019-PREMIUM-UNICO-DOCK-COMPACTO.md; backup externo em Backups/MOBILE-PREMIUM-UNICO-DOCK-MENOR-20261019. KingHost intacta; sem commits/push. CIs integrais não verificadas verdes.

## 20/10/2026 — Menu Mobile Premium: gaveta direita + 3D leve
Implementado pelo Desktop Commander no projeto local (branch release/integracao-completa-20261018, HEAD 8903365). Menu Premium agora abre gaveta pela DIREITA em tela inteira (86vw, até 365px), mantendo os mesmos acessos e permissões; header vetorizado ARL, cartões verticais 3D suaves, botão X, Esc, backdrop, Tab e rolagem. O dock compacto permanece Painel|Clientes|+ Abrir OS|Gastos|Menu. Cards existentes dos módulos ARL recebem apenas efeitos 3D de CSS escopado ao Mobile Premium; Web/PC e Controle de Gastos permanecem inalterados em suas regras e estilos funcionais. CSS antigo do bottom-sheet removido de arl-mobile-premium-20261019.css; novo CSS arl-premium-right-drawer-3d-20261020.css importado em main.tsx. Backup externo SHA256 em Backups/01 - 20-10-26 - 03-50 - GAVETA-DIREITA-3D. TypeScript/lint/build PASS; E2E direcionado 8 PASS e teste dos 6 módulos carregados 1 PASS. Visual final aguardando aceite; regressão full/CI ainda pendentes; sem commit/push/KingHost. Mais em docs/layout-setores/menu-premium/.

## 20/10/2026 — referência visual 3D oficial aplicada ao Mobile Premium ARL
Proprietário autorizou executar com a última captura (1024x1536) como referência. Backup pré-alteração externo SHA256: `Backups/01 - 20-10-26 - 05-15 - ARL-MOBILE-3D-REFERENCIA`. Incrementos restritos à aparência mobile ARL: `resources/js/mobile-home.ts` recebeu 8 ícones metálicos SVG com gradiente; novo CSS `resources/css/arl-mobile-3d-reference-20261020.css` importado por último em `main.tsx` padroniza relevo da home/dock e dos cards nos módulos reais; novo SVG de curva luminosa `public/arl-assets/arl-mobile-premium-gold-ribbon-20261020.svg`; teste novo `tests/e2e/mobile-premium-3d-reference-20261020.spec.ts`. Cinco capturas de Painel 320/375/390/409/430, screenshot de Menu e Produtos no backup. Typecheck/lint/build PASS; E2E direcionados existentes 8 PASS e teste de contrato visual 2 PASS; captura de Playwright da prévia persistente: 20 OS, oito ícones, sem overflow. **Não afirmar fidelidade de 100% pixels**: renderização usa SVG/CSS e não o raster da referência; o proprietário pode solicitar refinamento adicional. Web/PC e Controle de Gastos intocados. HEAD inicial 8903365, não houve commit, push ou deploy. CIs integrais GitHub pendentes. Detalhes em `docs/MOBILE-3D-REFERENCIA-OFICIAL-20261020.md`.

## 20/10/2026 — Controle de Gastos: Carros no Web e Mobile
Autorizada e implementada localmente aba Carros (veículos, lavagem, manutenção com KM/revisão, itens livres e valor, instituição/tipo e responsável Allan/Carol/Casal), integrada à rotina original de dívidas e pagamentos com vínculo histórico independente e request_key idempotente. Mobile: dock Resumo|Instituições|Adicionar|Carros|Menu, gaveta direita com demais seções; botões de Instituições/tipos e popups compactados. Web: aba Carros e telas idênticas em funcionalidade. Migração aditiva apenas no SQLite persistente de DEMO, após backup íntegro externo; KingHost/MySQL oficial intocados. 4 testes PHP PASS (45 assertions), 2 Playwright novos PASS, typecheck/lint/build PASS. Registros e evidências em docs/CONTROLE-GASTOS-CARROS-WEB-MOBILE-20261020.md; backup em Backups/01 - 20-10-26 - 08-30 - CARROS-E-MENU-GASTOS. Não houve commit/push/deploy; CI integral não validada.

## 20/10 — Controle de Gastos Carros Web/Mobile
Na retomada foram identificados arquivos locais já implementados e não commitados para Carros. Preservados; inspecionados e testados. Typecheck/lint/build PASS; testes PHP de integração 4 PASS/45 asserts; E2E Web/Mobile 2 PASS. Carros suporta lavagem, manutenção detalhada, itens livres e dívida vinculada por Allan/Carol/Casal sem duplicar; mobile dock Carros/Menu abre menu com Projeção e outras abas, Web também tem aba Carros. Cópia de segurança externa em Backups/01 - 20-10-26 - 07-35 - CARROS-VALIDACAO. Estado e cuidados em docs/VALIDACAO-CARROS-CONTROLE-GASTOS-20261020.md. Nenhum commit/push/deploy; banco oficial intocado e CI integral pendente.

## 20/10/2026 — manutenção Carros com soma automática e campo único
Pedido de ajuste do proprietário executado localmente por Desktop Commander. Cadastro de manutenção agora possui checkbox Total manual desmarcado por padrão; soma automática exclusivamente dos itens confirmados. Itens fixos com lápis para editar e exclusão no modo edição; próxima revisão por KM e data opcional; aviso de revisão por data a até 30 dias, somente dentro de Carros, sem push. Campo único opcional O que foi feito / o que ficar atento após itens. Preservados Web/Mobile, dívidas Allan/Carol/Casal, pagamentos, histórico e dados do servidor. Backend passou a permitir work_notes null, esquema já era nullable. Backup antes em Backups/01 - 20-10-26 - MANUTENCAO-CARROS-AUTOSOMA; documentação detalhada em docs/CARROS-MANUTENCAO-AUTOSOMA-20261020.md. Typecheck/lint/build PASS, backend 5 testes e 55 asserts PASS, E2E 4 PASS total (Web e Mobile). Nenhum commit/push/KingHost. CI completa pendente.

## 20/10/2026 — popular Controle de Gastos do demo e uniformizar docks
A prévia real 127.0.0.1:8012 conecta a SQLite isolada em Backups/ARL-PREVIA-DADOS-20261019/preview-persistente.sqlite. Os 20 clientes, 20 fornecedores, 20 produtos, 20 serviços, 20 OS e 20 orçamentos fictícios foram **confirmados e preservados** (não recadastrar). CG estava zerado: criadas via API local 7 instituições, 7 tipos de dívida, 16 dívidas/faturas e 51 parcelas no mês 10/2026 e seguintes, distribuídas Allan/Carol/Casal. Nenhum banco oficial tocado. Backup SQLite integral antes (hash SHA256), scripts/resultado e screenshots em Backups/01 - 20-10-26 - 09-10 - DADOS-DEMO-GASTOS-DOCK. Novo CSS `resources/css/arl-gastos-docks-unificados-20261020.css`, importado ao final de main.tsx e expense-control-page.tsx. Barras inferiores de ambos módulos medidas 57 px; botão vermelho circular 30×30 com gap de 5 px para legenda; ações preservadas. Typecheck/lint/build PASS; documentação em docs/CHECKPOINT-DEMO-FINANCEIRO-DOCKS-20261020.md. Sem commit/push/KingHost. CIs integrais ainda não homologadas.
