# Navegação e confirmação de chamado — 07/10/2026

## Alterações

Ao voltar de uma aba oculta, a identidade e o token CSRF são confirmados juntos em `GET /api/me`, com `Cache-Control: no-store, private`. Elimina a consulta anterior a `/session/csrf-token` seguida de `/api/me`. O token não entra no estado do usuário nem nas chaves/entradas de cache. Logout, expiração, troca de sessão, perfil e identidade continuam limpando a geração; listas ficam ocultas até confirmar a identidade. Não há repetição automática de operações de negócio.

O Painel passa a reutilizar somente a apresentação das listas de OS e o contador semanal, em memória por usuário/geração, por 15 segundos, com retenção de dois minutos sem uso. Retorno fresco não repete as duas consultas. No retorno vencido a apresentação permanece enquanto a consulta atualiza. Alterações de OS/clientes invalidam o Painel; respostas obsoletas e consultas de telas desmontadas são descartadas. Saldos, pagamentos, senhas, fotos e detalhes completos não são armazenados. Financeiro, Fornecedores e Controle de Gasto não recebem cache novo. Não se promete eliminar latência de rede/hospedagem nem recargas completas do navegador.

## Financeiro e diagnóstico ampliado

Após o relato de lentidão em todas as abas, principalmente Financeiro, foram verificadas dez rotas em produção por leitura dentro de transação revertida. Tempos internos nesta amostra: 18–191 ms; isso não representa o tempo total percebido no navegador. Uma amostra HTTPS pública ficou em aproximadamente 213–229 ms. Em cópia isolada, Painel, Financeiro, Fornecedores e Controle de Gasto não apresentaram ciclos de mutação/requestAnimationFrame durante a janela de um segundo em repouso. São amostras pontuais, não garantia de ausência de outros gargalos.

Financeiro abria com cinco GETs: overview (sem uso na tela), diário, a receber, mês atual e mês anterior. Agora abre apenas o mês atual. Diário e A Receber consultam ao abrir suas abas; mês anterior somente em Relatórios. Nenhum cache novo de saldos. As consultas usam AbortController e descartam respostas antigas ao trocar período, aba ou desmontar. A falha de uma seção não impede usar a navegação ou outra seção. Mutações atualizam o mês e somente os auxiliares abertos, sem repetir A Receber duas vezes. Indicadores ficam em carregamento/indisponível, sem apresentar zero como se fosse saldo confirmado.

Teste de navegador cobre contagem de chamadas, abas Diário/A Receber/Mensal/Relatórios e resposta de mês antigo deliberadamente atrasada. Onze testes de navegador do Financeiro/operação passaram em base isolada; 36 testes frontend, lint, typecheck e build também passaram. Evidências externas: production-latency-before.json, browser-idle-profile.json e e2e-finance.log. Não se atribui toda a lentidão ao banco nem se promete ganho percentual de tempo com base nessas amostras.

## Chamado existente

Selecionar cliente na Nova OS consulta `GET /api/clients/{client}/open-orders`, autenticado e sujeito às permissões atuais. Se houver OS operacional em aberto, mostra popup com número, status, data, equipamento e relato original, mantendo quebras de linha e escapando o texto pelo React. Cancelar/fechar não grava; Confirmar novo chamado autoriza continuar o formulário. Se o aviso surgir ao enviar, confirmar conclui aquele envio.

No POST, o backend bloqueia a linha do cliente na transação e confere os IDs de OS confirmados. Uma abertura concorrente ainda não confirmada retorna `409 / CLIENT_HAS_OPEN_ORDERS`, sem criar número, OS, itens/estoque, snapshot ou notificação. O formulário apresenta o aviso atualizado e exige nova confirmação. Chamados concluídos/interrompidos e excluídos logicamente não entram; OS reaberta entra. Não há limite de uma OS por cliente: o operador pode confirmar a abertura adicional. Nenhuma migration ou alteração de registros anteriores.

## Preservação e validação

Backup externo de arquivos, alterações e histórico Git verificado antes da edição: `C:/Users/Allan/ARL-backups/navigation-open-order-20261007-144055`. Alterações preexistentes, incluindo `vite.config.ts`, caches, arquivos privados e SQLs, ficam fora dos commits/pacotes.

Testes em cópia externa com SQLite/discos descartáveis. PHP CLI do Windows foi configurado apenas para esses processos com um `php.ini` externo para disponibilizar SQLite/GD; nenhuma configuração global ou `.env` real foi modificada. Suíte backend: 311 testes / 6.479 verificações. Frontend: 36 testes, lint, typecheck/build e Pint aprovados. Regressões de sessão/navegação, confirmação/cancelamento e visual desktop/mobile são executadas no Playwright sem retries. Testes de catálogo/estoque/senha que criam mais de uma OS para o mesmo cliente agora confirmam explicitamente os IDs anteriores; a criação de fixtures E2E também reconhece o novo contrato. O teste novo de popup usa o formulário real e não esse atalho.

## Publicação autorizada

O proprietário autorizou a publicação após as correções. Exige CI aprovada para o commit exato, pacote de fonte oficial, backup atual de banco/privados validado, conferência de migrations, preservação byte a byte do `.env`, armazenamento compartilhado e rollback. Não há SQL, seed ou migration a executar. Evidências finais de CI/servidor/rollback ficam no relatório externo da publicação, evitando alterar o commit já validado apenas para registrar resultados.
