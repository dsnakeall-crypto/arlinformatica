# Painel, desempenho e CI — missão de 20/10/2026

## Estado inicial e proteção

Branch `release/integracao-completa-20261018`, HEAD inicial `8280da1c799846e5c4b0cd120cc6f410ddb88088`. Preservados os 18 testes rastreados já modificados, documento de continuidade e arquivos não rastreados. Não houve acesso à KingHost, SSH, banco oficial ou TERRAPLAN. Push autorizado pelo proprietário somente após revisão e validação; deploy proibido nesta missão.

Backup anterior à edição: `C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 20-10-26 - 16-13/ARL-ANTES-PAINEL-PERFORMANCE-CI.tar.gz`, 5.220 entradas, SHA-256 `20240327c8278c9024d054f3b0fea613128fcfea2eaee0a704823380f87068b0`. TAR listado integralmente com sucesso, contém `.git/HEAD` e fonte do Painel; dependências regeneráveis vendor/node_modules e resultados temporários dos runners excluídos. Código, histórico, alterações locais, privados e demais arquivos incluídos. Recuperação deve extrair em pasta separada e comparar antes de restaurar qualquer arquivo.

Uso informado pelo proprietário ao iniciar: 100% disponível. Ferramenta não expõe indicador de consumo em tempo real; não inferir percentuais posteriores.

## Etapa 1 — alteração autorizada

Removidos do Dashboard a seção Fechadas recentemente, descrição, botão Ver finalizadas, divisor exclusivo, estado e renderização dos registros fechados. JSX/classes/textos dos quatro indicadores e da tabela Ordens em andamento preservados. Nenhum CSS alterado.

O rótulo Concluídos mantém a regra anterior: **completed e interrupted desde o início da semana em America/Sao_Paulo, excluindo soft deletes**, independentemente de pagamento ou arquivamento. Não equivale à aba Finalizadas. Novo GET autenticado `/api/orders/dashboard-summary` reutiliza `applyTabFilter('closed_week')` e executa COUNT, sem joins de pagamentos, hidratação ou relações. Endpoint de Mesa permanece inalterado. Cache continua por sessão, com abortamento e invalidação existentes.

Contrato E2E de status mantém criação, persistência, histórico, interrupção e pagamento; acrescenta classificação exclusiva em progress/awaiting_payment/finalized/interrupted e presença em all, além da ausência da seção removida. Novo E2E verifica contador e ausência do GET de registros fechados.

## Evidências iniciais

Navegador Chromium, localhost, SQLite descartável `database/e2e.sqlite`, privados separados pelo launcher E2E. Primeiro baseline usou PHP 8.4.25 do PATH; validações posteriores explicitam PHP 8.3.33 do Laragon. Não comparar diretamente runtime diferente como ganho de performance. Nenhum banco MySQL foi usado nesta medição.

Massa sintética inicial: uma OS aberta, três concluídas (uma paga e duas pendentes). Capturas e JSONs antes/depois na pasta externa do backup. Computed styles dos textos remanescentes dos indicadores/tabela idênticos em 1280, 1366 e 1920 px, com resize 1920→1366→1280→1920 na mesma sessão. Captura posterior de 1366 inspecionada visualmente.

| Medida | Antes | Depois | Limite |
|---|---:|---:|---|
| Corpo JSON semanal | 4.175 bytes | 20 bytes | Três fechadas; sem extrapolar para produção |
| Transferência registrada | 4.475 bytes | 320 bytes | Inclui overhead de resposta |
| Duração da chamada no browser | 406,6 ms | 956,6 ms | Uma amostra, concorrência/servidor embutido; não demonstra aceleração |

A redução de payload é comprovada; latência ainda precisa de série repetida e diagnóstico de runtime/filas. Não declarar metas de 100/300 ms atingidas com essas amostras.

Revisão independente estática confirmou escopo, contador, autenticação e cache. Apontou fixture `archived` fora de fillable; corrigida para forceFill/save e asserção de persistência.

Validação inicial: 8 testes PHP / 65 assertions em PHP 8.3.33 Laragon, SQLite em memória; Pint dos três arquivos PHP; 66 testes frontend; ESLint, typecheck e build aprovados. Build mantém avisos preexistentes de assets resolvidos em runtime. E2E direcionado em andamento; suíte integral, performance geral e CI ainda pendentes.

## Gates

- Etapa 1: seis cenários de status/histórico/pagamento aprovados. Primeiro E2E do agregado falhou por capturar resposta do documento anterior ao reload (Protocol error Network.getResponseBody); sincronização corrigida aguardando tabela inicial. Reteste do agregado e diagnóstico legado: dois aprovados em 14,2 s, sem retries/timeouts extras. Trace da falha preservado externamente.
- Etapa 2: diagnóstico amplo e otimizações ainda pendentes.
- Etapa 3: CI integral ainda não corrigida/verificada.
- Etapa 4: sem commit/push nesta anotação; não considerar missão concluída.
