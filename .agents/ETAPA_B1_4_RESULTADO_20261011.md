# Etapa B1.4 — Resistência e falhas, cópia isolada — 11/10/2026

Escopo: exclusivamente C:/Users/Allan/ARL-backups/etapa-a-20261011-141751/validation. Projeto original não alterado. Sem Codex, merge, commit, push ou acesso à KingHost.

## Testes efetuados
- 8 rodadas com 4 processos PHP independentes, DocumentService::issue() experimental, MySQL 8.4.9 isolado 127.0.0.1:33457, banco descartável e storage separado. Resultado 8/8: apenas um registro por rodada e SHA do arquivo = SHA do banco.
- Falha injetada no INSERT por trigger SQLSTATE 45000: exception esperada; zero registros persistidos, arquivo novo removido. PASS.
- Colisão com caminho que já existe como diretório (simulação limitada de indisponibilidade do caminho): método devolveu 409 preservando o diretório e zero registros. PASS de proteção, NÃO demonstra falha no meio de writeStream.
- PHP regressão na cópia isolada com APP_KEY público de fixture e SQLite em memória: StageEightTest + FinalShareTest, 35/35, 202 asserções.
- PdfFileSizeTest: 1 falha por extensão GD indisponível no PHP CLI da cópia (undefined imagecreatetruecolor), 1 passou. Não atribuir esta falha à mudança documental. A primeira tentativa global falhou por APP_KEY ausente; repetida com chave de fixture.
- PHP -l do DocumentService experimental: aprovado.
- MySQL isolado desligado (mysqladmin shutdown exit 0).
- Original tem apenas alterações preexistentes em AGENTS.md e CHECKLIST_FINAL.md; DocumentService original intacto.

## Pendências e limites
- Ainda não houve teste determinístico de corrida sob lock na versão experimental, nem crash de processo entre gravação e commit, nem falha parcial de writeStream; a checagem de órfãos impede sobrescrita mas não repara automaticamente órfãos.
- A correção experimental segura exige revisão de lock em transações pai, tratamento de arquivo órfão por crash e escrita física atômica; não promover ao original sem esses gates.
- Sem CI, E2E ou suíte PHP completa para esta mudança. Não confundir 8 rodadas aprovadas com prova universal de ausência de deadlocks.
- Evidências em C:/Users/Allan/ARL-backups/b1-2-mysql-isolated-20261011 e script b1-4-stress.ps1, JSON b1-4-stress.json.

## Próxima recomendação
B1.5: aperfeiçoar código experimental numa cópia isolada para tratamento de falha parcial de escrita, lock/transações pai e recuperação de órfãos; criar testes de injeção adicionais, depois revisar e solicitar autorização para promover alteração ao código original.
