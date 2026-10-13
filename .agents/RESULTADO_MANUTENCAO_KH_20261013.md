# Resultado da manutenção KingHost - 13/10/2026

## Concluído
- Crescimento identificado: três instalações completas (stage e90, release 9a e release 5c) somavam 448,37 MiB, além de versões históricas. O ZIP da release 5c é somente 129.712 bytes maior que o ZIP 9a; acúmulo de instalações explica o crescimento, não esse pequeno delta do pacote.
- Antes desta rodada: 802,88 MiB nas pastas medidas com du. Depois: 291,04 MiB. Liberados 511,84 MiB nesta rodada. O painel pode manter valor em cache até recalcular.
- Release ativa preservada: 5c8885f6cf50757255938a39e1325bb9e91037cc.
- Aplicativo privado: /home/arlinfocg/arl-oito-5c8885f6cf50757255938a39e1325bb9e91037cc/ARL-5c8885f6cf50757255938a39e1325bb9e91037cc.
- Arquivos públicos: /home/arlinfocg/www. Ponte ativa: /home/arlinfocg/arl-current-e90f11f.
- Dados permanentes realocados para /home/arlinfocg/arl-private/.env e /home/arlinfocg/arl-private/storage. Conteúdo do env e inode do storage preservados. Atualizados somente os dois pontos de entrada ARL e seus caminhos/allowlist/lock; nenhum módulo, layout ou regra financeira alterado.
- Sem SQL, migration, restauração de banco, pagamentos de teste ou escrita em TERRAPLAN.

## Removido após backup verificado e validação HTTP
- arl-informatica-9702fa1dd0e86889a11db8e6136b327969083f95
- arl-informatica-bb5f007d153d8786a7dc499c6f21857b37b606af
- arl-informatica-stage-e90f11f-20261011
- arl-oito-9a90223304d404de1dfb867cc109952ca0b99ca5
- arl-oito-5c8885f6cf50757255938a39e1325bb9e91037cc/package.zip
- cron-scheduler.php.backup e index.php.original.backup
- Checksums remanescentes dos TARs ARL 9399242... e b7a2a34...
Os cinco diretórios removidos na rodada anterior permanecem documentados no relatório KH-MANUTENCAO-20261013, com arquivos de recuperação também copiados à pasta obrigatória do OneDrive.

## Preservado
Aplicativo ativo, arl-private, WWW, SSH/configurações do provedor, logs/tokens operacionais e www-kinghost-original (origem ambígua, não removida). Todas as pastas TERRAPLAN, inclusive anteriores/preparação, sistema-horas-maquina-private e www/terraplancg, permanecem intocadas. Assets públicos antigos não foram apagados indiscriminadamente: podem ser usados por clientes existentes ou TERRAPLAN.

## Backups locais desta rodada
Todos em APP ARL/BACKUPS APP/KH-CERTIFICADO-LIMPEZA-20261013. Nenhum TAR ou script de manutenção foi salvo no servidor; transferência via SSH, tar em stdout e execução PHP em memória.
- ARL-BACKUP-1.tar.gz: 328.313.801 bytes, 44.723 entradas; SHA256 56f0f0dc65f67dcd4a6b1edcb850c917292ab53e40d531022f59beda98d8ad5b.
- ARL-BACKUP-5.tar.gz: 220.607.482 bytes, 35.493 entradas; SHA256 b1f1e77cd62a04d532164c091a62e206756ffbf765ebcb5bb87a4f0a4ed80892.
Todas as entradas, tipos, tamanhos, links e hashes conferidos contra manifesto remoto. Nenhuma entrada TERRAPLAN. Backups contêm dados privados e nunca devem ser commitados, publicados ou colocados em WWW.

## Verificações
- Sintaxe PHP: aprovada.
- Testes isolados com arquivos fictícios: reorganização, backup obrigatório, env/storage/locks, proteção TERRAPLAN, limpeza, falha forçada e recuperação posterior por falha HTTP: aprovados.
- Backup transmitido com lock exclusivo ARL: hash e manifesto consistentes.
- Produção: início/login HTTP 200, arquivos estáticos HTTP 200, release 5c confirmada. Marcador temporário comprovou novo ponto de entrada servido pelo PHP; removido ao finalizar. TERRAPLAN HTTP 200 com TLS validado.
- Sem testes financeiros em produção. Suítes de produto não foram repetidas por esta manutenção de caminhos; serão executadas no novo pacote solicitado em Laragon.
- SSH encerrado normalmente após manutenção.

## Domínio e certificado - pendente por decisão do proprietário
Mapeamento ARLCG não aparecia no painel e DNS autoritativo recusava a zona ao iniciar a tentativa desta rodada. A inclusão gratuita no plano ficou em Aguardando DNS apesar de Registro.br já mostrar dns1 até dns6.kinghost.com.br. Recuperado mapeamento gratuito; propagação/provisionamento DNS ainda precisam ser confirmados. SSL arlcg/www NÃO foi corrigido. Nenhuma contratação paga, alteração no Registro.br ou chamado enviado. Proprietário pediu deixar essa parte para resolver depois. GUIA-CERTIFICADO-ARLCG-20261013.pdf contém instruções e texto pronto para suporte.
Fonte oficial: https://king.host/wiki/artigo/https-em-mapeamento/

## Publicações futuras e recuperação
Não reutilizar cegamente PUBLICAR-PACOTE-FINAL.ps1 ou scripts antigos: seus caminhos de release 9a e lock e90 foram removidos. Adaptar preflight/publicador para arl-private, backup/artefatos exclusivamente no OneDrive e rollback de código a partir de arquivo local verificado. Preservar sempre os dados atuais; rollback NÃO restaura SQL/env/uploads antigos automaticamente. Publicação nova exige confirmação expressa quando versão consolidada estiver testada.
Próxima missão: implementar prompt 222e84b3-31a0-42d3-ac3b-00c990c6be81 na pasta oficial OneDrive/www/arlinformatica, sincronizar branch correspondente com GitHub e testar no Laragon antes de publicar. Parada obrigatória aos 8% disponível, checkpoint seguro e retomada somente por comando humano.