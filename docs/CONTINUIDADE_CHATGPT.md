# Continuidade do projeto ARL Informática no ChatGPT

Este arquivo permite continuar o projeto em outro chat sem depender do histórico completo da conversa anterior.

## Fonte oficial

Repositório privado GitHub: `dsnakeall-crypto/arlinformatica`

Branch principal: `main`

O GitHub é a fonte oficial do código e da documentação.

## Arquivos que um novo chat DEVE ler primeiro

1. `AGENTS.md`
2. `docs/PROJETO_MESTRE.md`
3. `docs/REFERENCIAS_VISUAIS.md`
4. `CHECKLIST_FINAL.md`
5. `docs/ARQUITETURA.md`
6. `docs/KINGHOST_DEPLOY.md`
7. `docs/CONTINUIDADE_CHATGPT.md`

`docs/PROJETO_MESTRE.md` é a especificação funcional oficial. Não reconstruir requisitos por memória.

## Objetivo central

Sistema completo ARL Informática para gestão de assistência técnica, independente de ChatGPT/Codex/Supabase em produção e preparado para hospedagem própria, especialmente KingHost/shared hosting PHP + MySQL/MariaDB.

Arquitetura definida:

- Laravel/PHP 8.x no backend;
- MySQL/MariaDB em produção;
- React + TypeScript + Vite no frontend;
- sem processo Node permanente em produção;
- PDFs compatíveis com shared hosting/Dompdf;
- fotos privadas reduzidas para no máximo 100 KB;
- PWA/mobile próprio;
- GitHub como fonte oficial do código.

## Regras funcionais importantes confirmadas

- Perfis Master, Administrador e Funcionário, com autorização real no backend.
- Painel focado em OS abertas/concluídas, sem faturamento em destaque.
- Clientes com nome/razão social, CPF/CNPJ, telefone e endereço.
- CPF/CNPJ normalizado, validado e sem duplicidade.
- CEP com consulta automática e fallback manual.
- Catálogo único chamado Serviços, classificando item como serviço ou produto.
- Garantia adicional configurável por item e preservada por snapshot da OS.
- Atendimento: Análise na Bancada ou Atendimento Externo, sem gerar valor financeiro sozinho.
- Checklist em accordion: nada marcado = 100% OK; avarias aparecem em documentos e mensagem de WhatsApp.
- Fotos de equipamento com máximo 100 KB; excluir fotos nunca exclui OS, PDFs, laudos, clientes ou histórico.
- OS concluída nunca é excluída fisicamente no fluxo normal.
- Snapshots preservam dados históricos de cliente, preços, logo, garantia, termo, checklist etc.
- Termo de recebimento/retirada gerado na abertura da OS, com texto editável em Configurações.
- WhatsApp por mensagem pré-preenchida, sem afirmar envio se não houver confirmação real.
- Google Maps clicável pelo endereço.
- Orçamentos dentro da OS, com PDF timbrado, versões e aprovação/recusa.
- Laudos técnicos configuráveis, inclusive dano elétrico; o sistema não determina sozinho a causa técnica.
- Finalização da OS permite reparo realizado, sem reparo, cancelamento, inviável, sem defeito etc.
- PDF final A4 preservado como documento histórico.
- Pagamento separado do status operacional da OS.
- Financeiro com caixa diário automático, entrada rápida, visão mensal e relatórios.
- Pós-venda com três ações: confirmar serviço, pedir avaliação Google e convidar para Instagram.
- Pós-venda bloqueia botão após confirmação de envio, lembra após 5 dias e cria novo ciclo após 60 dias conforme Projeto Mestre.
- Central de notificações e PWA/Web Push quando suportado.
- Layout Web/PC segue referências; Mobile/Tablet terá interface própria.
- Configurações organizadas em cards por categoria.
- Backup completo de dados/documentos/fotos + manifesto; código versionado no GitHub.
- Documentação de hospedagem/migração para KingHost.

Links padrão:

- Instagram: `https://www.instagram.com/allanluttembarck`
- Google Review: `https://g.page/r/CSxkz5Y88MaJEBM/review`

## Referências visuais

Mapeadas em `docs/REFERENCIAS_VISUAIS.md`:

- painel/menu;
- clientes;
- Nova OS;
- seletor de status;
- PDF final A4;
- Pós-Venda;
- `TIMBRADO.png` para orçamento e laudos;
- logo ARL separada, quando fornecida.

Se um novo chat precisar comparar visualmente e não tiver os anexos antigos, pedir ao usuário para anexá-los novamente.

## Histórico técnico resumido

O projeto foi reiniciado do zero usando GitHub + Codex Cloud para evitar dependência de arquivos somente no PC.

### PR #1 — fundação

Criou a fundação Laravel/React, schema inicial, APIs básicas, documentação e shell visual. Houve falhas iniciais de CI por lockfiles ausentes, bloqueio HTTP 403 no ambiente Codex para Packagist/npm e problemas de Pint. GitHub Actions foi usado para estabilizar a base.

A PR #1 foi mergeada antes do backend ficar totalmente verde.

### PR #2 — correção da CI

PR: `fix: corrigir CI do backend e remover workflow temporário`.

Foram corrigidos os últimos problemas de Pint, removido o workflow temporário e criado `tests/Feature/SmokeTest.php`.

Antes do merge da PR #2, a CI passou completamente:

- Composer/install: OK;
- ambiente Laravel: OK;
- migrations + seed: OK;
- `vendor/bin/pint --test`: OK;
- `php artisan test`: OK;
- `npm ci`: OK;
- `npm run typecheck`: OK;
- `npm run build`: OK.

PR #2 mergeada com sucesso em 01/09/2026.

### PR #3 — Etapa 2: operação funcional de clientes e OS

PR: `feat: operação funcional de clientes e abertura/visualização de OS`.

Implementado e incorporado à `main`:

- interface real ligada ao backend para Clientes;
- cadastro e busca de clientes;
- normalização/validação de CPF/CNPJ e prevenção de duplicidade;
- ViaCEP com fallback para preenchimento manual;
- endpoints e fluxo funcional de clientes;
- catálogos necessários para equipamento, fabricantes, serviços e checklist;
- abertura transacional de OS;
- escolha entre Análise na Bancada e Atendimento Externo;
- checklist por equipamento, com nenhuma avaria = `CHECKLIST 100% OK`;
- upload privado de fotos usando `PhotoOptimizer`, com teto de 100 KB;
- listagem de OS com dados reais;
- visualização de OS com cliente, problema, checklist, fotos e histórico;
- teste de fluxo operacional em `tests/Feature/OperationFlowTest.php`;
- telas responsivas para o fluxo operacional inicial.

A primeira execução da CI da PR #3 falhou apenas por:

- ordenação de imports em `routes/api.php` exigida pelo Pint;
- parâmetro `id` sem tipo explícito no TypeScript.

As duas correções foram feitas diretamente na branch da PR sem usar créditos adicionais do Codex.

Depois das correções, a CI da PR #3 passou completamente:

- backend: OK;
- frontend: OK;
- migrations + seed: OK;
- Pint: OK;
- testes PHP: OK;
- `npm ci`: OK;
- TypeScript/typecheck: OK;
- build: OK.

PR #3 mergeada com sucesso em 01/09/2026.

Merge commit da Etapa 2 na `main`: `a721049d168982ebf553152aacabf18d0da1aa7e`.

## Estado atual do sistema

A `main` está estável e com CI verde no marco da Etapa 2.

Já existem de forma funcional ou estrutural:

- Laravel/PHP + React/TypeScript;
- autenticação/sessão e perfis iniciais;
- instalador CLI para primeiro Master;
- schema amplo do banco;
- clientes reais ligados à interface;
- CPF/CNPJ validado e sem duplicidade;
- ViaCEP com fallback manual;
- abertura e listagem real de OS;
- numeração transacional de OS;
- snapshots iniciais;
- histórico de status;
- regra estrutural de não excluir OS;
- Bancada/Atendimento Externo;
- checklist de entrada com regra 100% OK;
- fotos privadas ligadas à OS e otimizadas para até 100 KB;
- catálogos básicos necessários à abertura da OS;
- visualização inicial da OS;
- layout desktop/mobile operacional inicial;
- PWA manifest inicial;
- documentação de arquitetura e KingHost;
- CI funcional para backend e frontend.

## Etapa 3 — Configurações, documentos, orçamento e garantia

Implementado na branch `feat/configuracoes-documentos-orcamento`: dados configuráveis da empresa; upload privado da logo com seis variantes sem deformação; central responsiva de Configurações; versionamento do termo; infraestrutura Dompdf privada com snapshot e SHA-256; termo da OS; orçamento A4 com revisões; cálculo em centavos; garantia opcional em dias, meses ou anos; registro auditável de envio, aprovação ou recusa. Documentos emitidos preservam empresa, logo, texto e dados usados.

Permanecem fora desta etapa: laudos completos, financeiro, pós-venda, backup/restore, administração completa de usuários e conclusão final da OS. A validação PHP/Laravel ficou destinada ao GitHub Actions porque o ambiente local recebeu HTTP 403 ao baixar dependências do Composer.

## Pendências principais para as próximas etapas

Consultar sempre `CHECKLIST_FINAL.md` e `docs/PROJETO_MESTRE.md` antes de implementar.

Entre as principais pendências:

- telas administrativas completas de Serviços, fabricantes, equipamentos e templates de checklist;
- edição de cliente pela interface;
- observação livre/`Outro` no checklist quando previsto;
- WhatsApp e Google Maps;
- termo de recebimento/retirada e PDFs;
- orçamento com PDF timbrado, versões e aprovação/recusa;
- garantias completas;
- laudos técnicos;
- fluxo de conclusão da OS;
- pagamento e financeiro;
- pós-venda;
- notificações/Web Push;
- backup/restore e limpeza segura de fotos;
- configurações completas, incluindo dados da empresa, logomarca e layouts;
- administração completa de usuários/permissões;
- comparação visual final com as referências;
- testes E2E Playwright.

## Regra de trabalho daqui para frente

1. Não fazer grandes alterações direto na `main`.
2. Criar branch nova para cada etapa relevante.
3. Codex implementa nessa branch.
4. Abrir PR.
5. Esperar CI.
6. Corrigir qualquer check vermelho antes do merge.
7. Só fazer merge com backend e frontend verdes.
8. Atualizar `CHECKLIST_FINAL.md` e este arquivo em marcos importantes.

Nunca interpretar `Able to merge` como aprovação dos testes; isso só indica ausência de conflito de Git.

Se o Codex Cloud bloquear Packagist/npm por HTTP 403, não repetir instalações várias vezes. Registrar a limitação e deixar a validação final para o GitHub Actions usando os lockfiles versionados.

## Prompt pronto para continuar em um NOVO CHAT

Copiar e colar:

---

Estou continuando o projeto ARL Informática que já está no meu GitHub privado `dsnakeall-crypto/arlinformatica`.

Use o conector GitHub e, antes de qualquer alteração, leia integralmente:

- `AGENTS.md`
- `docs/PROJETO_MESTRE.md`
- `docs/REFERENCIAS_VISUAIS.md`
- `docs/CONTINUIDADE_CHATGPT.md`
- `CHECKLIST_FINAL.md`
- `docs/ARQUITETURA.md`
- `docs/KINGHOST_DEPLOY.md`

Esses arquivos são a fonte oficial do projeto. Não reconstrua requisitos por memória.

Depois verifique o estado real do GitHub: branch `main`, outras branches, PRs e GitHub Actions.

O último marco confirmado é: PR #3 (`feat: operação funcional de clientes e abertura/visualização de OS`) mergeada em 01/09/2026 após CI totalmente verde para backend e frontend. Merge commit da Etapa 2: `a721049d168982ebf553152aacabf18d0da1aa7e`.

Clientes, ViaCEP, abertura/listagem/visualização inicial de OS, Bancada/Externo, checklist de entrada e fotos privadas até 100 KB já possuem fluxo funcional inicial. Continue pelas pendências reais de `CHECKLIST_FINAL.md` e `docs/PROJETO_MESTRE.md` sem refazer a base.

Explique tudo em linguagem simples e diga passo a passo onde clicar quando houver ação manual.

Não faça merge se algum check estiver vermelho.

---

## Como usar este arquivo

Se esta conversa travar ou atingir limite:

1. abrir um chat novo;
2. colar o prompt acima;
3. o novo chat lê os arquivos indicados no GitHub;
4. se precisar comparar imagens antigas, anexá-las novamente;
5. continuar a partir do estado real do repositório.
