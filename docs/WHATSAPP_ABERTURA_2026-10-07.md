# Mensagens de OS e revisão focada do Controle de Gasto — 07/10/2026

## Comportamento

Configurações > Mensagens permite ativar a abertura automática do WhatsApp após criação confirmada da OS. O padrão é desativado. A OS continua abrindo normalmente; o operador confirma o envio no WhatsApp. Não existe envio automático pela API nem custo externo novo. O navegador reserva a janela no clique e só abre a conversa depois da criação e anexos; bloqueio de popup oferece link na própria OS. Erros após criação não incentivam cadastro duplicado.

Os textos interno e externo são separados e editáveis com variáveis de nome, número da OS e empresa. O texto externo aprovado mantém os parágrafos vazios. O estado físico registrado continua sendo anexado quando informado. A ação manual de mensagem no menu PDF continua disponível com o mesmo texto da abertura. Configurações e permissões são aplicadas no backend.

A mensagem de compartilhamento final acrescenta *(PGTO Já Realizado)* imediatamente após o valor somente quando o saldo está integralmente pago. A situação é consultada ao gerar o compartilhamento, considerando pagamentos, correções e estornos; pagamento parcial mantém o texto padrão. PDFs emitidos e histórico não são reescritos.

## Validação e limites

313 testes de backend/6.505 verificações, 38 testes frontend, lint e TypeScript aprovados. Os 18 cenários de navegador relacionados a mensagens, configurações, confirmação de OS e mobile do Controle de Gasto passaram sem retries em cópia com banco e armazenamento isolados. A leitura de foto nessa regressão usa resposta simulada, sem chamada paga; não se alega nova validação da precisão da IA.

Revisão focada do Controle de Gasto inclui resumo, gastos, instituições, pagamentos, projeção e quitadas, calendário e formulários; larguras de 320, 390, 768 e 1280 pixels. A revisão completa dos demais módulos permanece fora do escopo. Capturas e logs ficam no backup externo da execução. Envio real pelo WhatsApp depende da confirmação do operador e não foi executado pelos testes.

Sem migrations ou alteração de schema. Configurações usam a tabela existente. Backup local verificado: C:/Users/Allan/ARL-backups/whatsapp-opening-20261007. Backup protegido de produção #17 baixado e validado (162 entradas verificadas), além do código anterior. A publicação foi autorizada pelo usuário e exige CI verde do commit exato; o resultado de ativação será registrado no relatório externo, sem marcar publicação antes de sua conclusão.
