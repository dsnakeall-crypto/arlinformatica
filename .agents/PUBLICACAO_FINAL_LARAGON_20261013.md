# ARL — consolidação e publicação de 13/10/2026

## Fonte e autorização
- Pasta oficial: C:/Users/Allan/OneDrive/Programacao APP/www/arlinformatica.
- Branch: codex/final-financeiro-laragon-20261013.
- Fonte do pacote: 01dcd015ec4cc0bc529ee1823086afabcbd276f1, enviada ao GitHub.
- CI: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38437826536.
- Publicação autorizada pelo proprietário, sem migration, SQL de teste, seed ou restauração. Original C:/laragon/www/arlinformatica e TERRAPLAN intocáveis.
- Estado final: CI integral verde (SQLite/MySQL/frontend/Playwright); publicação executada e confirmada por HTTPS. Fonte01dcd01 ativa; release antiga5c removida somente após backup validado.

## Correções e revisão
- Cards detalhados Allan/Carol restaurados; compactos menores, sem rodapé Ver gastos. Pendente menor que valor original. Carteira mensal deixa de sobrepor valor.
- Clique no card Allan/Carol abre resumo somente de leitura por instituição/modalidade, incluindo somente sua participação compartilhada. Cifrão mantém pagamento separado.
- Pedido posterior: total mensal sem cifrão; botões Allan/Carol/Casal disponíveis mesmo no saldo zero, com mensagem de nenhuma dívida e sem confirmação de pagamento quando não há saldo.
- Cifrões verdes com relevo3D: brilho, borda, base/sombra, texto com leve relevo e pressionamento. Dimensões e fluxos preservados. Captura mobile conferida em output/final-financeiro-20261013/resumo-restaurado-390.png.
- PDF detalhado reserva altura real dos textos longos, alternância de linhas e totalização/paginação; centavos/projeção financeira preservados.
- CI0f anterior:272 E2E aprovados/3 falhas. Causa real do atendimento vermelho: aumento de especificidade global por quatro :not; resolvido com :where somente nas exclusões financeiras. Duas expectativas antigas do menu atualizadas ao comportamento aprovado:3s de inatividade/reset e fora imediato. Relógio controlado verifica2999/3000ms; outro cenário continua tempo real. Nenhum teste removido/desabilitado, retries0.

## Backups
Pasta privada no PC: C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 13-10-26 - 12-54.
- Código/Git local anterior:4593arquivos, SHA256 fdf18a7ca6cfe3e107bf3062a98b17429ed4de24e8c7a7e11e563070e3e9ac24.
- Produção anterior por streaming:8030arquivos/107813338bytes, SHA256 d0ff9f78724e6f94455bb26b901f6f0684fbffd855fca7c822a0d24d6d1e9ad0; todos os arquivos conferidos. Nenhum arquivo de backup criado no servidor.
- SQL oficial exportado somente em leitura diretamente ao PC:17205090bytes, SHA2564de13ccaec424d6fbb69b32730146700a233d0dd9e46d1489bc616644a96b45c. Nunca importado/restaurado/enviado.
- Quatro ZIPs do aplicativo também baixados: CRC, payload e todos os hashes validados. Decisão posterior do proprietário: preservar os4no servidor e manter automático ativo em BACKUPARL privada. A limpeza desses4ZIPs foi CANCELADA; não executar o helper externo antigo.
- BACKUPARL preserva caminhos antigos por vínculo privado, sem escrever SQL. Retenção nativa4 valida substitutas e suspende exclusão em corrupção/recuperação. Backups pré-publicação e releases inutilizadas continuam somente PC.

## Testes e evidências
- PHP:400testes/7439assertions SQLite e MySQL isolados, reiterados pela CI anterior; nova CI backend/MySQL aprovados.
-61unitários, lint, TypeScript, build aprovados; lint/types/build repetidos após3D.
-16cenários Playwright nesta correção de CI/cifrões aprovados (2,2min);4de regressão após3D aprovados (1min), incluindo pagamento rápido/CSRF/partes, mensal/PDF e resumo/zero nos dois layouts. Logs output/RETOMADA_E2E_CIFROES.log e RETOMADA_E2E_3D.log.
-24regressões adicionais e3cenários resumo/modalidade/clique/visual aprovados antes desses últimos ajustes; falhas intermediárias preservadas nos logs.
- PDFs fictícios longos:Allan15p,Carol15p,Geral22p,Casal11p; abertura/final renderizadas sem cortes/sobreposições.
- Publicador/rollback/limpeza em Linux isolado sem rede: sucesso, recuperação de falha de smoke, rejeição de manifesto adulterado e preservação de symlinks privados/TERRAPLAN aprovados.
- Organização BACKUPARL: sucesso e idempotência; bloqueio de hash divergente, arquivo extra ou destino existente; arquivos privados/TERRAPLAN preservados. Flysystem real validou gravação/leitura/exclusão em fixture através do vínculo, sem SQL. Pint aprovado.
- Pacote:7841arquivos/37033804bytes, CRC e manifesto integralmente conferidos, SHA256d61f81eb391a2589d72b3b0d97704c702b95710f30afab0043569ecc6a24f0a0. Sem credenciais, banco, .env, storage, backups, Git ou testes. Nova cópia também conferida no PC.

## Operações autorizadas concluídas
1. [OK] CI integral verde desta fonte confirmada antes de ativar.
2. [OK] Publicador novo executado com relatório01dcd015ec4c e pasta verificada: PUBLISHED, UNCHANGED_NO_MIGRATION. Não houve SQL de escrita.
3. [OK] HTTPS: login/root200 com release01dcd01; APIs privadas401, cron403. QuatroJS/CSS conferidos porSHA256 e idênticos ao pacote. Nenhum pagamento oficial de teste.
4. [OK] BACKUPARL criada fora de www, permissão0700, quatroZIPs preservados, vínculo privado no caminho antigo. Preferência automática/registro de banco intactos.
5. [OK] Código antigo5c removido após conferência integral do manifesto/arquivo local. Pacote temporário/probe removidos. Na raiz existem somente os itens ARL: release01dcd01, ponteiro, arl-private e BACKUPARL; demais pastas protegidas preservadas.
6. [OK] Registros de publicação, HTTPS, limpeza, BACKUPARL e estado final salvos no PC. Antes/depois:125arquivos privados com SHA256 idênticos, incluindo4ZIPs e.env. Ocupação /home medida por du:297092KiB (~290,13MiB); pode diferir da quota exibida no painel. Sem merge/main.

Domínio/certificado arlcg.com.br continua reservado ao proprietário. Não houve DNS, chamado ou acesso ao Registro.br nesta publicação. Smoke autenticado/manual com dados reais depende do proprietário; testes financeiros são isolados.


## Continuidade e recuperação
Fonte runtime publicada:01dcd015ec4cc0bc529ee1823086afabcbd276f1. Checkpoint documental posterior identificado por git log -1 --format=%H; não altera o runtime. Código local e GitHub sincronizados na branch indicada; arquivos históricos não rastreados preservados.
CI confirmou400/7439SQLite e400/7439MySQL; frontend aprovado e E2E completo aprovado. A rodada anterior145teve275aprovados/1reprovado pelo tom verde; alteração01corrigiu o CSS sem reduzir o teste. Reteste final4aprovados (1,1min), inclusive menu/cores/resumo/zero/mensal-PDF.
Após remover5c, recuperação exige reidratar somente a pasta de CÓDIGO antigo a partir de ARL-PRODUCAO-ANTES.tar.gz validado e recuperar aliases/ponteiro do BASELINE-ALIASES.json. Nunca restaurar SQL/env/uploads/storage. Não executar automaticamente. BACKUPARL permanece permanente fora das releases; futuras atualizações devem baixar também seu conteúdo porque o vínculo não é uma segunda cópia.
Evidências privadas no PC: RESULTADO-PUBLICACAO.json, RESULTADO-BACKUPARL.json, RESULTADO-LIMPEZA-POS-PUBLICACAO.json, HTTP-SMOKE-FINAL.json, PRIVADOS-PRESERVADOS-ANTES/DEPOIS.json, SERVIDOR-ESTADO-FINAL.json.
Limites: nenhum smoke financeiro autenticado com dados reais; validação funcional financeira foi isolada. Domínio/SSL arlcg.com.br permanece com o proprietário. Não houve alteração no banco oficial, no original ou na TERRAPLAN por esta implantação.
