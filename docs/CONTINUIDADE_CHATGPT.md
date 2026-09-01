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
- PDFs com base compatível com shared hosting/Dompdf;
- fotos privadas reduzidas para no máximo 100 KB;
- PWA/mobile próprio;
- GitHub como fonte oficial do código.

## Regras funcionais importantes já confirmadas

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

Instagram: `https://www.instagram.com/allanluttembarck`

Google Review: `https://g.page/r/CSxkz5Y88MaJEBM/review`

## Referências visuais

Mapeadas em `docs/REFERENCIAS_VISUAIS.md`:

- painel/menu;
- clientes;
- Nova OS;
- seletor de status;
- PDF final A4;
- Pós-Venda;
- TIMBRADO.png para orçamento e laudos;
- logo ARL separada, quando fornecida.

Se um novo chat precisar comparar visualmente e não tiver os anexos antigos, pedir ao usuário para anexá-los novamente.

## Histórico técnico resumido

O projeto foi reiniciado do zero usando GitHub + Codex Cloud para evitar dependência de arquivos somente no PC.

A PR #1 criou a fundação Laravel/React, schema inicial, APIs básicas, documentação e shell visual. Durante a PR #1 houve falhas de CI por lockfiles ausentes, bloqueio HTTP 403 do ambiente do Codex para Packagist/npm e problemas de formatação Pint. GitHub Actions foi usado para gerar `composer.lock`, `package-lock.json` e formatar a base.

A PR #1 foi mergeada antes do backend ficar verde. Merge commit: `19da11941426d7565ac771998fe0c6e6be464d0d`.

Depois foi criada a PR #2: `fix: corrigir CI do backend e remover workflow temporário`.

Na PR #2 foram corrigidos os últimos problemas de Pint, removido o workflow temporário e criado `tests/Feature/SmokeTest.php` para tornar válida a suíte PHPUnit Feature.

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

Merge commit atual da `main`: `ecc508815d191c455bac8989e4604b2b7db7f9a5`.

## Estado atual da fundação

A `main` está novamente estável após a correção da CI.

Já existem bases para:

- arquitetura Laravel/PHP + React/TypeScript;
- modelagem inicial extensa do banco;
- login/sessão e perfis iniciais;
- instalador CLI para primeiro Master;
- API inicial de clientes;
- validação CPF/CNPJ;
- API inicial de OS;
- número transacional de OS;
- snapshots iniciais;
- histórico de status;
- regra estrutural de não excluir OS;
- PhotoOptimizer com teto de 100 KB;
- shell visual desktop/mobile inicial;
- PWA manifest inicial;
- documentação de arquitetura e KingHost;
- CI funcional para backend e frontend.

Ainda faltam muitas funcionalidades reais, conforme `CHECKLIST_FINAL.md`, entre elas:

- ViaCEP;
- UI funcional ligada ao backend;
- CRUD completo de serviços/categorias/fabricantes/checklists;
- fotos ligadas à UI;
- WhatsApp/Maps;
- termos/PDFs;
- orçamento;
- laudos;
- garantias completas;
- conclusão de OS;
- pagamento/financeiro;
- pós-venda;
- notificações/Web Push;
- backup/restore;
- configurações completas;
- administração de usuários/permissões;
- comparação visual final;
- testes E2E.

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

## Marco da Etapa 2 — operação de clientes e OS

Na branch `feat/operacao-clientes-os`, a interface demonstrativa foi substituída pelo fluxo real de clientes e ordens de serviço. A entrega inclui cadastro/busca de clientes, ViaCEP com fallback manual, abertura transacional de OS, tipo Bancada/Externo, catálogos necessários, checklist por equipamento (nenhuma avaria = 100% OK), upload privado otimizado para até 100 KB, listagem responsiva e visualização com snapshot, fotos e histórico.

Permanecem pendentes nesta área: telas administrativas completas para editar/desativar catálogos e templates, edição de cliente pela interface, observação livre em "Outro", WhatsApp/Maps e E2E. Financeiro, pós-venda, laudos, PDFs finais e backup continuam deliberadamente fora desta etapa.

O ambiente Codex bloqueou os downloads do Composer com HTTP 403; a validação integral deve ser executada pelo GitHub Actions usando os lockfiles versionados.

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

O último marco confirmado é: PR #2 mergeada com CI verde para backend e frontend. A `main` está na fundação estável após as correções iniciais. Continue a implementação funcional a partir do `CHECKLIST_FINAL.md` e do `PROJETO_MESTRE.md`.

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
