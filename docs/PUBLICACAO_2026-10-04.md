# Publicação geral — 04/10/2026

Atualização autorizada pelo agendamento das 07h, horário de Brasília. **Publicada**, com pendência operacional no intervalo do cron da hospedagem e conferência final de login pelo proprietário. Produção: https://arlinfocg.kinghost.net.

## Versão e publicação

- Código publicado: `36598494cdf3c789edfc5de6ab555ca543077950`.
- Fonte: clone novo da branch `codex/pos-venda-selecao-em-lote` no GitHub oficial `dsnakeall-crypto/arlinformatica`, após push dos commits existentes. A branch principal continua no commit anterior; não houve merge automático.
- Release privada ativa: `/home/arlinfocg/arl-informatica-36598494cdf3c789edfc5de6ab555ca543077950`.
- Release anterior preservada: `/home/arlinfocg/arl-informatica-71dde288210dde3741b5103727cb217f7e3bb354`.
- Runtime conferido: PHP CLI `/usr/bin/php82`, versão 8.2.33; MariaDB 11.4.12. O comando genérico `php` aponta para 5.6 e não deve ser usado nesta aplicação.
- Pacote: 7.720 arquivos, 32.156.954 bytes, SHA-256 `e67636faed60a1d0b9e6b3f46b55f401a9d39edabe576dfcbe9e1afd329c9bc1`. Manifesto confere os 7.719 arquivos de runtime; o próprio manifesto é o arquivo adicional.
- Publicados app, bootstrap, config, migrations, views/recursos, routes, artisan, Composer e vendor sem dependências de desenvolvimento, além de todos os estáticos e do build. Inclui Fornecedores, Controle de Gasto, leitura por foto/OCR, artes dos cartões, mobile, etiquetas e performance.
- Os 71 arquivos públicos do manifesto foram conferidos no destino. `public/build` foi publicado completo: manifest e 29 assets, incluindo `main-lvTRcEgB.js`. OCR local, ícones, artes, manifest PWA e service worker incluídos.
- `index.php` e o wrapper existente `cron-scheduler.php` tiveram seus caminhos adaptados e foram substituídos por rename atômico. `.htaccess`, `terraplancg` e `recibos` preservados. Assets antigos mantidos para clientes com páginas já abertas e para retorno.
- Caches de configuração, eventos, rotas e views regenerados. Janela de manutenção encerrada com `artisan up`.

## Backups verificados

Pasta externa local: `C:/Users/Allan/ARL-backups/publicacao-geral-20261004-070150`.

1. Estado local anterior: 2.145 arquivos, manifesto SHA-256, ZIP com integridade verificada, diff binário das alterações, status incluindo não rastreados, HEAD e bundle do histórico Git verificado. Backups anteriores preservados.
2. Banco e arquivos privados de produção: backup protegido **#8**, `backup-arl-20261004-070940-8.zip`, 12.599.083 bytes. Validação no servidor antes da publicação; download e conferência de SHA-256, CRC e todos os 123 payloads na cópia local. Não foi chamado o comando de backup automático que aplica retenção.
3. Código público/privado anterior: `production-code.tar.gz`, 17.074.676 bytes e 8.825 entradas, com hash confrontado ao arquivo remoto `/home/arlinfocg/deploy-safety-20261004-0712.tar.gz`.
4. Schema real salvo privadamente em `production-schema.json`; `.env`, index, wrapper cron e `.htaccess` baixados e verificados. Esses arquivos permanecem fora do Git e de pacotes públicos.
5. Cópias de retorno dos entrypoints: `/home/arlinfocg/deploy-backup-20261004-3659849`.

O disco privado continua no mesmo storage compartilhado da instalação anterior, cujo alvo físico é `/home/arlinfocg/arl-informatica-bb5f007d153d8786a7dc499c6f21857b37b606af/storage`. Não se criou link público para dados privados.

## Banco existente e migrações

O banco real tinha 37 migrações registradas. Schema consultado pelo servidor; arquivos antigos de migration não foram alterados. As dez novas migrações foram revisadas, ensaiadas numa cópia isolada dos dados reais em MySQL 8.4.3 e depois aplicadas em produção:

1. `2026_10_02_020000_create_budget_share_tokens_table`
2. `2026_10_02_100000_create_supplier_purchases`
3. `2026_10_02_120000_add_supplier_payables_and_invoices`
4. `2026_10_03_000000_create_expense_control`
5. `2026_10_03_010000_add_expense_institution_artwork`
6. `2026_10_03_020000_create_expense_photo_imports`
7. `2026_10_03_030000_create_expense_photo_reads`
8. `2026_10_03_040000_add_household_institution_type`
9. `2026_10_03_070000_extend_supplier_workspace`
10. `2026_10_03_170000_add_deleted_at_to_expense_catalogs`

Total após publicação: **47 migrações**. Nenhuma migration pendente. Migrações criam as tabelas dos módulos e campos novos; adicionam dois perfis operacionais e os dois responsáveis padrão, sem dívidas fictícias. Não foi executado seed, `migrate:fresh`, importação do banco local ou rollback de schema em produção.

Comparação imediatamente antes/depois em produção preservou, valor por valor, os registros existentes de clientes, usuários, OS, pagamentos, produtos, estoque, transações/ajustes/despesas financeiras, documentos, fotos, orçamentos/itens, itens de OS, finalizações, estornos, snapshots, histórico de status, contador e links finais. Os totais permaneceram **626 clientes, 53 OS e 33 pagamentos**. Dados dos testes locais não foram importados para os módulos novos.

`APP_KEY`, banco, credenciais existentes e parâmetros de sessão foram preservados. A nova cópia privada do `.env` recebeu o commit da release e apenas a configuração Mistral já autorizada e existente no ambiente local. Chave continua exclusivamente no backend. Leitura avançada habilitada com limites existentes de 20 tentativas/mês e teto estimado compartilhado de US$ 1; não houve chamada paga de homologação em produção.

## Validações

- 307 testes PHP em **MySQL isolado**, 6.450 assertions, todos passaram. O primeiro nome de banco `arl_release_tests_20261004` foi recusado pela proteção por exigir o segmento exato `test`; execução válida ocorreu em `arl_release_test_20261004`. Nenhum banco em uso foi acessado pelos testes.
- Ensaio das dez migrações: `arl_release_rehearsal_test_20261004`, cópia do backup/schema real. Todos os dados de negócio existentes preservados. Não é uma fonte de publicação de dados.
- 22 testes frontend passaram; lint, Pint, TypeScript/build, Composer audit sem advisories e npm audit de runtime sem vulnerabilidades passaram.
- 24 testes Playwright em banco descartável passaram nesta execução: 14 de Controle de Gasto/Fornecedores e 10 de performance/mobile, sem retries.
- HTTPS: login, health `/up`, manifest do build, manifest PWA, service worker e worker OCR responderam 200.
- Navegador real automatizado na produção: login em 1.366px e 390px, sem erros JavaScript e sem overflow horizontal; capturas revisadas visualmente. Não houve autenticação por senha real do proprietário.
- Backend real em produção: 12 rotas responderam 200, incluindo usuário/navegação, Ordens e paginação, clientes, Fornecedores, Financeiro, Controle de Gasto/resumo/projeção e configuração da leitura por foto. Mais quatro leituras verificaram busca, lista de documentos, PDF final existente e foto existente.
- Essas leituras autenticadas usaram o kernel Laravel por SSH, usuário Master já existente apenas em memória, sessão/cache temporários e transação revertida; não foi criado usuário, senha, token de acesso ou sessão autenticada persistente. Isso não substitui o teste de login com a senha no navegador.
- Perfil Funcionário simulado somente em memória recebeu 403 em Fornecedores, Controle de Gasto e Usuários. HTTPS real sem sessão recebeu 401 em APIs protegidas. `.env` responde 403. Caminhos inexistentes `/storage/documents` e `/vendor/autoload.php` devolvem apenas HTML da aplicação, sem conteúdo privado/PHP.
- Todos os **88 arquivos privados** do backup foram confrontados novamente por SHA-256 após publicação. Escrita/leitura privada foi conferida com arquivo temporário único removido ao final.

## Cron: pendência operacional

O wrapper existente continua protegido pelo mesmo token e agora aponta para a release nova. A execução real foi comprovada por heartbeats às **07:12:27, 07:17:27 e 07:22:27** de 04/10, gerados independentemente destas verificações. A cadência observada é de cinco minutos, fora do minuto zero.

`schedule:list` confirma `post-sale:check` e `supplier-payables:remind` de hora em hora no minuto zero; heartbeat a cada minuto; backup diário às 02:05. Portanto, a cadência observada da hospedagem pode perder as tarefas horárias e o backup no horário exato. Não marcar cron plenamente homologado.

`post-sale:check` foi executado manualmente na release nova e terminou com sucesso: **0 ciclos novos**, sem limitar a recuperação a 30 dias. A execução automática horária futura ainda depende do ajuste do cron para cada minuto no painel KingHost. O acesso ao Pós-Venda mantém recuperação interativa limitada aos últimos 30 dias. Não houve criação de caso fictício no banco oficial para testar recuperação histórica.

O SSH permite executar PHP, mas `crontab -l` é negado pelo provedor. Não houve alteração de cron fora do painel nem criação de endpoint de manutenção. Foi solicitada ao proprietário a abertura das tarefas agendadas da KingHost para ajustar o intervalo.

## Retorno seguro

Não houve necessidade de retorno. Se necessário, restaurar os entrypoints originais preservados em `/home/arlinfocg/deploy-backup-20261004-3659849` por troca atômica e o manifest do build anterior a partir de `production-code.tar.gz`. A release anterior e os assets antigos continuam disponíveis. O storage/APP_KEY não mudaram. As novas tabelas podem permanecer durante retorno ao código anterior; não executar `migrate:rollback`, pois os métodos `down()` removem tabelas dos módulos.

Restauração integral do backup do banco não é rotina de rollback de código: exigiria avaliar dados novos posteriores ao backup e preservar um novo backup antes de qualquer restauração. O sistema foi deixado online, fora de manutenção.

## Pendências e limites

1. Ajustar cron KingHost para cada minuto e comprovar atualização contínua do heartbeat e próxima execução horária. Não há configuração automática do painel nesta entrega.
2. Proprietário confirmar login com sua senha atual e uso prático dos módulos no PC/celular. Senhas existentes não foram trocadas; não foram criados pagamentos ou compras fictícias em produção.
3. Leitura Mistral publicada/configurada, sem nova chamada paga nesta execução. Precisão adicional depende das fotos reais e confirmação pelo usuário.
4. Impressão física B21S e notificações Push no dispositivo não foram testadas nesta publicação.

Evidências completas, manifestos, schema, logs, snapshots e scripts desta execução permanecem na pasta de backup externa indicada. Nenhum arquivo privado, SQL, credencial, teste, node_modules ou artefato foi incluído no pacote. A alteração preexistente de `vite.config.ts` foi preservada localmente e não commitada; o build do clone oficial gerou os mesmos nomes de assets do build anterior validado.
