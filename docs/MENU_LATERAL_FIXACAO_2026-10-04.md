# Menu lateral: abertura somente pelo botão de fixação

## Resultado

Commit funcional: `6f34d448a0af92bcfb49d7eaddf72e5af6275ae0`; validação final e release publicada: `8cb058a30ac4e05169f54f277f3f78ab8226700f`, na branch `codex/pos-venda-selecao-em-lote`.

Publicado no servidor original `https://arlinfocg.kinghost.net` somente após a CI integralmente verde.

No Web/PC, desfixar mantém o menu recolhido em 58px. Passar o mouse mostra o nome dos botões pelo tooltip nativo, sem expandir o menu ou deslocar a página. Fixar abre o menu de 240px. A preferência autenticada do backend determina a largura também após recarregar; a antiga chave local não interfere. Mobile/Tablet mantém sua navegação própria. Sem mudanças no backend, migrations, autorização ou dados comerciais.

## Backup e preparação

Backup externo anterior à edição: `C:/Users/Allan/ARL-backups/sidebar-static-20261004-135625`. ZIP com 2.099 arquivos, hashes e CRC verificados; alterações locais e histórico Git completo preservados em bundle validado. Dependências reinstaláveis excluídas do backup; alterações preexistentes não foram incluídas no commit.

Build local atualizado. Pacote completo preparado a partir de clone do commit oficial, com Composer sem dependências de desenvolvimento, build novo e arquivos estáticos/OCR. Manifesto e arquivo tar.gz verificados: 7.720 arquivos; identidade e SHA-256 registrados externamente em `release-package.json` no backup desta etapa. Sem `.env`, banco, storage privado, testes, backups ou credenciais. Antes do deploy, a identidade do pacote deve corresponder exatamente ao commit aprovado na CI.

## Validação

- Seis testes específicos do menu passaram, incluindo hover em todos os botões, geometria estável, navegação por ícone, preferência autenticada após recarga, chave local antiga, menu expandido/recolhido em 1280/1920px e destinos mobile.
- Teste de adaptação desktop passou nas oito dimensões e onze telas.
- Capturas dos menus expandido e recolhido revisadas visualmente em 1280/1920px.
- 22 testes frontend, lint, TypeScript/build, Pint e auditoria npm de runtime sem vulnerabilidades aprovados.
- 307 testes PHP em SQLite e 307 em MySQL isolado, com 6.450 assertions em cada execução, passaram. MySQL de teste: `arl_sidebar_test_20261004`; nenhum teste usa o banco real.
- Regressão local completa: 144 cenários aprovados; um teste novo comparava indevidamente a altura total da página antes/depois do carregamento dos dados. Menu permaneceu em 58px e conteúdo com a mesma posição/largura. Corrigida somente a verificação para comparar largura/posição horizontal, mantendo checagens de hover, título, recarga e navegação. Não houve correção adicional de código de execução por esta falha. Reteste local: os seis cenários do menu passaram em 28,3 segundos.
- CI final do commit `8cb058a`: frontend, backend SQLite, backend MySQL e E2E aprovados. Todos os 145 cenários de navegador passaram integralmente em 8 minutos, sem retries. [Run 37220285180](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/37220285180).

## Bloqueio inicial da CI resolvido

[CI 37219042532](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/37219042532) foi bloqueada antes de iniciar qualquer etapa. Todos os quatro jobs possuem zero steps e nenhum runner. A anotação informa: “The job was not started because your account is locked due to a billing issue.” Repositório conferido como público e jobs configurados com runners padrão.

O proprietário identificou uma cobrança de US$40 não processada. Orientado a regularizar em Settings → Billing & Licensing → Payment information, conforme a documentação oficial do GitHub. Não foi efetuada cobrança ou mudança comercial pelo agente.

Posteriormente, o GitHub voltou a executar os jobs e a CI final passou. A cobrança não foi processada ou alterada pelo agente; o desbloqueio operacional foi comprovado pela execução dos quatro jobs. O run inicialmente bloqueado permanece no histórico e não representa a validação da versão publicada.

## Publicação e preservação dos dados

- Backups protegidos de produção #11 e #12 criados, baixados e validados. #12 atualizado antes da ativação: 12.869.633 bytes, CRC e 145 checksums verificados, incluindo o banco e arquivos privados. Código anterior e `.env` também baixados/validados. Backup final em `C:/Users/Allan/ARL-backups/sidebar-static-20261004-135625/final-production-backup`; anteriores preservados.
- Pacote publicado: 7.720 arquivos, SHA-256 `7bd3808e49ce19204ec4fafa9b700d98810cdcc28f0c5535080d61529497badb`. Os 7.719 arquivos de execução foram conferidos no servidor antes/depois. `.env`, dados e storage privado ficam fora do pacote.
- Release anterior: `/home/arlinfocg/arl-informatica-a2ea9cbcecda53aa283a1aaaf4fae01be8879975`; nova: `/home/arlinfocg/arl-informatica-8cb058a30ac4e05169f54f277f3f78ab8226700f`.
- Manifesto de build, index e referência do wrapper cron trocados atomicamente durante manutenção breve. Assets antigos mantidos para navegadores existentes e rollback. Caches Laravel recompilados; nenhum seed, importação, alteração de regra financeira ou chamada paga à IA.
- Schema real conferido: 47 migrations registradas, zero pendentes, zero aplicadas nesta atualização.
- Comparação de hashes de todas as linhas das 54 tabelas de negócio antes/depois confirmou preservação integral: 626 clientes, 54 OS e 34 pagamentos. Tabelas operacionais voláteis, como cache/sessões/heartbeat/backups, ficam fora desta comparação.
- `.env` e APP_KEY preservados; somente APP_COMMIT atualizado. Mesmo storage privado compartilhado entre as releases. Os 89 arquivos privados do backup final mantiveram seus hashes.

Os únicos arquivos de execução alterados em relação ao pacote anterior foram `resources/js/main.tsx`, o manifesto de build e os novos chunks `main-uERW5XLP.js`/`expense-photo-import-C3_UFaJG.js`, além dos metadados do pacote raiz em `vendor/composer/installed.php`. As versões de dependências e o código PHP funcional permanecem iguais. O manifesto não referencia os chunks antigos, que continuam no diretório público para retorno seguro.

## Conferência após publicação

- 71 arquivos públicos e todos os arquivos de execução conferidos por SHA-256. Manifesto e novo JS principal servidos via HTTPS também conferidos contra o pacote.
- 17 leituras reais de API/PDF/foto retornaram 200: sessão em memória, navegação, OS/busca/paginação/detalhe, clientes, fornecedores, financeiro, Controle de Gasto, documentos e imagem existentes. Somente leitura; nenhuma conta ou compra fictícia criada em produção.
- Perfil Funcionário em memória recebeu 403 para Fornecedores, Controle de Gasto e Usuários. Sem sessão, APIs receberam 401; `.env` público recebeu 403.
- HTTPS, health check, PWA, service worker e OCR local responderam 200. Login em navegador a 1366px e 390px sem erros JavaScript ou overflow horizontal. A navegação autenticada do menu foi verificada localmente e na CI; não se utilizou a senha real do proprietário em produção.

## Rollback e limites

Rollback de código preparado em `/home/arlinfocg/deploy-backup-20261004-sidebar-8cb058a`: index, wrapper cron, `.htaccess` e manifesto de build anteriores. Para retornar, ativar novamente os entrypoints e manifesto preservados, mantendo o storage compartilhado; não restaurar banco nem executar rollback de migrations, pois nenhuma foi aplicada. Proceder durante janela breve de manutenção e repetir os checks HTTPS/privados.

O ajuste anterior do agendamento cron na KingHost continua uma pendência independente desta alteração. A troca atual preservou seu comportamento e somente atualizou o caminho da release. O proprietário pode conferir o menu após recarregar a página com Ctrl+F5.
