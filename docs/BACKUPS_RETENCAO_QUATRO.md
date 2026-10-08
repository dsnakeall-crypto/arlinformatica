# Retenção de backups — quatro cópias

Todos os tipos armazenados (manuais, automáticos, importados e de segurança) participam do limite de quatro arquivos. A criação valida o ZIP gravado antes de executar a limpeza. A limpeza confere SHA256 e conteúdo dos quatro substitutos antes de remover qualquer cópia antiga e registra as exclusões na auditoria. Não exclui backups em criação. Arquivos corrompidos recentes suspendem a limpeza, preservando os antigos.

Restauração bloqueia a retenção enquanto consome o ZIP original; a cópia de segurança da restauração permanece entre as mais recentes. Download manual temporário não dispara retenção. A proteção contra exclusão manual dos backups de segurança permanece; eles agora expiram pela retenção autorizada.

Storage privado da hospedagem, diretório configurado backups. Cópias externas no computador não são eliminadas. Não há migration, alteração de schema ou de dados operacionais. O limite pode ser temporariamente excedido durante criação/restauração ou falha de integridade/exclusão: preservar recuperação tem prioridade sobre apagar dados sem validar.

Na publicação: baixar e validar backup atual antes da mudança e da limpeza inicial; aplicar a retenção uma vez para o acúmulo existente; conferir quatro arquivos/linhas restantes. A limpeza não acontece por abrir a tela.
