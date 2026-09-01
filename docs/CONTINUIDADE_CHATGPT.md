# Continuidade do projeto ARL Informática no ChatGPT

Este arquivo existe para permitir continuar o projeto em outro chat sem depender do histórico completo da conversa anterior.

## Fonte oficial do projeto

Repositório privado GitHub:

`dsnakeall-crypto/arlinformatica`

Branch principal:

`main`

O GitHub é a fonte oficial do código e da documentação do projeto.

## Arquivos que um novo chat DEVE ler primeiro

1. `AGENTS.md`
2. `docs/PROJETO_MESTRE.md`
3. `docs/REFERENCIAS_VISUAIS.md`
4. `CHECKLIST_FINAL.md`
5. `docs/ARQUITETURA.md`
6. `docs/KINGHOST_DEPLOY.md`
7. este arquivo `docs/CONTINUIDADE_CHATGPT.md`

`docs/PROJETO_MESTRE.md` contém a especificação funcional completa decidida com o usuário. Não reinventar requisitos a partir de memória do modelo: ler o documento.

## Objetivo central

Criar do zero o sistema completo ARL Informática para gestão de assistência técnica, independente de ChatGPT/Codex/Supabase em produção, preparado para hospedagem própria, especialmente KingHost/shared hosting PHP + MySQL/MariaDB, mas portátil para outros provedores.

Arquitetura escolhida:

- Laravel/PHP 8.x no backend.
- MySQL/MariaDB em produção.
- React + TypeScript + Vite no frontend.
- Sem processo Node permanente em produção.
- PDFs compatíveis com shared hosting, atualmente usando base Dompdf.
- Fotos privadas e otimizadas para no máximo 100 KB.
- PWA/mobile próprio.
- GitHub como fonte oficial do código.

## Decisões funcionais importantes já confirmadas

O projeto mestre detalha tudo, mas estes pontos são especialmente importantes:

- Perfis Master, Administrador e Funcionário, com autorização real no backend.
- Painel sem faturamento em destaque; foco em OS abertas e concluídas.
- Clientes com nome/razão social, CPF/CNPJ, telefone e endereço; sem e-mail/data de nascimento obrigatórios.
- CPF/CNPJ normalizado, validado e sem duplicidade.
- CEP com consulta automática e fallback manual.
- Um único catálogo chamado Serviços, podendo classificar item como serviço ou produto.
- Garantia contratual adicional configurável por item e snapshot por OS.
- Tipos de atendimento: Análise na Bancada e Atendimento Externo, sem gerar valor financeiro automaticamente.
- Checklist de entrada em accordion: se nada for marcado, considerar automaticamente 100% OK; se houver avaria, registrar no PDF e mensagem de WhatsApp.
- Fotos de equipamentos: máximo 100 KB; nunca guardar original gigante.
- Exclusão de fotos nunca pode excluir OS, PDFs, laudos, clientes ou histórico.
- OS concluída nunca é excluída fisicamente no fluxo normal.
- Snapshots preservam dados históricos de cliente, preços, logo, garantia, termo, checklist etc.
- Termo de recebimento/retirada gerado na abertura da OS e texto editável em Configurações.
- WhatsApp padrão funciona por mensagem pré-preenchida; não afirmar envio sem confirmação real.
- Google Maps clicável pelo endereço.
- Orçamentos dentro da OS, com PDF timbrado, versões e aprovação/recusa.
- Laudos técnicos configuráveis, inclusive dano elétrico, mas o sistema nunca determina sozinho a causa técnica.
- Finalização da OS permite reparo realizado, sem reparo, cancelamento, inviável, sem defeito etc.
- PDF final A4 preservado como documento histórico.
- Pagamento é separado do status operacional da OS.
- Financeiro com caixa diário automático, entrada rápida, visão mensal e relatórios.
- Pós-venda simplificado com três ações: confirmar se está tudo certo, pedir avaliação Google e convidar para Instagram.
- Ações de pós-venda ficam desativadas após confirmação de envio; lembrete após 5 dias e novo ciclo depois de 60 dias conforme Projeto Mestre.
- Central de notificações e PWA/Web Push quando navegador permitir.
- Layout Web/PC segue referências anexadas; Mobile/Tablet terá interface própria.
- Configurações em cards por categoria.
- Backup completo de dados/documentos/fotos + manifesto; código é versionado no GitHub.
- Preparar documentação de hospedagem/migração para KingHost.

Links padrão definidos:

Instagram:
`https://www.instagram.com/allanluttembarck`

Google Review:
`https://g.page/r/CSxkz5Y88MaJEBM/review`

## Referências visuais

As imagens de referência foram anexadas nas tarefas/conversa e são mapeadas em `docs/REFERENCIAS_VISUAIS.md`:

- painel/menu;
- clientes;
- Nova OS;
- seletor de status;
- PDF final A4;
- inspiração do Pós-Venda;
- TIMBRADO.png para orçamento e laudos;
- logo ARL separada, quando fornecida.

Se um novo chat precisar trabalhar na fidelidade visual e não tiver acesso aos anexos antigos, pedir ao usuário para anexá-los novamente. Não inventar visual diferente do que já foi aprovado.

## Histórico técnico até 01/09/2026

O projeto inicialmente foi tentado localmente/Codex Desktop e depois reiniciado do zero com GitHub + Codex Cloud para evitar dependência de arquivos apenas no PC.

Foi criado o repositório privado `dsnakeall-crypto/arlinformatica`.

A especificação mestre foi colocada no próprio repositório para evitar prompts gigantes no Codex Cloud.

O Codex Cloud criou a primeira fundação na branch:

`codex/iniciar-projeto-arl-informatica-do-zero`

A PR #1 foi aberta com a base Laravel/React, schema inicial, APIs básicas, documentação e shell visual.

Durante a primeira PR, a CI inicialmente falhou porque:

- faltavam lockfiles;
- o ambiente do Codex Cloud recebia HTTP 403 do Packagist/npm;
- havia problemas de formatação Laravel Pint.

Foi usado temporariamente GitHub Actions para gerar:

- `composer.lock`;
- `package-lock.json`;
- formatação com Laravel Pint.

O frontend passou `npm ci`, `typecheck` e `build`.

A PR #1 acabou sendo merged acidentalmente antes de o backend ficar verde. Isso não apaga o projeto; apenas significa que a correção de CI deve ser feita em PR separada antes de avançar novas funcionalidades.

PR #1 merged:

`feat: initialize ARL Informática — architecture, schema, core API and UI shell`

Merge commit conhecido:

`19da11941426d7565ac771998fe0c6e6be464d0d`

## Correção de CI em andamento no momento deste registro

Foi criada uma branch separada:

`fix/ci-backend-pint`

Motivo: corrigir os últimos erros de formatação do backend depois do merge prematuro da PR #1.

Foi criado um workflow temporário para rodar Pint de novo. Esse workflow concluiu com sucesso e gerou o commit:

`f5af11b2d79e93a86ba1b8fc9e59b82ee376bf01`

Mensagem:

`fix: finish Pint formatting and remove bootstrap workflow`

O workflow temporário também foi programado para se remover após concluir.

IMPORTANTE: o run de CI que aparecia vermelho antes dessa correção estava associado ao commit anterior `6ee20ca...`, portanto um novo chat deve verificar a CI atual do HEAD da branch `fix/ci-backend-pint`, abrir uma PR dessa branch para `main` se ainda não existir, e só fazer merge quando backend e frontend estiverem verdes.

## Estado funcional da primeira entrega

Consultar `CHECKLIST_FINAL.md` para o estado oficial.

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
- CI de PHP/frontend.

Ainda faltam muitas funcionalidades reais, conforme `CHECKLIST_FINAL.md`, incluindo entre outras:

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
- E2E.

## Regra de trabalho daqui para frente

Não fazer grandes alterações direto na `main`.

Fluxo recomendado:

1. Confirmar que a `main` está estável.
2. Para cada etapa relevante, criar branch nova.
3. Codex implementa nessa branch.
4. Abrir PR.
5. Esperar CI.
6. Se algum check falhar, corrigir antes do merge.
7. Só fazer merge com backend e frontend verdes.
8. Atualizar `CHECKLIST_FINAL.md` e este arquivo quando houver marco importante.

Nunca usar o botão de Merge apenas porque aparece "Able to merge"; isso só indica ausência de conflito de Git e não significa que testes passaram.

## Prompt pronto para continuar em um NOVO CHAT

Copiar e colar o texto abaixo no novo chat:

---

Estou continuando o projeto ARL Informática que já está no meu GitHub privado `dsnakeall-crypto/arlinformatica`.

Use o conector GitHub e LEIA ANTES DE QUALQUER ALTERAÇÃO:

- `AGENTS.md`
- `docs/PROJETO_MESTRE.md`
- `docs/REFERENCIAS_VISUAIS.md`
- `docs/CONTINUIDADE_CHATGPT.md`
- `CHECKLIST_FINAL.md`
- `docs/ARQUITETURA.md`
- `docs/KINGHOST_DEPLOY.md`

Não tente reconstruir os requisitos pela memória. Esses arquivos são a fonte oficial do projeto.

Depois verifique o estado atual do GitHub: branches, PRs e GitHub Actions.

O último ponto conhecido é uma correção de CI na branch `fix/ci-backend-pint`, criada depois que a PR #1 foi merged antes do backend ficar verde. Confirme o estado real atual antes de fazer qualquer merge ou nova implementação.

Quero continuar exatamente de onde paramos, mantendo todas as decisões do Projeto Mestre. Explique para mim em linguagem simples, pois sou leigo nessa parte, e me diga passo a passo o que devo clicar quando alguma ação manual for necessária.

Não faça merge se os checks estiverem vermelhos.

---

## Como usar este arquivo

Se esta conversa atual ficar muito longa, travar ou atingir limite:

1. abrir um chat novo;
2. colar o prompt acima;
3. o novo chat deve acessar o GitHub e ler os arquivos indicados;
4. se a etapa depender das imagens antigas, anexar novamente as referências visuais;
5. continuar a partir do estado real do repositório, não apenas do texto deste arquivo.

Assim, mesmo que o histórico deste chat não esteja disponível, o raciocínio principal, as regras do aplicativo e o estado técnico ficam preservados no próprio projeto.