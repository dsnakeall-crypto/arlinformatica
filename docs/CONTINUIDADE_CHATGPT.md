# Continuidade do projeto ARL Informática no ChatGPT

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
O Painel usa listagem paginada e resumo operacional. A Mesa usa `/api/orders/desk`, sem paginação, para todas as OS abertas nos status `analysis`, `waiting_part` e `in_service`.

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
