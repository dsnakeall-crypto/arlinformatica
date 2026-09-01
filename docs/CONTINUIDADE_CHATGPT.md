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

### PR #4 — Etapa 3: configurações, documentos, orçamento e garantia

PR: `feat: configurações, identidade visual, documentos e orçamentos (Etapa 3)`.

Implementado e incorporado à `main`:

- central de Configurações em cards;
- dados persistentes da empresa;
- identidade visual com upload privado de logomarca;
- geração de seis variantes proporcionais da logo em WebP;
- textos configuráveis de documentos e termo;
- infraestrutura reutilizável de documentos A4 com Dompdf;
- armazenamento privado de PDFs com checksum SHA-256;
- snapshots para preservação histórica;
- termo da OS preservado historicamente;
- orçamento dentro da OS;
- revisões imutáveis de orçamento;
- cálculo financeiro em centavos;
- garantia opcional por item em dias, meses ou anos;
- snapshot da garantia;
- registro auditável de envio, aprovação e recusa;
- testes automatizados em `tests/Feature/StageThreeTest.php`.

Durante a estabilização da PR #4 foram corrigidos diretamente na branch, sem novo consumo do Codex:

- formatação PHP exigida pelo Pint;
- tipagem do `useEffect` no frontend;
- fixture PNG inválida no teste de variantes da logomarca.

Depois das correções, a CI da PR #4 passou completamente para backend e frontend. A PR foi mergeada em 01/09/2026 e a execução da CI na própria `main` após o merge também terminou com sucesso.

Merge commit da Etapa 3 na `main`: `6299c6d17fd2160538d147986e9c5f9ae37bec3d`.

### PR #5 — Etapa 4: finalização, PDF final e laudos técnicos

PR: `feat: finalização de OS, PDF final A4 e módulo de laudos técnicos`.

Implementado e incorporado à `main`:

- bloqueio da conclusão direta da OS, exigindo fluxo obrigatório de finalização;
- finalização transacional com resultado estruturado, laudo condicional, itens, desconto, total, garantias, snapshots e auditoria;
- cópia idempotente de itens do orçamento aprovado;
- PDF final A4 privado, histórico e imutável, inclusive em finalização sem reparo e total zero;
- fotos incorporadas ao PDF, checksum SHA-256 e histórico em `generated_documents`;
- modelos editáveis de laudos técnicos, rascunho/emissão e revisões imutáveis;
- laudo de dano elétrico com conclusão escolhida obrigatoriamente pelo técnico;
- PDFs timbrados de laudo com fotos e responsabilidade técnica explícita;
- interface da OS com Finalização, Laudos e Documentos, incluindo visualizar, imprimir e baixar;
- testes automatizados em `tests/Feature/StageFourTest.php`.

Durante a estabilização da PR #5 foram corrigidos diretamente na branch, sem novo consumo do Codex:

- formatação exigida pelo Pint em controllers;
- importação PHP não utilizada;
- tipagem/`useEffect` no frontend;
- workflow temporário de correção removido antes do merge.

A CI da PR #5 passou integralmente antes do merge. A PR foi mergeada em 01/09/2026 e a CI da `main` no merge também passou integralmente: Composer, migrations + seed, Pint, testes PHP, `npm ci`, TypeScript/typecheck e build.

Merge commit da Etapa 4 na `main`: `3d15295240692f7bbfbb40c512468385c704f81f`.

## Estado atual do sistema

A `main` está estável e com CI verde no marco da Etapa 4.

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
- snapshots e histórico de status;
- regra estrutural de não excluir OS;
- Bancada/Atendimento Externo;
- checklist de entrada com regra 100% OK;
- fotos privadas ligadas à OS e otimizadas para até 100 KB;
- catálogos básicos necessários à abertura da OS;
- visualização inicial da OS;
- central de Configurações com Dados da Empresa, Identidade Visual, Documentos, Layout e Laudos;
- logo privada em seis variantes proporcionais;
- termo e orçamento A4 privados gerados com Dompdf;
- documentos com snapshot, checksum e preservação histórica;
- orçamento dentro da OS com revisões, aprovação/recusa e garantia opcional por item;
- finalização obrigatória da OS com resultado, valores, snapshots e auditoria;
- PDF final A4 privado e histórico;
- laudos técnicos configuráveis, inclusive dano elétrico com decisão humana;
- layout desktop/mobile operacional inicial;
- PWA manifest inicial;
- documentação de arquitetura e KingHost;
- CI funcional e verde para backend e frontend.

## Etapa 3 — Configurações, documentos, orçamento e garantia

Concluída e mergeada pela PR #4 a partir da branch `codex/implementar-tela-de-configuracoes`.

A implementação inclui dados configuráveis da empresa; upload privado da logo com seis variantes sem deformação; central responsiva de Configurações; textos configuráveis do termo; infraestrutura Dompdf privada com snapshot e SHA-256; termo da OS; orçamento A4 com revisões; cálculo em centavos; garantia opcional em dias, meses ou anos; e registro auditável de envio, aprovação ou recusa. Documentos emitidos preservam empresa, logo, texto e dados usados.

A validação final foi feita no GitHub Actions. Antes do merge, backend e frontend ficaram verdes; após o merge, a CI da `main` também passou integralmente.

## Etapa 4 — finalização, PDF final e laudos técnicos

Concluída e mergeada pela PR #5 a partir da branch `codex/implementar-finalizacao-da-os-e-pdf`.

O backend impede conclusão direta; a finalização transacional registra resultado, relato, itens, preços, desconto, total, garantia, usuário/data e snapshots; orçamento aprovado pode originar os itens uma única vez. A emissão cria PDF final privado e imutável, inclusive sem reparo e total zero, com checksum, snapshot, fotos incorporadas e histórico em `generated_documents`.

Também foram implementados modelos iniciais editáveis de laudo, criação/edição/duplicação/ativação, laudos em rascunho e revisões emitidas imutáveis, PDF timbrado com fotos e fluxo específico de dano elétrico. A conclusão elétrica é sempre uma seleção humana obrigatória; o sistema não atribui responsabilidade a concessionária ou terceiro. A página da OS organiza Termo, Orçamentos, PDF Final e Laudos com ações de visualização, impressão e download, inclusive em layout mobile.

Testes da Etapa 4 cobrem bloqueio da conclusão direta, reparo e não reparo, valores, orçamento aprovado, snapshots de catálogo/garantia, PDF, laudos/revisões, dano elétrico e proibição de exclusão da OS.

## Próxima etapa prioritária — Etapa 5: Pagamento e Financeiro

A próxima etapa deve seguir as seções 30 a 33 do `docs/PROJETO_MESTRE.md` e os itens pendentes do `CHECKLIST_FINAL.md`.

Escopo prioritário:

- pagamento separado do status operacional da OS;
- formas Pix, Dinheiro, Débito, Crédito, Transferência e Outro;
- registro de OS, valor, forma, data/hora e usuário, com proteção contra duplicidade;
- Financeiro com Visão Geral, Caixa Diário, Movimentações, Mensal e Relatórios;
- caixa diário automático de 00:00:00 a 23:59:59 em `America/Sao_Paulo`, usando transações como fonte da verdade;
- Entrada Rápida com somente valor obrigatório e origem `Serviço rápido não cadastrado`;
- correções financeiras auditáveis por Admin/Master, sem apagar silenciosamente;
- fechamento mensal com total de OS, Entrada Rápida, ticket médio, descontos, formas de pagamento, serviços/produtos e totais;
- PDF `RELATÓRIO FINANCEIRO — MÊS/ANO`;
- testes de pagamento, Entrada Rápida, caixa diário, visão mensal, correções e relatório financeiro;
- interface desktop/mobile ligada ao backend real, com estados de carregamento, erro e vazio.

Não incluir Pós-Venda, Web Push, Backup/Restore ou administração completa de usuários nesta etapa, salvo dependência técnica mínima necessária.

## Pendências principais para as próximas etapas

Consultar sempre `CHECKLIST_FINAL.md` e `docs/PROJETO_MESTRE.md` antes de implementar.

Entre as principais pendências reais após a Etapa 4:

- pagamento, Entrada Rápida, correções auditáveis, caixa diário, visão mensal e relatório financeiro;
- telas administrativas completas de Serviços, fabricantes, equipamentos e templates de checklist;
- edição de cliente pela interface;
- observação livre/`Outro` no checklist quando previsto;
- WhatsApp e Google Maps;
- pós-venda com confirmação, lembrete de 5 dias e novo ciclo após 60 dias;
- central interna de notificações, Web Push, service worker/offline e catch-up;
- backup/restore executável, limpeza segura de fotos, armazenamento e diagnóstico;
- administração completa de usuários/permissões;
- policies completas e recuperação de senha;
- comparação visual final com as referências;
- testes E2E Playwright e testes funcionais finais do Projeto Mestre.

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

O último marco confirmado é a PR #5 (`feat: finalização de OS, PDF final A4 e módulo de laudos técnicos`), mergeada em 01/09/2026 após CI totalmente verde para backend e frontend. A CI da `main` após o merge também passou integralmente. Merge commit da Etapa 4: `3d15295240692f7bbfbb40c512468385c704f81f`.

Clientes, ViaCEP, abertura/listagem/visualização de OS, Bancada/Externo, checklist de entrada, fotos privadas até 100 KB, Configurações, identidade visual, termo/PDF, orçamento com revisões e garantia por item, finalização da OS, PDF final e laudos técnicos já possuem fluxo funcional inicial.

A próxima prioridade é a Etapa 5 — Pagamento e Financeiro, conforme seções 30 a 33 do `docs/PROJETO_MESTRE.md` e `CHECKLIST_FINAL.md`: pagamento separado do status, Entrada Rápida, caixa diário automático, movimentações, visão mensal, correções auditáveis e relatório financeiro em PDF.

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
