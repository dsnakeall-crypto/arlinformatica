# Pós-Venda: seleção e exclusão de cards em lote

O menu de três pontos de cada card possui **Marcar card** e **Desmarcar card**. Ao marcar o primeiro, os cards passam a exibir caixas de seleção e uma barra informa a quantidade marcada, com **Limpar seleção** e **Excluir selecionados**.

A busca não apaga a seleção: cards marcados que ficam ocultos pelo filtro continuam selecionados. Antes de excluir, a confirmação lista todas as OS selecionadas e seus clientes. Cancelar mantém a seleção e não envia uma operação ao servidor.

A exclusão individual continua disponível. Tanto individualmente quanto em lote, excluir significa arquivar o ciclo de Pós-Venda, preservar OS, documentos e ações/mensagens históricas, resolver notificações e registrar auditoria por card. A regra existente de exclusão manual por 35 dias permanece igual. Não há novas migrations ou mudanças no Financeiro.

O endpoint `POST /api/post-sales/bulk-delete` recebe `ids`, exige a sessão autenticada e o CSRF já usados nas demais ações. A seleção deve conter de 1 a 500 IDs inteiros positivos e distintos. A permissão é a mesma da exclusão individual atual.

O servidor bloqueia os ciclos selecionados em ordem de ID dentro de uma transação. Se qualquer card já não estiver ativo ou não existir, retorna 409 e não exclui nenhum dos outros. A exclusão reutiliza a ação individual; alterações de ciclos, auditoria e notificações são confirmadas juntas ou revertidas juntas.

## Backup anterior à alteração

Backup local verificado em `C:\Users\Allan\ARL-backups\20261002-pos-venda-004128`:

- `historico.bundle`: histórico e referências Git completos, verificados com `git bundle verify`.
- `workspace-antes.tar.gz`: estado anterior dos arquivos, incluindo alterações não commitadas; arquivo listado com sucesso (1133 entradas).
- `git-status-antes.txt`: arquivos modificados e não rastreados antes desta tarefa.

SHA-256 do TAR: `371a0c933b4610233c218784eec9baa2de6dcbf4ea6a8a88db5b60179672f3d3`.

O backup fica fora do repositório e pode conter dados e configurações privados. Não publicar nem anexar o arquivo a uma PR. Dependências e artefatos descartáveis foram excluídos; podem ser reconstruídos pelos locks. Para voltar, extrair o TAR em uma pasta separada, conferir os arquivos desejados e restaurá-los após proteger também o estado atual. Não sobrescrever banco ou alterações posteriores sem revisão.

A regra de criar e verificar backup antes de editar está registrada em `AGENTS.md`. Uma publicação exige também um backup novo do banco e dos arquivos privados da produção.

## Validação

- Suíte PHP completa: 206 testes e 1703 asserções aprovados, incluindo arquivamento de 10 cards, preservação dos registros, validação de IDs e rejeição integral de lote com card indisponível.
- Frontend: lint, TypeScript, build e 12 testes unitários aprovados. Pint aprovado.
- Playwright: os dez cenários existentes do fluxo operacional e a navegação do Pós-Venda passaram. O novo cenário real criou onze OS de clientes distintos, marcou dez, conferiu busca e cancelamento, excluiu uma vez e confirmou OS/PDFs preservados e o card não selecionado disponível.
- Capturas Web/PC em 1280px e 1180px inspecionadas. O Pós-Venda pertence ao layout Web/PC; não foi adicionada uma página ao layout Mobile dedicado.
- CI remota/publicação ainda pendentes para esta alteração. Banco e dados reais da produção não foram modificados nesta tarefa.
