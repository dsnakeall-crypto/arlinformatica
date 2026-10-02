# Ficha de edição e envio de orçamento — 02/10/2026

Atualização visual: a edição agora abre em um popup sobre a ficha da OS, conforme as novas referências 3D enviadas pelo usuário. Os campos existentes foram agrupados em Equipamento e acesso e Relato e condição de entrada. Datas/atendimento permanecem no topo. Cancelamento com rascunho, senha existente sem exposição, substituição explícita e preservação do Termo emitido seguem as regras anteriores.

O formulário de orçamento mantém diagnóstico, proposta, validade, busca/itens, quantidade, preço, observação e total. O visual foi reconstruído com cabeçalho preto/vermelho, circuitos decorativos em SVG, superfícies brancas com relevos, cinco blocos e rodapé acessível durante a rolagem. A decoração é feita em CSS/SVG; não usa uma imagem estática no lugar dos campos.

Depois de salvar e gerar o PDF, aparece a oferta de enviar ao cliente. Enviar Orçamento abre uma nova conversa do WhatsApp com a mensagem definida no Projeto Mestre, o nome do cadastro atual do cliente e o link da revisão escolhida. O sistema não envia mensagens pela API do WhatsApp. Confirmar Mensagem enviada registra o orçamento em rascunho como enviado; reenvio não desfaz uma aprovação/recusa. Janela bloqueada oferece Abrir WhatsApp, sem marcar envio automaticamente.

A lista oferece os três controles compactos pedidos: Enviar Orçamento, Baixar PDF e Excluir Orçamento. A exclusão mantém a confirmação/permissões e bloqueia orçamento de OS fechada ou usado na finalização. Resposta do cliente usa um seletor enquanto o orçamento está enviado e aguarda decisão, conservando aprovação/recusa sem acrescentar botões principais. Depois da decisão, a seleção desaparece, preservando o comportamento anterior.

## Link do PDF

- POST autenticado com CSRF em `/api/orders/{order}/budgets/{revision}/share` valida orçamento não excluído, documento privado existente e telefone utilizável.
- `/share/budget/{token}` permite ao portador visualizar somente o PDF daquela revisão sem login. São 32 bytes aleatórios, com armazenamento apenas do SHA-256 e expiração em 30 dias. Há limite de requisições, headers privados/sem cache e bloqueio de indexação.
- Uma tabela própria `budget_share_tokens` evita misturar o compartilhamento de orçamento com os links de fechamento. A migration cria apenas essa tabela, sem mudar registros comerciais.
- Documento ausente, vínculo incompatível ou orçamento excluído invalidam o link. O prazo de acesso não amplia o prazo comercial do orçamento.
- Excluir preserva o PDF e seu snapshot para consulta histórica autenticada. O link público deixa de funcionar.
- `?download=1` na rota autenticada do PDF entrega attachment. A visualização inline existente continua disponível em outras telas.

## Backups e aplicação local

Antes da edição: `C:\Users\Allan\ARL-backups\ficha-orcamento-20261002-011216`, com código anterior em TAR, patch de alterações locais e status. O TAR foi listado (392 entradas), SHA-256 `329a9f1206ea7235bf32183ec5d306d29fb5db2a59a551a835b21c377be0566f`.

Antes da migration local: backup protegido #5 do serviço existente, cópia `banco-e-arquivos-antes-da-migracao.zip` na mesma pasta. ZIP/manifesto/checksums validados; 19.175.540 bytes, SHA-256 `5f3dcd9598a1c0db1449897a64a2787ea8a93d1b73235f85755481d181e99e5d`. Esses arquivos contêm dados privados e ficam fora do Git.

Aplicada apenas `2026_10_02_020000_create_budget_share_tokens_table` no MySQL local `arl_informatica`, após conferir driver/nome do banco. Os testes de navegador usam SQLite descartável; a suíte PHP usa SQLite em memória. Produção não foi alterada nesta tarefa.

Para retorno do layout, proteger o estado atual e recuperar os arquivos anteriores do TAR em uma pasta separada. A tabela aditiva pode permanecer sem uso; não executar rollback global de migrations ou restaurar todo o banco para desfazer somente o visual. Publicação exigirá backup novo da produção, migration, build e os passos usuais de release.

## Validação

- 212 testes PHP / 1774 asserções, incluindo mensagem, hash/expiração, autorização, arquivo inexistente, revisão incompatível, exclusão sem destruir PDF e download attachment.
- 12 testes frontend, ESLint, TypeScript, Pint e build aprovados.
- 15 cenários E2E relacionados passaram: novo fluxo de compartilhamento real com PDF acessível sem sessão, mensagem/telefone, download, confirmação, aprovação e popup bloqueado; 10 cenários operacionais até conclusão/pós-venda; 4 de edição/navegação. Uma repetição do novo cenário conferiu também rodapé em 720px.
- Capturas em `output/ficha-orcamento`: ficha-edicao.png, modal-orcamento.png, modal-orcamento-720.png e acoes-orcamento.png. Mensagens WhatsApp foram interceptadas no navegador de teste, sem enviar nada a clientes reais.
- CI remota/merge/publicação ainda pendentes.

## Revisão antes de concluir

Foi criado um snapshot adicional dos arquivos alterados em `antes-da-revisao`, dentro da pasta de backup acima. A revisão manteve o seletor apenas no estado enviado, para não introduzir uma nova alteração de aprovação já registrada. A resposta que contém o token usa no-store/private e o PDF público usa Referrer-Policy no-referrer. A rota de criação aceita apenas revisão numérica.

Os testes adicionais validam rejeição real 419 sem CSRF no endpoint novo, vínculo com outra OS/tipo de documento, preservação da aprovação no reenvio e ausência do seletor depois da decisão. Reexecução da suíte PHP: 212 testes / 1774 asserções. Banco local conferido: 596 clientes, 16 OS e nenhum token de teste; os cenários de navegador não escrevem no MySQL real.

## Nova reconstrução dos popups 3D

Referências recebidas em 02/10/2026: ficha com dois blocos lado a lado e orçamento com cinco blocos empilhados. Ambos mantêm todos os controles reais e as regras comerciais anteriores. Entrada e saída são informativas; apenas o atendimento é editável nessa faixa. O total continua disponível quando existem itens no orçamento. Em telas menores os blocos da edição passam para uma coluna e o conteúdo rola sem ocultar as ações do rodapé.

`OrderPopup` monta o diálogo no corpo da página, bloqueia a rolagem do fundo, mantém o foco no diálogo e restaura o foco ao fechar. Escape usa o mesmo cancelamento com proteção de rascunho da edição. O seletor de catálogo permanece sobre o orçamento. Os estilos novos estão isolados em `resources/css/order-popup.css`.

O backup original `ficha-orcamento-20261002-011216` foi mantido. Antes desta reconstrução foi criado `C:\Users\Allan\ARL-backups\popups-3d-20261002-073026`, contendo TAR do commit anterior, patch/status, referências e bundle do histórico completo. SHA-256 do TAR: `9c054c9fffc99e58da78f8eadd79464a5fb170929adc780e6e30ea061e7a2995`. Nenhuma migration ou alteração de dados comerciais pertence a esta reconstrução visual.

Capturas reais: `output/popups-3d/ficha-referencia.png` e `output/popups-3d/orcamento-referencia.png`, inspecionadas em comparação com as referências.

Validação desta reconstrução: PHP 212 testes / 1774 asserções; 12 unitários frontend, ESLint, Pint, TypeScript e build passaram. A suíte geral Playwright executou 105 cenários: 99 passaram, um identificou o raio de borda ausente no resultado da busca e cinco dependentes ficaram bloqueados. Corrigido o estilo, a repetição completa do fluxo operacional e do compartilhamento passou nos 11 cenários (incluindo o que falhou e os cinco dependentes). Assim todos os 105 cenários foram cobertos com sucesso entre as execuções. A repetição acrescentou verificações de foco, Escape e geometria em 390px; capturas desktop/mobile inspecionadas. Logs em `output/diagnostico/popups-3d-*.log`. CI remota e publicação continuam pendentes.
