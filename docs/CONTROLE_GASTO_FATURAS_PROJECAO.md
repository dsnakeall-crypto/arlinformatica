# Controle de Gasto — faturas, pagamentos e projeção (08/10/2026)

## Comportamento autorizado

Resumo mostra Faturas do mês: saldo pendente do mês de referência, reunindo os dois responsáveis e as partes compartilhadas. O filtro pessoal continua alterando os indicadores pessoais; não reduz a fatura integral. Tipos contendo Cartão/Crédito, exceto Débito, consolidam por instituição; os tipos são livres e essa classificação é explícita. Empréstimos, financiamentos, despesas da casa e demais tipos mantêm um card por dívida/contrato. O nome identifica contratos distintos da mesma instituição. Vencimentos diferentes no cartão usam a primeira data ainda pendente, preservando as datas individuais nas parcelas. Fixos de Casa permanece por último pela identificação persistente existente.

Cards azuis compactos mostram instituição, tipo/contrato, saldo e vencimento. Allan, Carol e Casal ganham retratos e espaçamento; Projeção conserva os nomes configuráveis e identifica despesas compartilhadas.

Pagamentos começa por instituição, com arte no desktop e linha compacta no mobile. Abrir uma instituição permite escolher outro mês dentro da consulta, sem modificar o mês principal. Tipo → compra → lançamentos mantém parcelas recolhidas e paginação. Consultas usam a data efetiva do pagamento (`occurred_on`); valores pagos excluem estornos e descontos. Cadastros excluídos continuam consultáveis por seus identificadores históricos.

Histórico exibe apenas exclusões de dívidas, com nome, motivo, autor e data. A auditoria interna permanece completa; exclusão normal continua sendo cancelamento lógico, preservando parcelas e lançamentos. Quitadas e Pagamentos continuam com suas finalidades próprias.

Ver mês em Projeção abre um diálogo independente, com partes de cada responsável e recorte compartilhado, detalhes de instituição/compra/parcela/vencimento e cinco linhas por página. Não altera mês, filtro ou aba da tela principal. O compartilhado já está incluído nas partes individuais; nunca somar novamente. Moldura limitada ao viewport, fechamento acessível e rolagem interna de segurança em alturas pequenas/zoom elevado. Paginação evita depender de uma lista longa. Mobile mantém as seis seções autorizadas; Histórico e Ajustes permanecem exclusivos do desktop conforme preferência anterior.

## Notificações

Cadastros manuais/por foto e pagamentos/antecipações/quitações geram notificações da categoria `expense_control`, título Gestor de Gastos, com autor, valor e responsabilidade. São destinadas a contas ativas Master, Administrador e Controle de Gasto; Funcionário/Usuário local não recebem dados financeiros. Contas exclusivas de gastos têm sino e inscrição push, mas consultam apenas notificações dessa categoria. Uma mudança posterior de perfil também restringe a consulta.

Notificações internas são gravadas na transação e possuem chave de deduplicação. Repetir uma solicitação não duplica avisos; transação rejeitada não notifica. Push ocorre depois do commit; falha do provedor não desfaz pagamento nem remove aviso interno. Não há envio ao WhatsApp, API paga nova ou dependência OpenAI. Cada aparelho precisa conceder permissão e ativar Notificações no dispositivo. Inscrição existente não comprova recebimento físico: verificar nos aparelhos reais.

## Segurança e publicação

Sem migration, alteração de schema ou mudança das regras de pagamento. Testes usam banco e arquivos isolados. Backup local incremental verificado: `C:/Users/Allan/ARL-backups/controle-gasto-revisao-20261008` (manifesto, ZIP e bundle Git). Backup oficial inicial validado/baixado: `deploy/protected-backup-25.zip`, SHA-256 `9647ccfc2f03fe510a132f811a7647044b6f32c800c5003a1c1772ac8b41d527`; 166 conteúdos conferidos, incluindo banco e privados.

Zeramento excepcional autorizado explicitamente pelo usuário: remover somente dívidas, parcelas, lançamentos/operações e vínculos de importações dessas dívidas, preservando responsáveis, instituições/tipos, arquivos e todos os demais módulos. Não zerar consumo/cotas do leitor de IA, não reiniciar IDs, não importar banco local, não alterar clientes/OS/pagamentos da empresa. Revalidar backup e estado antes da operação, usar transação e verificar hashes das tabelas não autorizadas. A alteração visual pode ser publicada independentemente dessa limpeza.

## Validação

Backend completo local: 317 testes, 6.555 verificações; inclui agregação mensal, separação de contratos, divisão das partes, exclusões com motivo, autorização e deduplicação de notificações. Frontend: 41 testes unitários. Lint e TypeScript aprovados; build de produção gerado com recursos OCR locais. CI MySQL e navegador, conferência visual e publicação devem ser registradas no relatório externo final, sem confundir preparação com implantação.
