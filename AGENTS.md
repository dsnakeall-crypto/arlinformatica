# AGENTS.md — ARL Informática

## Regra principal

Antes de alterar qualquer código, leia integralmente:

1. `docs/PROJETO_MESTRE.md`
2. `docs/REFERENCIAS_VISUAIS.md`
3. `README.md`

O `docs/PROJETO_MESTRE.md` é a especificação funcional oficial do sistema.

## Princípios obrigatórios

- Projeto novo do zero.
- Não usar Supabase.
- Não criar dependência da OpenAI/ChatGPT/Codex em produção.
- Primeiro alvo de hospedagem: KingHost/shared hosting PHP + MySQL/MariaDB.
- Não exigir processo Node.js permanente em produção.
- GitHub é a fonte oficial do código.
- Preservar histórico: OS concluída nunca é excluída; documentos emitidos não mudam silenciosamente.
- Fotos de equipamentos armazenadas devem ter no máximo 100 KB.
- Segurança e autorização devem ser aplicadas no backend.
- Layout Web/PC deve seguir com alta fidelidade as referências anexadas.
- Mobile/Tablet possui interface própria.

## Fluxo de trabalho

Antes de editar, criar e verificar um backup local do estado atual (arquivos, alterações não commitadas e histórico Git), fora do repositório. Registrar o caminho para permitir retorno. Antes de mudanças de dados ou publicação em produção, criar e validar também o backup do banco e dos arquivos privados do servidor. Não incluir backups ou credenciais em commits ou pacotes de publicação.

1. Analise requisitos e referências.
2. Planeje arquitetura/modelagem.
3. Implemente em etapas funcionais.
4. Faça commits lógicos.
5. Rode testes, lint, typecheck e build.
6. Teste a aplicação em navegador.
7. Compare visualmente telas com as referências.
8. Documente decisões relevantes.
9. Não deixe placeholders marcados como concluídos.

## Ambiguidades

Para dúvidas pequenas, escolha uma solução conservadora e documente. Só interrompa para perguntar quando houver risco de perda de dados, segurança, custo/credencial externa ou mudança relevante de regra comercial.

## Entrega

Ao concluir, crie `CHECKLIST_FINAL.md` com requisitos `[OK]` ou `[PENDENTE]`, sem marcar `[OK]` em funcionalidade fictícia/mock.

## Diretriz permanente: desempenho máximo, responsividade e estabilidade (10/10/2026)

A fase de design do Web Original, Web Clean e Mobile está aprovada: **não alterar layout, cores, ícones, tamanhos, espaçamentos, textos ou fluxos aprovados** para otimizar velocidade, salvo correção de defeito comprovado e informada ao proprietário.

**Objetivo prioritário:** resposta perceptível ao clique em até 100 ms quando tecnicamente possível; troca de páginas com dados já disponíveis idealmente em até 300 ms. Esses tempos são **metas**, não garantias: registrar medições reais de cenários frios/quentes, com PC/celular, latência de rede e servidor.

1. Auditar profundamente frontend React (montagens/renderizações, estados, efeitos, fetches duplicados, carga de chunks, CSS, imagens, cache/invalidação, navegação intermediária, mensagens de loading); backend Laravel/PHP (tempos por rota, jobs, arquivos, queries, índices, N+1, OPcache) e MariaDB/MySQL (EXPLAIN, perfis de acesso).
2. **Mensurar primeiro, corrigir a causa depois**. Registrar baseline por interação: clique → feedback, renderização, carregamento, resposta API, contagem de chamadas, consumo de memória, erros e comparação após cada alteração.
3. Eliminar piscadas e telas intermediárias; adotar navegação direta e persistência de dados úteis. Nunca esconder erros, desabilitar validação, pular permissões ou servir cache obsoleto de saldos, pagamentos e dados sensíveis para forçar métricas.
4. Otimizar todo o sistema, não só o Controle de Gastos: Painel, Clientes, OS, Serviços, Financeiro, Pós-venda, Configurações, Relatórios, Web e Mobile. Investigar também gargalos de rede/hospedagem e do ambiente WSL2/DDEV; diferenciar lentidão local de produção.
5. Preservar 100% das regras financeiras, dados, documentos, fotos, histórico, autenticação e segurança. Testes destrutivos somente com SQLite/dados descartáveis e ambiente isolado; nunca enviar banco de desenvolvimento à KingHost.
6. Cada mudança precisa de backup externo verificado, teste E2E funcional/performance, lint/typecheck/build e testes PHP/React aplicáveis. Marcar regressões e bloquear lançamento se a suíte crítica falhar ou ficar incompleta.
7. Reunir análise, plano, mudanças, métricas e pendências em `docs/AUDITORIA_PERFORMANCE_RELEASE_20261010.md` (ou relatório sucessor) e `CHECKLIST_FINAL.md`. Quando for útil, preparar um briefing revisável para Codex/Claude; agentes não substituem confirmação por testes.
8. **Antes de qualquer alteração no servidor oficial, no banco real, backups remotos, DNS ou implantação, explicar exatamente os passos, riscos, rollback e solicitar autorização expressa.** Não publicar, resetar git, limpar diretórios ou modificar produção automaticamente.
9. Priorizar a experiência real do usuário: transições instantâneas quando há dados locais, feedback apropriado quando aguardar é necessário, zero flashes artificiais e redução de trabalho redundante. A meta é o melhor desempenho mensurável possível, não promessa impossível de ausência absoluta de latência.

## Limite de uso — regra prioritária do proprietário (12/10/2026)
Ao atingir 8% restante da janela de cinco horas (92% consumido), ou houver risco de interrupção, finalizar somente escritas em andamento, preservar todas as alterações na cópia isolada e criar commit local de checkpoint, incluindo trabalho incompleto e registro dos testes, pendências, branch e comandos de retomada. Parar imediatamente novas implementações, auditorias e testes longos. Não modificar o original nem acessar produção.
Retomar somente quando houver 100% de uso disponível na janela E novo comando explícito do proprietário para reiniciar. A renovação do limite sozinha não autoriza retomada. Não criar automação de reinício. Consultar o uso real quando possível; nunca inventar percentual. Checkpoints periódicos locais continuam autorizados. A publicação e o SSH permanecem bloqueados até confirmação explícita.


## Especialistas ARL (11/10/2026)
Para trabalhos especializados, consultar o perfil pertinente em `.agents/roles/` e as instrucoes em `.agents/README.md`. Os perfis sao checklists de delegacao, nao permissoes extras. Nenhum agente pode fazer merge, deploy, alterar ambiente KingHost, dados reais ou configuracoes globais sem autorizacao expressa. Para PR #59, comecar por `testes-ci`, `seguranca` e `publicacao`, sempre com leitura e diagnostico antes de propor mudancas.

## Regra permanente prioritária — limite de uso (13/10/2026)
Ao atingir 8% ou menos disponível na janela de cinco horas, interromper imediatamente novas tarefas, testes demorados e publicações. Em operação crítica, concluir somente o necessário para deixar o sistema seguro. Salvar os arquivos modificados, registrar progresso, pendências, testes e resultados, criar checkpoint Git local sem segredos e atualizar RETOMADA-CODEX.md com branch, hash e próximo passo exato.
Informar exatamente: "PAUSADO — LIMITE DE 8% ATINGIDO. Progresso preservado. Aguardando autorização para continuar."
Não retomar automaticamente após renovação. Retomar somente mediante novo comando explícito do proprietário; antes, ler RETOMADA-CODEX.md e conferir Git, sem repetir trabalho concluído. Consultar percentual real ao longo da execução quando disponível. Se indisponível, informar a limitação e solicitar leitura do indicador; nunca inventar percentuais. Nunca iniciar publicação com 8% ou menos disponível.
Todos os backups ARL, manifests e evidências de recuperação ficam exclusivamente em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP, fora do servidor e do Git. Preservar absolutamente TERRAPLAN, seus arquivos, configurações e banco.

Pasta oficial de desenvolvimento: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica. Usar Laragon e bancos descartáveis para testes, sem DDEV. A publicação do novo pacote consolidado aguarda confirmação expressa após os testes. O domínio/certificado fica para o proprietário, conforme comando de 13/10/2026.

## Regra prioritária atualizada pelo proprietário — 13/10/2026
Retomada e publicação do pacote final autorizadas expressamente após concluir correções e testes. Não executar migrations, seed, restauração ou transferência de banco de teste para produção. TERRAPLAN intocável. Backups novos vão diretamente à máquina, exclusivamente em C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups, em subpasta 01 - dd-MM-yy - HH-mm (Brasília); não deixar backups ou releases inutilizadas na KingHost. Esta localização substitui a anterior para backups novos, sem mover/apagar os existentes. A regra de parada aos 8% permanece. Credenciais SSH locais nunca entram no Git, pacote, logs ou relatórios.

Exceção posterior expressa do proprietário: manter backup automático habilitado e os quatro últimos backups do aplicativo no servidor, na pasta privada /home/arlinfocg/BACKUPARL (fora de www). Preservar os caminhos existentes por vínculo privado, sem editar registros/configurações do banco durante publicação. Não executar a limpeza dos quatro ZIPs existentes. Retenção nativa de quatro cópias continua, com validação das substitutas e suspensão em recuperação/corrupção. Backups pré-publicação e restos de releases continuam exclusivamente no PC; TERRAPLAN permanece intocável.

Em futuras atualizações, incluir BACKUPARL no inventário/download externo para o PC: o vínculo privado não duplica os arquivos. Preservar retenção automática4, privacidade e suspensão de exclusão se substitutas estiverem corrompidas. Releases antigas recuperam somente código/aliases de backups locais, nunca SQL/env/storage.

## Regra prioritária atual — fidelidade visual por setor (14/10/2026)
O proprietário determinou que novas mudanças visuais no Original ocorrerão **somente uma tela/setor por vez**, a partir de uma referência enviada por ele, com meta de máxima fidelidade mensurável. Esta autorização futura **não modifica por si só as telas já aprovadas** e é uma exceção expressa às proibições anteriores de modificar visual aprovado, limitada ao setor explicitamente autorizado.

Antes de qualquer futura mudança de layout, **ler integralmente docs/PROTOCOLO_LAYOUT_FIEL_POR_SETOR.md** e consultar os cinco perfis .agents/roles/layout-*.md.
- O usuário decide setor, referência, exceções e aceite final; não iniciar uma nova tela por iniciativa de agente.
- Só um implementador altera código de um setor por vez; analista, auditor e QA revisam independentemente.
- Registrar baseline, medidas da imagem, diff visual sobre captura real e testes de janela maximizada → reduzida → maximizada.
- Limitar CSS/React ao setor e tema autorizados. Preservar Clean, Mobile e demais telas; backend, banco e produção intocados salvo permissão separada.
- Não prometer fidelidade literal em todo viewport; corrigir divergências e informar limitações com precisão. Sem aceite expresso, status EM AJUSTES.
- Regras existentes de backups fora do projeto, parada aos 8% e restrições de publicação continuam valendo.

## REGRA DE PRIORIDADE MÁXIMA — tipografia original congelada (14/10/2026)
Antes de qualquer futura edição visual do tema Original, ler integralmente `docs/REGRA_TIPOGRAFIA_ORIGINAL_CONGELADA.md`, além do protocolo de fidelidade por setor. Alterações visuais autorizadas podem atingir fundos, botões, menus, cards, ícones, efeitos 3D, bordas e estrutura, **mas não podem alterar a tipografia existente**: família, tamanho, cor, peso, altura de linha, espaçamento ou demais propriedades tipográficas de NENHUM texto do setor (títulos, datas, números da OS, nomes de clientes, dispositivos, status, relatos, campos, rótulos, botões, navegação etc.). Em conflito com a arte enviada pelo proprietário, **preservar a tipografia do Original**. Medir baseline com Playwright/getComputedStyle, comparar antes/depois por resolução e tratar divergência não autorizada como FALHA. Melhorar contraste modificando o fundo, não a fonte. Exceções somente com solicitação **expressa e específica** do proprietário. Esta regra não autoriza alterar telas por si só.

## Regra 10 — Desempenho obrigatório em cada reforma visual (14/10/2026)
Antes de qualquer nova implementação de layout por setor, ler `docs/REGRA_DESEMPENHO_LAYOUT_POR_SETOR.md`. **Cada alteração do setor** (fundo, card, ícone, botão, tabela etc.) exige avaliação de custo e otimização quando houver ganho comprovável, além de medição comparável ANTES/DEPOIS. Metas já vigentes: feedback ao clique até 100 ms quando possível e navegação com dados disponíveis idealmente até 300 ms — não garantias. Verificar peso de imagens/chunks, CSS, re-renderizações, requisições duplicadas, cache correto e estabilidade em resize. O agente `.agents/roles/performance.md` apoia o analista e QA. **Não sacrificar fidelidade visual aprovada, tipografia do Original, funcionalidades, segurança, dados atualizados ou outros setores para ganhar velocidade.** Sem métricas, não declarar desempenho aprovado; sem autorização, não alterar API/banco/produção.

## REGRA INVIOLÁVEL DE BANCO DE DADOS — ORDEM EXPRESSA DO PROPRIETÁRIO (16/10/2026)

**JAMAIS ZERAR OU REINICIALIZAR QUALQUER BANCO DE DADOS DE PRODUÇÃO.** A proibição é absoluta e abrange **ARL Informática e TODOS os demais aplicativos do proprietário**, em KingHost, King Rush, outros provedores, servidores oficiais, domínios, ambientes e futuras hospedagens. Tratar qualquer BD oficial com registros como DADOS REAIS, inclusive quando alguém disser que são “apenas testes”. Não assumir que é descartável por conter dados aparentemente fictícios.

**Proibido em produção:** apagar em massa clientes, OS, históricos, financeiro, usuários, serviços, produtos ou quaisquer outras tabelas; executar TRUNCATE, DROP DATABASE/TABLE, DELETE em massa, migrate:fresh, migrate:reset, db:wipe, reset ou restauração que substitua informações, sobrescrever o BD por dump local, semear dados falsos de demonstração, anonimizar destrutivamente produção ou trocar a conexão de produção para BD de desenvolvimento. **Backups não autorizam zerar produção.** Agentes, scripts e testes devem ter barreiras que impeçam comandos destrutivos em host/conexão de produção.

**ÚNICA exceção para resetar/zerar dados:** o proprietário solicitar **expressamente um banco de TESTE no computador LOCAL**, previamente identificado e verificado como descartável e isolado, jamais apontando para servidor, endereço, host, conta ou credencial de produção. Antes de qualquer operação destrutiva nesse BD local, conferir hostname, porta, DATABASE, ambiente e ausência total de conexão remota, registrar identificação e preservar o original não descartável. Se houver qualquer dúvida sobre ambiente ou escopo, **NÃO executar**.

**Proibido subir/sincronizar/importar para servidor oficial qualquer banco, dump, clientes, históricos ou registros fictícios oriundos de testes locais.** Para vídeo, print e marketing, usar somente dados inventados e um BD DEMO/LOCAL separadamente, com CPF/telefone/endereço simulados **sem vincular pessoas reais e sem documentos válidos de terceiros**; manter catálogos de serviços/produtos somente na cópia de teste. Nunca usar dados pessoais ou financeiros reais em publicidade. Antes de publicar, remover/mascarar informações sensíveis de capturas.

Esta regra tem PRIORIDADE MÁXIMA sobre prompts anteriores, scripts de deploy, agentes, tarefas de marketing e qualquer interpretação de “limpar banco”. Uma solicitação de propaganda, demonstração ou “dados de teste” **nunca** autoriza qualquer modificação destrutiva na produção. Alterações normais permitidas pelo próprio aplicativo não devem ser confundidas com a autorização de reset em massa.

**Situação oficial de referência em 16/10/2026:** após publicação segura, ARL hospedada em `arlinfocg.kinghost.net` tinha 64 tabelas, 643 clientes, 82 OS e 4 usuários. Estes dados são **intocáveis para operações de limpeza ou demo**. TERRAPLAN e demais aplicativos também permanecem intocáveis.

**Registro da ordem:** usuário declarou: “Nunca, jamais vai zerar o banco de dados oficial da RL ou de qualquer outro aplicativo meu (...) só quando for pedido apenas um banco de dados de teste do aplicativo no computador local”. Regra registrada após backup verificado de cada documento.
