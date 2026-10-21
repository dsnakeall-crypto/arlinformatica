# PROMPT PARA CODEX CLOUD — ARL INFORMÁTICA — CI INTEGRAL E2E

**Use o melhor modelo de programação/raciocínio disponível. Execute código, testes e correções, não apenas um plano. Trabalhe até os quatro jobs verdes ou registre precisamente os bloqueios. NÃO publique na KingHost.**

## 0 — Primeira regra: confira a versão que o Cloud consegue acessar

Repositório: dsnakeall-crypto/arlinformatica
Branch de referência: release/integracao-completa-20261018
Última conferência do PC (20/10/2026, 17h34–17h53, Brasília): HEAD LOCAL eae9f32, quatro commits adiante do remoto 8280da1, mais dezenas de arquivos E2E/documentos alterados SEM COMMIT.

**O Codex Cloud não enxerga automaticamente arquivos do Windows, logs externos nem alterações locais sem push.** Antes de editar, verifique SHA, branch, status, diff e commits disponíveis. O snapshot local completo deve ser transferido de forma segura para uma branch de integração/PR, com commits seletivos ou patch validado, preservando a árvore original e arquivos privados. Se só o remoto antigo estiver disponível, investigue as 65 falhas remotas, MAS NÃO alegue que corrigiu as 41 falhas da versão local; evite refazer mudanças já prontas e reconcilie as duas linhas antes de concluir.

Preserve os commits locais, se presentes:
- 7ce1e56 — remove Fechadas recentemente do Painel; novo agregado /api/orders/dashboard-summary.
- 2f732ae — otimiza navegação/lazy loading sem trocar o visual.
- d3ec46e — corrige testes antigos de Gastos, temas e navegação.
- eae9f32 — amplia teste das permissões do resumo do Painel.

## 1 — Leia e respeite o projeto

Leia integralmente AGENTS.md, docs/PROJETO_MESTRE.md, docs/CONTINUIDADE_CHATGPT.md, docs/CONTINUIDADE-ARL-20261020-NOVO-CHAT-CI-E2E.md, docs/CHECKPOINT-CI-E2E-65-FALHAS-20261020.md, docs/AUDITORIA_PAINEL_PERFORMANCE_CI_20261020.md, docs/MATRIZ_CI_E2E_20261020.md, docs/REFERENCIAS_VISUAIS.md e docs/KINGHOST_DEPLOY.md, além das regras de tipografia e desempenho. Se algum documento não estiver no repositório remoto, informe-o e peça a sincronização apropriada em vez de adivinhar conteúdo.

O ARL Informática é um sistema de assistência técnica: Laravel/PHP, React/TypeScript/Vite e MySQL/MariaDB; módulos Painel, Clientes, Ordens de Serviço, orçamento e PDFs, Serviços, Produtos, Fornecedores e Compras, Financeiro, Pós-venda, notificações, Configurações, usuários, backup, Controle de Gastos e Carros, despesas pessoais Allan/Carol/Casal. O frontend é responsivo e o Mobile Premium 3D possui navegação específica. Documentos/fotos/históricos são permanentes e privados; autorização é imposta também no backend.

NÃO altere o layout Premium 3D aprovado, tipografia do Original, cores, ícones, posições ou fluxos para fazer teste antigo passar. A única mudança visual autorizada recentemente já foi feita: remover a seção Fechadas recentemente do Painel Desktop. Não a recrie. Ordens seguem em Em Andamento, Aguardando PGTO, Finalizadas (pagas), Interrompidas e Todas. O contador semanal legado Concluídos inclui interrompidas, sem mudar a regra silenciosamente.

## 2 — O que realmente falhou

GitHub Actions run 39425236328 (SHA 8280da1):
- backend VERDE; backend-mysql VERDE; frontend VERDE; e2e VERMELHO com 65 falhas. iPhone/WebKit isolado passou.
- Suíte local integral posterior e INTERMEDIÁRIA: 312 testes, 271 PASS, 41 FAIL (nove por timeout). Vários testes foram modificados depois dessa execução; números não representam o snapshot final.
- Lote direcionado local: 111 PASS / 3 FAIL.
- PHP local: 412 PASS/7549 assertions. Frontend: 66 PASS.

Os resultados e logs estão no PC, NÃO necessariamente no Cloud:
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 16-13\e2e-integral-rodada1.json
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 16-13\e2e-direcionado-lote2.log
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP\CI-20261020-RADIUS\DIAGNOSTICO-E2E-71-FALHAS.md
Não finja ter lido esses arquivos sem recebê-los. Recupere logs/traces do GitHub para o SHA exato e solicite snapshot local caso necessário.

A relação nominal das 41 falhas e seus erros está em docs/MATRIZ-E2E-41-FALHAS-LOCAL-20261020.md (gerada do JSON local, snapshot intermediário). As 41 falhas intermediárias: Painel/OS 3, Gastos/Financeiro 12, Mobile 9, Desktop/responsividade 14, Pós-venda 1, Clientes/carga 2. Investigar todos os casos individualmente. Atenção especial aos testes de valores, parcelas e quitação de faturas, atualização de status e contadores, exclusão de Pós-venda, listas volumosas e timeouts. Alguns testes ainda exigem menus, rótulos, cores e dimensões de layouts antigos, mas NÃO assumir que tudo é teste desatualizado.

## 3 — Diferenciar GitHub CI de KingHost

O usuário diz que o aplicativo em uso no PC está funcional, mas percebe problema ao subir para “King Rush/KingHost”. NÃO concluir que CI falhou na hospedagem.

O arquivo .github/workflows/ci.yml executa os testes E2E em **GitHub Actions Ubuntu 22.04, PHP 8.2 sem OPcache no E2E, Node 22, SQLite de teste, Chromium e WebKit**. Backend-mysql usa MySQL 8.0 em serviço isolado. O PC usa Windows/Laragon/PHP 8.3. KingHost é uma hospedagem de produção DISTINTA desses runners.

Reproduza o ambiente do CI (Linux, versões, timezone, locale, fontes, dimensões, timings, assets e paths) e compare com o local. Diagnostique API, CSRF, cookies, sincronização, DB SQLite/MySQL, permissões, geração de PDFs, erros 404/500 e renderização. Se houver também suspeita de bug real na hospedagem, prepare auditoria separada de servidor com risco/rollback/autorizações, mas NÃO conecte nem altere produção nesta missão.

## 4 — Execução obrigatória

1. Antes de qualquer edição, inventariar Git, fazer e verificar backup seletivo fora do repositório. Preservar mudanças não commitadas.
2. Construir matriz nome do teste → erro/traces → causa reproduzida → correção → evidência. Correlacionar falhas locais 41 com remotas 65; distinguir as versões.
3. Classificar: teste legado de UI/navegação; fixture/isolamento; timeout/flake; ambiente Linux; defeito funcional real.
4. Corrigir contratos antigos preservando verificações reais, sem mascarar falhas nem modificar regras de negócio. Priorizar financeiro, OS, pós-venda, permissões e segurança.
5. Rodar E2E direcionados e medir APIs, carregamento de OS/Painel/Clientes/Serviços/Gastos. Os ganhos locais documentados foram Ordens 563→264ms, Serviços 564→233ms, Clientes 580→271ms, Financeiro 614→281ms, Gastos 730→480ms; NÃO declarar melhora na KingHost sem medir lá com autorização.
6. Rodar build, lint, typecheck, testes frontend, Laravel SQLite e MySQL isolados e Playwright E2E INTEGRAL no ambiente compatível com GitHub Actions, sem aumentar timeouts arbitrariamente, criar sleeps, desativar testes nem maquiar resultados.
7. Commits e push estritamente seletivos em branch de correção, após testes e análise de diff. Acompanhar o MESMO SHA no GitHub Actions até backend, backend-mysql, frontend e e2e ficarem TODOS verdes. Repetir diagnóstico/correção quando algum job permanecer vermelho.
8. Atualizar docs/PROJETO_MESTRE.md, docs/CONTINUIDADE_CHATGPT.md, matriz/relatórios e CHECKLIST_FINAL.md após cada rodada e ao encerrar.
9. Entregar tabela de todas as falhas com causa, arquivos mudados, testes antes/depois, números atuais, benchmarks, commits, SHA, links das quatro CIs, pendências honestamente registradas.

## 5 — Proibições

NÃO executar deploy/publicar na KingHost. NÃO ler ou modificar credenciais, dados reais, DB de produção, fotos, documentos, backups privados, cron, DNS, TERRAPLAN ou outros aplicativos; NÃO migrar/zerar/semear/restaurar banco de produção. Nunca transferir dumps ou clientes de teste ao servidor oficial. Testes destrutivos SOMENTE em banco comprovadamente isolado e descartável.

Proibido git add ., git clean, git reset --hard, force push, remoção indiscriminada, test.skip, test.fixme, pular asserts, mudar o visual aprovado, aumentar retries/timeouts sem causa validada. Respeitar o limite de uso de 8% restante descrito no AGENTS.md; se não conseguir ler indicador, não inventar porcentagem.

**Trabalhe autonomamente. Resultado final não é “funcionou no PC”; é CI integral comprovadamente verde e comportamento correto, sem tocar em produção.**
