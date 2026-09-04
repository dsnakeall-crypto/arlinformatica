# Continuidade do projeto ARL Informática no ChatGPT

Este arquivo é o ponto de retomada do projeto em um novo chat. O GitHub é a fonte oficial; não reconstruir requisitos apenas por memória de conversa.

## Fonte oficial e estado atual

- Repositório privado: `dsnakeall-crypto/arlinformatica`.
- Branch principal: `main`.
- Base atual da PR #11 na `main`: commit `4c4e753c004c6f834a989f13d6ab1e66ba2612e9`.
- Etapa atual: **PR #11**, branch `codex/implementar-etapa-10-do-projeto`.
- Último commit funcional validado da PR #11: `a1f95ce1d598e8883a50709d0d48bf201129d929`.
- CI #328 desse commit: **backend SQLite OK, backend MySQL OK, frontend OK e Playwright E2E normal OK**, com `retries: 0`.
- Commit de limpeza posterior: `5f47b8cd7f87e5a8c987a95e514795634b955202`, que removeu o workflow temporário `.github/workflows/diagnose-segfault.yml`. O CI do head posterior precisa ficar verde antes de qualquer liberação de merge.
- Não há autorização de merge enquanto existirem validações externas pendentes ou checks do head final não verificados.

## Arquivos obrigatórios para um novo chat

Leia, nesta ordem:

1. `AGENTS.md`
2. `docs/PROJETO_MESTRE.md`
3. `docs/REFERENCIAS_VISUAIS.md`
4. `CHECKLIST_FINAL.md`
5. `docs/ARQUITETURA.md`
6. `docs/KINGHOST_DEPLOY.md`
7. `docs/CONTINUIDADE_CHATGPT.md`

`docs/PROJETO_MESTRE.md` é a especificação funcional oficial. `CHECKLIST_FINAL.md` contém o estado verificável. Se os anexos visuais antigos não estiverem disponíveis no chat, não afirmar comparação visual concluída: pedir o reenvio somente na etapa de homologação visual.

## Forma de trabalho com o proprietário

O proprietário não quer programar, interpretar logs ou executar passos técnicos do GitHub quando o assistente consegue fazê-los. O assistente deve conduzir análise, alterações e CI diretamente pela PR e explicar apenas o necessário.

Nunca fazer merge automaticamente nem atualizar `main`. Antes de qualquer escrita no GitHub, conferir novamente o head da PR e os SHAs dos arquivos relevantes. Não usar force-push. Se um teste falhar, explicar arquivo/teste afetado, esperado versus obtido, causa provável, correção e impacto em produção antes de alterar o código.

Não enfraquecer testes para obter verde. Playwright deve permanecer com `retries: 0`; não usar `force: true`, clique JavaScript ou aumento de timeout para esconder hitbox, concorrência ou defeito funcional. Só considerar uma revisão pronta quando **backend SQLite + backend MySQL + frontend + E2E normal** estiverem verdes no head atual.

## Regra permanente de interface

Priorizar **mobile first**. A base de CSS deve atender telas pequenas e as expansões devem preferir `min-width`. Controles precisam ter áreas de toque adequadas e inputs invisíveis não podem invadir a hitbox de elementos vizinhos.

Os atalhos da OS externa são a referência atual: uma coluna na base, duas a partir de 360 px e cinco a partir de 720 px; altura mínima de 48 px. O input de Foto fica contido dentro do próprio botão. O E2E mede as caixas de WhatsApp, Maps, Foto, Status e Finalizar e falha se houver sobreposição, além de clicar normalmente em `#external-status-action`.

## Etapa 10 — o que já está implementado na PR #11

### Painel e Mesa

O Painel usa a listagem paginada normal com resumo operacional. A Mesa usa `/api/orders/desk`, sem paginação, e deve mostrar todas as OS abertas nos status `analysis`, `waiting_part` e `in_service`. Teste backend cobre mais de 20 OS abertas.

### Orçamento e finalização

A aprovação do orçamento altera apenas status. Os itens só são escolhidos explicitamente na finalização. Quando `approved_budget_id` existe, o backend é a fonte de verdade: valida o orçamento, carrega `budget_items` do banco, reconstrói preço/quantidade/garantia e ignora valores manipuláveis enviados pelo navegador. O orçamento não pode ser usado em outra OS nem reutilizado indevidamente.

### Financeiro

O bloqueio antigo foi resolvido por arquitetura: a abertura do Financeiro carrega Visão Geral e Caixa Diário sem depender de `/finance/month`. Mensal e Relatórios carregam sob demanda e têm erro próprio. Assim uma falha do relatório mensal não derruba a tela financeira inteira.

### Perfis

`/api/me` fornece apenas contexto seguro de usuário/perfil. Master vê todas as áreas; Administrador vê a administração permitida sem funções exclusivas de Master; Funcionário vê somente operação. A interface filtra menus, mas o backend continua sendo a autoridade real de autorização.

### Serviços e garantias

Serviços/Produtos permitem criar e editar nome, tipo, preço e garantia adicional em dias/meses/anos. Garantia Geral pode ser habilitada nas Configurações, exige texto quando ativa e é preservada em snapshot do PDF final. Item sem garantia adicional não imprime mensagem artificial de “sem garantia”.

### Atendimento externo mobile

A OS externa expõe WhatsApp, Maps, Foto, Status e Finalizar. WhatsApp inclui número da OS e avarias do checklist. Abrir a conversa não registra envio. O layout desses atalhos foi corrigido com mobile first e tem E2E de não sobreposição.

### Layout por dispositivo

`automatic`, `desktop` e `mobile` são preferências locais em `localStorage`. Não existe `layout_mode` global em Settings nem em snapshot empresarial.

### Backup e restauração

Backup automático é persistido no banco, auditado e lido pelo scheduler. Restauração usa staging e snapshot apenas do domínio privado gerenciado. Framework, logs, backups, temporários de recuperação, `.env`, PHP e arquivos fora do domínio gerenciado são preservados. Banco e filesystem são fases separadas; não afirmar atomicidade única entre os dois.

## Correções estruturais importantes desta PR

1. **Orçamento stale no frontend:** havia estados independentes de orçamento; a finalização podia ficar com dados antigos. A correção inicial refazia a consulta ao abrir a finalização, e a solução estrutural tornou o orçamento aprovado autoritativo no servidor por ID.
2. **Financeiro:** `/finance/month` falhava no E2E quando fazia parte do carregamento inicial conjunto. A solução definitiva foi desacoplar o relatório mensal da abertura da tela, não aumentar timeout nem retirar teste.
3. **Mobile externo:** o `input[type=file]` de Foto interceptava o clique de Status/Finalizar. Adicionar ID ao Status provou que o seletor não era a causa. A correção real foi CSS mobile-first, contendo o input na própria hitbox e testando geometricamente ausência de sobreposição.
4. **SIGSEGV intermitente no servidor PHP embutido do E2E:** a investigação por bisseção de extensões mostrou crashes quando Zend OPcache permanecia carregado e estabilidade consistente nas execuções observadas sem o módulo. A CI e o workflow de release passaram a configurar o PHP usado no E2E com `:opcache` e possuem verificação explícita que falha se `Zend OPcache` reaparecer. Isso é restrito ao runtime de testes; não desativa OPcache da hospedagem/produção.
5. **Persistência visual do tema após reload:** depois de estabilizar o runtime PHP, o E2E revelou uma corrida real do teste: o backend persistia e retornava as cores corretas, mas a asserção do CSS podia ocorrer antes de o GET `/api/theme` terminar. O teste foi sincronizado com a resposta real da API e só então valida o CSS aplicado; não foram adicionados retry, `force:true`, clique JavaScript ou timeout artificial. O CI #328 passou integralmente após essa correção.

## Diagnóstico temporário removido

- `.github/workflows/diagnose-segfault.yml` foi criado apenas para isolar o crash e foi removido no commit `5f47b8cd7f87e5a8c987a95e514795634b955202` depois que a evidência necessária foi obtida.
- Não recriar esse workflow por padrão. Se um novo `SIGSEGV` aparecer com OPcache já ausente no job E2E, investigar o novo log/artefato antes de supor que é o mesmo problema.

## Validações externas ainda pendentes

- Web Push em Android/iPhone físico com HTTPS e VAPID reais.
- Comparação visual final de PDFs/telas e homologação de impressão física; os arquivos de referência visual precisam ser reanexados.
- Deploy real na KingHost e smoke test no ambiente real.
- Execução manual do workflow `Preparar release` no head final. O conector usado nesta retomada não expõe ação de `workflow_dispatch`, então essa execução pode exigir ação manual no GitHub quando o head estiver definitivamente fechado.
- Recuperação pública opcional de senha por e-mail enquanto SMTP não estiver definido; reset administrativo pelo Master permanece funcional.

Essas pendências devem ser descritas honestamente; não inventar homologação externa.

## Regra para merge

Não interpretar “Able to merge” como aprovação. Ausência de conflito Git não substitui testes.

Antes de liberar o merge, conferir o head atual da PR #11 e a CI correspondente. Backend SQLite, backend MySQL, frontend e E2E normal precisam estar verdes. Também é necessário concluir a revisão final e não haver falha técnica crítica aberta. O merge é manual pelo proprietário.

## Prompt curto para um novo chat

> Continue a PR #11 do repositório privado `dsnakeall-crypto/arlinformatica`, branch `codex/implementar-etapa-10-do-projeto`. Leia os sete documentos obrigatórios, confira o head real e a CI antes de qualquer escrita. O último head funcional validado foi `a1f95ce1d598e8883a50709d0d48bf201129d929`, CI #328 totalmente verde; depois foi removido o workflow temporário de diagnóstico de SIGSEGV. A Etapa 10 contém Painel/Mesa, orçamento autoritativo no servidor, Financeiro mensal sob demanda, perfis, garantias, backup endurecido e atalhos externos mobile-first. O E2E usa PHP sem Zend OPcache devido ao crash intermitente isolado no runner. Playwright deve permanecer com `retries: 0`; não enfraqueça testes. Não faça merge automaticamente. Se referências visuais não estiverem anexadas, não declare homologação visual concluída.
