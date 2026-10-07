# Checklist final — cabeçalhos brancos dos popups

- [OK] Backup de código, alterações locais e histórico Git criado e verificado; backups anteriores preservados.
- [OK] Cabeçalhos brancos nos dois popups; removidos os detalhes decorativos das laterais.
- [OK] Dimensões compactas, títulos, ícones, botão de fechar e demais acabamentos mantidos.
- [OK] Build/TypeScript, lint e cenário E2E de edição/orçamento/envio aprovados; capturas desktop/mobile conferidas.
- [PENDENTE] CI remota e publicação.

# Checklist final — compactação dos popups aprovados

- [OK] Novo backup de código, alterações locais e histórico verificado; backups anteriores preservados.
- [OK] Mesma composição, cores, sombras e acabamentos; somente dimensões e espaçamentos internos reduzidos no Web/PC.
- [OK] Edição e orçamento padrão sem rolagem interna em 1366×768 e 1280×720; orçamento com um serviço e total também validado em 1280×720.
- [OK] Acesso aos campos e ações preservado em celular e para conteúdo maior que a tela.
- [OK] 212 testes PHP, 12 unitários frontend, cinco E2E relacionados e repetição do cenário com verificações de geometria aprovados; build, lint, TypeScript e Pint aprovados.
- [PENDENTE] CI remota e publicação deste ajuste na KingHost.

# Checklist final — reconstrução dos popups 3D em 02/10/2026

- [OK] Backup original anterior à edição mantido e checksum conferido; novo backup de código, alterações locais, referências e histórico completo criado antes da reconstrução.
- [OK] Ficha de edição convertida em popup com os dois blocos, faixa de informações, cantos pretos/vermelhos, relevos, bordas e sombras conforme as novas referências.
- [OK] Popup de orçamento reconstruído em cinco blocos, mantendo itens, valores, total quando há itens, PDF e envio por WhatsApp.
- [OK] Rolagem interna e rodapé acessível em desktop, 720px de altura e celular de 390px; foco e Escape verificados no navegador.
- [OK] Proteção de alterações não salvas, senha cadastrada e documentos históricos preservadas; nenhuma migration nesta reconstrução visual.
- [OK] 212 testes PHP / 1774 asserções e 12 unitários frontend aprovados; ESLint, Pint, TypeScript e build aprovados.
- [OK] Todos os 105 cenários E2E cobertos: 99 passaram na suíte geral; defeito visual encontrado corrigido e 11 cenários relacionados passaram na repetição, incluindo o cenário que falhou e os cinco dependentes.
- [OK] Capturas reais dos dois popups em desktop e celular inspecionadas; documentação e referências atualizadas.
- [PENDENTE] Homologação visual pelo proprietário, CI remota e publicação na KingHost.

# Checklist final — ficha de edição e orçamento em 02/10/2026

- [OK] Backup de código/alterações locais verificado antes de editar; backup adicional do banco e arquivos privados validado antes da migração local.
- [OK] Ficha de edição organizada em blocos com bordas arredondadas, sombra e todos os campos existentes; senha, proteção de rascunho e snapshots preservados.
- [OK] Modal de orçamento com título/divisor, campos organizados, itens e total destacados e rodapé acessível em viewport de 720px.
- [OK] Ações compactas Enviar Orçamento, Baixar PDF e Excluir Orçamento, mantendo autorização e bloqueios do backend.
- [OK] WhatsApp com nome, mensagem solicitada e link protegido para a revisão correta do PDF; alternativa quando o navegador bloqueia a nova janela.
- [OK] Envio confirmado manualmente; resposta/aprovação do cliente continua funcionando na finalização da OS, com seletor somente enquanto aguarda decisão.
- [OK] Revisão adicional conferiu backups, vínculos entre OS/documentos e rejeição real 419 sem CSRF; tokens e PDFs públicos têm headers de privacidade.
- [OK] Link público sem login válido por 30 dias, token aleatório armazenado somente como hash, sem expor outros documentos; exclusão/expiração invalidam acesso.
- [OK] PDF histórico preservado e download autenticado com nome de arquivo e Content-Disposition attachment.
- [OK] Migração aditiva aplicada no MySQL local após backup validado, sem alterações em dados comerciais.
- [OK] Suíte PHP: 212 testes / 1774 asserções; 12 unitários frontend, lint, Pint, TypeScript e build aprovados.
- [OK] 15 cenários E2E relacionados aprovados, incluindo orçamento/WhatsApp/PDF real sem login, download, edição, navegação e conclusão com orçamento aprovado; captura adicional em 720px aprovada.
- [OK] Capturas das três alterações inspecionadas e decisões documentadas em docs/FICHA_ORCAMENTO_ENVIO.md.
- [PENDENTE] CI remota, merge e publicação na KingHost, incluindo backup de produção e execução da nova migration. Esta tarefa altera somente o ambiente local.

# Checklist final — seleção de Pós-Venda em lote em 02/10/2026

- [OK] Backup local completo dos arquivos e histórico Git criado e verificado antes de editar; caminho registrado em docs/POS_VENDA_SELECAO_EM_LOTE.md.
- [OK] Regra permanente de backup antes de editar registrada em AGENTS.md.
- [OK] Selecionar cards ao lado da busca; caixas no canto superior direito substituem o menu de três pontos, com contagem, Limpar seleção e Cancelar seleção.
- [OK] Excluir selecionados abre confirmação com os números das OS e clientes; cancelar não envia exclusão.
- [OK] Busca preserva a seleção; permite excluir um ou vários cards marcados.
- [OK] Lote atômico autenticado, protegido por CSRF, validado e auditado por card; card indisponível cancela todo o lote.
- [OK] OS, PDFs e histórico de mensagens preservados; regras existentes de Pós-Venda mantidas, sem migrations.
- [OK] 206 testes PHP / 1703 asserções, 12 unitários frontend, lint, Pint, TypeScript e build aprovados.
- [OK] Cenários relacionados do navegador aprovados: fluxo operacional/exclusão individual, navegação e novo fluxo real de seleção/exclusão de 10 cards com preservação de PDFs.
- [OK] Capturas Web/PC em 1280px e 1180px conferidas, mantendo o padrão dos cards existentes.
- [PENDENTE] CI remota e publicação desta alteração na KingHost. A versão publicada anteriormente ainda não possui seleção em lote.

# Checklist final — Sessões e CSRF em 01/10/2026

- [OK] Conta desativada perde acesso web/API em sessão existente e lembrança de login.
- [OK] Desativação administrativa revoga o token antigo de lembrar acesso.
- [OK] Headers personalizados preservam CSRF; uploads mantêm o Content-Type do navegador.
- [OK] Aviso 401/419 mantém o formulário e permite verificar a sessão sem repetir gravações.
- [OK] Login expirado renova token, mantém campos e exige novo envio explícito.
- [OK] Middleware CSRF exercitado de verdade nos testes, inclusive login/logout e lançamento financeiro.
- [OK] Suíte PHP completa: 203 testes e 1648 asserções aprovados em SQLite em memória.
- [OK] ESLint, Pint, TypeScript/build e 12 testes unitários frontend aprovados.
- [OK] league/commonmark atualizado de 2.10.0 para 2.10.2; auditoria Composer sem avisos de vulnerabilidade e 203 testes PHP aprovados novamente.
- [OK] Quatro E2E novos aprovados no backend real; aviso conferido em 390 px.
- [OK] Suíte completa Playwright: 103 testes aprovados em 9,6 minutos, com retries 0.
- [PENDENTE] CI no head final, publicação e smoke test de sessão/cookies/HTTPS na KingHost.
- [PENDENTE] Demais itens dos blocos Segurança A/B: especificação detalhada ainda não consta no repositório.

Detalhes e limites em `docs/SEGURANCA_SESSAO_CSRF.md`.

# Checklist final — Correções de verificações em 01/10/2026

- [OK] Teste de estorno fixa setembro antes de criar pagamento e transação.
- [OK] E2E do gráfico escolhe setembro antes de verificar dias e valores.
- [OK] Suíte PHP: 195 testes e 1612 asserções aprovados em SQLite em memória.
- [OK] ESLint configurado, sem erros/avisos, e incluído na CI frontend.
- [OK] TypeScript, build e 7 testes unitários frontend aprovados.
- [OK] Pint aprovado; finais PHP em LF definidos no Git.
- [OK] Suíte completa Playwright: 99 testes aprovados em 9,3 minutos, com retries 0.
- [PENDENTE] Push/publicação, fora do escopo desta correção.

# Checklist final — Bloco B: Financeiro

## Estornos

- [OK] Estorno é registrado e exibido como saída negativa.
- [OK] Estorno informa OS, motivo, forma de devolução, responsável e data/hora.
- [OK] Formas de devolução limitadas no backend e na interface a Pix e Dinheiro.
- [OK] A devolução não altera nem abate a forma do pagamento original.

## Despesas

- [OK] Novas despesas exigem Compra de mercadoria ou Material de uso.
- [OK] Categoria armazenada em coluna própria e anulável para preservar registros anteriores.
- [OK] Despesas históricas sem categoria aparecem como Sem categoria.
- [OK] Aba Despesas respeita o mês selecionado e lista data, categoria, descrição e valor.

## Cálculos e apresentação

- [OK] Líquido calculado como recebido bruto menos estornos menos despesas.
- [OK] Recebido, estornos, despesas e líquido aparecem lado a lado no resumo mensal.
- [OK] Estornos e despesas não são consolidados em um indicador de saídas.
- [OK] Formas de pagamento separam entradas brutas e devoluções pela forma efetivamente usada.
- [OK] Origem das entradas usa o valor de OS após estornos.
- [OK] Gráfico diário mantém entradas, estornos e despesas em séries separadas.
- [OK] Verde sinaliza valores positivos e vermelho fica restrito a valores negativos.

## Rastreabilidade e relatórios

- [OK] Visão Geral, Caixa Diário e Movimentações identificam tipo, OS, usuário, data/hora e detalhes aplicáveis.
- [OK] Caixa Diário inclui despesas lançadas no dia.
- [OK] Relatório financeiro organiza resumo, formas, entradas, estornos e despesas em tabelas separadas.

## Validação executada

- [OK] 13 testes PHP focados do Financeiro, 154 asserções.
- [OK] 7 testes unitários frontend focados em datas e resumo de estorno.
- [OK] TypeScript typecheck e build de produção.
- [OK] Cenários Playwright filtrados do Financeiro e inspeção da captura desktop.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — LGPD e compartilhamento seguro

- [OK] Relatório final inclui aviso conciso de tratamento de dados conforme a LGPD.
- [OK] Link público usa token aleatório de 256 bits e persiste somente o hash, sem identificadores na URL.
- [OK] Links vencem em 30 dias, podem ser revogados e deixam de funcionar quando a revisão é substituída.
- [OK] Download valida documento, prazo, revogação e arquivo antes de responder, com cabeçalhos privados e contagem de acessos.
- [OK] Menu PDF's gera link novo para WhatsApp, exibe a validade e permite revogar links ativos sem reemitir o PDF.
- [OK] Fotos permanecem acessíveis somente por rota autenticada e a URL futura da política de privacidade é configurável.
- [OK] Testes foram criados ou reescritos para as novas regras de segurança.
- [PENDENTE] Testes PHP e E2E, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — Bloco C: Produtos e controle de estoque

## Catálogos e produto

- [OK] Serviços e Produtos possuem telas e opções separadas no menu, preservando os registros existentes.
- [OK] Produto possui nome/descrição, valor de venda, quantidade em estoque e garantia adicional com prazo.
- [OK] Cadastro de produto não possui custo, lote ou cálculo de margem.

## Regras de estoque

- [OK] Produto é baixado ao ser adicionado à OS e devolvido imediatamente ao reduzir ou remover o item.
- [OK] Interrupção devolve os produtos antes de apagar os itens ativos e zerar o total da OS.
- [OK] Orçamento apenas consulta o saldo; não baixa nem reserva estoque.
- [OK] OS finalizada congela o estoque, inclusive em reabertura administrativa.
- [OK] Baixa usa transação e bloqueio de linha, impede saldo negativo e informa a quantidade disponível.
- [OK] Produto zerado permanece cadastrado e indisponível para nova OS; saldo unitário exibe aviso de última unidade.
- [OK] Entrada de estoque soma ao saldo e registra data, quantidade, motivo, usuário, saldo resultante e vínculo com a OS quando aplicável.

## Seletor da OS

- [OK] Pesquisa conjunta de serviços e produtos foi mantida com botão Produto/Serviço ao lado.
- [OK] Seletor exibe Serviços e Produtos em colunas no desktop e abas em telas estreitas.
- [OK] Produtos exibem saldo e quantidade; itens zerados ficam desabilitados na OS.
- [OK] Lista rápida da abertura continua exclusiva de serviços.

## Validação executada

- [OK] 17 testes PHP focados de estoque, catálogo e fluxo de OS, 176 asserções.
- [OK] Build de produção com TypeScript e Vite.
- [OK] 8 cenários Playwright direcionados de catálogo, edição e detalhe da OS.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — Bloco D: Tela da OS, regras e PDFs

## Tela da OS e clientes

- [OK] Botões de retorno destacados na ficha da OS e no histórico do cliente, inclusive retorno do histórico para a OS de origem.
- [OK] Cabeçalho da OS permanece limpo, sem seletor de status e sem ação duplicada de edição da ficha.
- [OK] Editor unificado da OS possui largura adequada e mantém descrições de serviços legíveis.
- [OK] Cadastro rápido de cliente na Nova OS funciona apenas com nome, CPF/CNPJ, telefone e endereço.
- [OK] Ordem aberta acompanha os dados atuais do cliente; ordem concluída preserva o snapshot e os documentos já emitidos.
- [OK] Limite de cinco fotos aplicado na interface e no backend, com fotos quadradas e arquivo final de até 100 KB.

## Finalização, compartilhamento e regras

- [OK] Aviso de conclusão permanece visível e não bloqueia os modais operacionais da OS.
- [OK] Link público do PDF final é criado somente ao clicar em abrir ou compartilhar e expira em 48 horas.
- [OK] Mensagem de WhatsApp usa o PDF final e os dados configurados da empresa.
- [OK] OS reaberta volta para Em Análise, exibe marcador Reaberta e deixa de aparentar status Pago durante o trabalho.
- [OK] Refinalização preserva pagamentos e datas anteriores, sem lançamento retroativo de ajuste financeiro.
- [OK] Se o total refinalizado ficar coberto pelo valor já recebido, a OS volta a Pago; se ficar maior, permanece Aguardando PGTO e cobra apenas o saldo.
- [OK] Ciclos inconsistentes ou reabertos de pós-venda são ignorados/desativados sem derrubar a listagem.

## PDFs e documentos

- [OK] Papel timbrado A4 repete cabeçalho, marca d'água e rodapé sem cortes em todas as páginas.
- [OK] PDF final curto permanece com uma página.
- [OK] PDF final longo pagina a tabela de serviços sem sobreposição ou página vazia artificial.
- [OK] Campo de assinatura técnica e nomenclatura de garantia estão presentes no fechamento.

## Banco de dados

- [OK] Uma única migration torna opcionais os campos secundários de endereço do cliente.

## Validação executada

- [OK] 25 testes PHP direcionados, 294 asserções.
- [OK] TypeScript typecheck e build de produção com Vite.
- [OK] 25 cenários Playwright direcionados para cliente rápido, detalhe/layout, status, quantidade, fluxo operacional, reabertura, financeiro e pós-venda.
- [OK] PDFs curto (1 página) e longo (3 páginas) renderizados com Poppler e inspecionados visualmente página a página.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — Bloco E: Backup e zeramento

## Backup

- [OK] Backups existentes são listados com ações de baixar e apagar.
- [OK] Backup manual é validado, entregue para download e removido do servidor após a resposta.
- [OK] Backup automático mantém somente os dois arquivos mais recentes.
- [OK] Geração continua em PHP puro, sem subprocessos, e só informa sucesso após validar existência e tamanho do ZIP.

## Zeramento

- [OK] Interface e endpoints estão restritos ao perfil Master.
- [OK] A confirmação exige backup recente validado, contagens visíveis, senha do Master e a frase exata `ZERAR BANCO`.
- [OK] Dados operacionais, usuários secundários e arquivos de OS são removidos; configurações, modelos e catálogos estruturais são preservados.
- [OK] Contador da OS e sequência de clientes voltam ao início, com auditoria preservada para a operação.

## Validação executada

- [OK] Sintaxe PHP, Pint e TypeScript typecheck.
- [PENDENTE] Testes PHP e E2E, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — Bloco F Parte 1: Aparência e texto

## Orçamento e painel

- [OK] Resultado da busca do orçamento possui cantos arredondados e conteúdo alinhado à esquerda junto do ícone.
- [OK] Ações dos orçamentos possuem espaçamento sem alterar cores, tamanhos, formatos ou rótulos.
- [OK] Botão Adicionar serviços reutiliza o seletor completo já usado na finalização.
- [OK] Ver finalizadas abre diretamente a aba Finalizadas das Ordens de Serviço.

## Mobile e texto

- [OK] Modo Mobile/Tablet não exibe o menu hambúrguer e mantém somente OS abertas, Nova OS e Clientes na barra fixa.
- [OK] Campos de texto livre e descrições usam o corretor ortográfico nativo do navegador ou dispositivo.

## Assinatura técnica

- [OK] Processamento preserva o canal alfa de PNG transparente, com fundo claro na tela e no PDF.
- [OK] Master e Administrador podem remover a assinatura após confirmação; arquivo, configuração e auditoria são atualizados.
- [OK] Tela e PDF permanecem funcionais sem assinatura cadastrada.

## Validação executada

- [OK] TypeScript typecheck e build de produção com Vite.
- [OK] Sintaxe PHP e Pint nos arquivos PHP alterados.
- [PENDENTE] Testes PHP e E2E, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — lote de botões, finalização, valores e preço livre

- [OK] Botões de ação e conclusão receberam o alinhamento e o destaque solicitados.
- [OK] Nomes e apelidos das listas foram centralizados e equilibrados.
- [OK] Finalização exige laudo, oferece melhoria por IA e não exibe Resultado do atendimento no formulário ou PDF.
- [OK] Valor combinado bloqueia divergências e pode ser atualizado com auditoria.
- [OK] Mensagem de validade do link informa 30 dias.
- [OK] Campos monetários usam entrada contínua com duas casas decimais.
- [OK] Serviços podem ser cadastrados com preço livre; preço fixo é imposto pelo servidor e preço livre exige valor positivo na OS.
- [OK] Migração adiciona somente a coluna booleana de configuração solicitada, sem remover ou renomear dados.

## Validação executada

- [OK] TypeScript typecheck, sintaxe PHP e Pint dos arquivos PHP alterados.
- [PENDENTE] Testes PHP e E2E, por instrução expressa deste lote.
- [PENDENTE] Push, por instrução expressa deste lote.

# Checklist final — senha do sistema e edição da OS

- [OK] A OS exige senha do sistema ou a escolha explícita Sem senha e armazena a senha com criptografia do Laravel.
- [OK] A senha não integra a resposta comum da OS e possui consulta separada, restrita a Master e Administrador, com auditoria sem o segredo.
- [OK] Conclusão e interrupção removem a senha automaticamente.
- [OK] A ficha permite editar os campos técnicos solicitados e o tipo de atendimento sem sair da tela.
- [OK] OS concluída, interrompida ou arquivada é bloqueada também no backend.
- [OK] Testes de regressão foram escritos e os testes antigos de criação e edição foram atualizados sem remoções.
- [PENDENTE] Migração local e testes PHP/E2E, por instrução expressa deste lote.
- [PENDENTE] Push, por instrução expressa deste lote.

## Ajustes pós-lote de preço livre

- [OK] A finalização permite editar o valor de qualquer item e preserva a exigência de valor positivo para serviço de preço livre.
- [OK] Nova OS envia valor unitário somente para serviços de preço livre.
- [OK] Limpeza da marcação de valor combinado é testada com total correspondente; divergência permanece coberta separadamente.
- [OK] Fluxos E2E de conclusão preenchem o laudo obrigatório antes do envio.

## Correções após teste do usuário

- [OK] Cadastro de serviço mantém Nome, Valor e Adicionar na linha principal, com Preço livre em linha própria.
- [OK] Apelido e etiquetas permanecem centralizados e as etiquetas de Ordens usam disposição horizontal com quebra responsiva.
- [OK] Serviço de preço livre permite editar e salvar o valor na ficha da OS, preservando o valor até a finalização.
- [OK] Laudo Final é preenchido e melhorado somente na ficha; texto vazio bloqueia e focaliza o campo antes de abrir a finalização.
- [OK] Finalização usa o texto atual da ficha, inclusive antes de o usuário acionar Salvar Laudo Final.

### Validação executada

- [OK] TypeScript typecheck.
- [PENDENTE] Testes PHP e E2E, por instrução expressa deste lote.
- [PENDENTE] Push, por instrução expressa deste lote.


# Checklist final — Fornecedores e compras (02/10/2026)

- [OK] Backup externo verificado de código, alterações locais, histórico Git, banco e arquivos privados antes da edição/migração.
- [OK] Menu Fornecedores, cadastro, busca, filtro de situação, paginação, edição e inativação.
- [OK] Ficha com contatos, compras, recebimentos e produtos adquiridos, usando dados reais do servidor.
- [OK] Compra com produto existente ou novo, quantidade e custo independente do preço de venda.
- [OK] Compra pendente não altera saldo; recebimentos totais/parciais integram o estoque existente.
- [OK] Repetir a mesma confirmação não duplica compra/recebimento/entrada.
- [OK] Produto e entrada manual podem ficar sem fornecedor; brinde tem custo zero, distinto de custo desconhecido.
- [OK] Snapshots históricos, cancelamento somente do saldo pendente e autorização/auditoria no backend.
- [OK] Backup, restauração e limpeza futura do banco contemplam o módulo, com testes isolados.
- [OK] Migração aditiva local e hashes dos dados existentes preservados; sem alteração em produção.
- [OK] PHP completo: 222 testes, 1.873 asserções. Frontend unitário: 12 testes. E2E próprio aprovado.
- [OK] Pint, lint, typecheck e build; conferência visual desktop/mobile.
- [OK] Suíte E2E completa: 106 testes aprovados, sem retries. MySQL isolado: 17 testes de fornecedores/estoque/backup, 138 asserções.
- [PENDENTE] Publicação na KingHost, CI do novo commit e validação real de produção.
- [PENDENTE] Próximas etapas: contas a pagar, devoluções ao fornecedor e custo/margem por baixa de lote.
- [PENDENTE] Cópia comercial, remoção global de marca, assinatura e estratégia de isolamento entre empresas.


## Correção de isolamento descoberta na validação de Fornecedores

- [OK] Backup/restauração limitados ao banco configurado, sem enumerar bancos de outras aplicações.
- [OK] Teste com outro schema acessível comprova que seus registros não integram o backup e não são alterados pela restauração.
- [OK] Restaurar dados preserva o registro de migrações correspondente às tabelas instaladas.
- [OK] Testes MySQL bloqueados em banco de uso; arquivos PHPunit/E2E separados dos arquivos privados locais.
- [OK] Recuperação do incidente local: 35 tabelas e 123 arquivos privados conferidos por hash com o backup; migração nova preservada e tabelas novas vazias.
- [OK] As 22 tabelas da outra aplicação acessível conferem com o backup anterior.
- [OK] Suíte E2E repetida com arquivos privados isolados: 106 aprovados. Conferência final preservou as 35 tabelas, os 123 arquivos privados e a migração nova; somente a auditoria legítima do novo backup foi acrescentada.

## Fornecedores — cadastro, pagamentos e notas (02/10/2026)

- [OK] Backup de código, banco e arquivos validado antes da edição/migração.
- [OK] CPF/CNPJ, razão social, nome fantasia, celular, WhatsApp e endereço completo obrigatórios; fixo opcional.
- [OK] Máscaras de contato e validação no backend; CEP preenche cidade/UF/endereço com fallback manual.
- [OK] Dígitos de CPF/CNPJ numérico/alfanumérico e duplicidade validados no servidor.
- [OK] Consulta assistida de CNPJ numérico na base pública, sem falsa confirmação oficial; links de consulta da Receita.
- [PENDENTE] Consulta automática oficial de existência/situação do CPF: exige contratação e credenciais; não simulada.
- [OK] Condições à vista, a prazo, parcelada e duplicata; oito formas de pagamento; parcelas com valor/vencimento.
- [OK] Quitação auditada por parcela e cancelamento de título em aberto; sem duplicação automática de despesas.
- [OK] Lembretes no sino para Master/Admin, com catch-up e encerramento ao pagar/cancelar.
- [OK] Notas fiscais privadas PDF/imagem, validação real de arquivo, download autorizado e inclusão em backups.
- [PENDENTE] Publicação desta extensão no servidor: alteração/testes locais; produção não atualizada.

- [OK] Verificações desta extensão: 230 testes PHP, 25 em MySQL isolado, 106 E2E gerais, 2 fluxos finais de fornecedores, 12 unitários de frontend, lint, TypeScript, Pint e build. Dados locais/arquivos privados conferidos por hash.

## Controle de Gasto — primeira etapa (02/10/2026)

- [OK] Documentação mestre/referências/README lidos antes da edição; escopo e limites documentados.
- [OK] Backup externo do código, alterações locais e histórico Git verificado; banco/arquivos privados validados antes da migração local.
- [OK] Menu abaixo de Financeiro e identidade ARL; desktop/mobile e popups conferidos no navegador.
- [OK] Instituições, tipos, responsáveis configuráveis e cadastro manual de compra parcelada, mensal ou única.
- [OK] Divisão individual/Casal em centavos, preservando o valor original e as divisões anteriores.
- [OK] Pagamento parcial/individual/lote, antecipação e abatimento; registro do pagador e do usuário responsável.
- [OK] Idempotência, bloqueio de valor acima do saldo e transação integral no lote.
- [OK] Quitadas, canceladas, desfazer com motivo, encerramento de recorrência, projeção de doze meses e auditoria.
- [OK] Recorrências preenchem meses intermediários sem duplicação; alertas pessoais não são escondidos pelos gastos da outra pessoa.
- [OK] Perfil Controle de Gasto limitado ao módulo no backend; Usuário local limitado à consulta e abertura operacional.
- [OK] Tabelas independentes; zero despesas importadas/semeadas; 47 conjuntos de dados existentes e 128 arquivos privados locais preservados por hash.
- [OK] Backup/restauração recuperam dados e saldo do módulo.
- [OK] 247 testes PHP (2.149 verificações), 42 testes MySQL isolados (414 verificações) e 12 unitários de frontend aprovados.
- [OK] Suíte geral de navegador: 110 testes aprovados; build final e três fluxos finais do módulo aprovados; lint, TypeScript e Pint sem falhas.
- [OK] Cadastro por foto com extração local e revisão obrigatória antes de salvar; detalhes na etapa abaixo.
- [PENDENTE] Estorno da compra com redistribuição automática entre parcelas restantes.
- [PENDENTE] Avisos agendados/push e relatórios próprios/exportação.
- [PENDENTE] Publicação desta etapa no servidor; somente ambiente local atualizado.

## Controle de Gasto — cartões (02/10/2026)

- [OK] Backup externo verificado de código/histórico e banco/arquivos privados antes da migração; 54 conjuntos de dados e 128 arquivos privados preservados.
- [OK] Galeria pesquisável dos dez bancos solicitados, modelos ilustrativos identificados e arte oficial Bradesco Neo local.
- [OK] Upload privado JPG/PNG/WebP, prévia, enquadramento por zoom/posição, normalização JPEG 856×540 até 100 KB.
- [OK] Bloqueio de salvamento enquanto o enquadramento aguarda confirmação; remoção/substituição da imagem sem alterar valores financeiros.
- [OK] Autorização no backend, rejeição de arquivos inválidos/grandes, limpeza em falha transacional e restauração do arquivo/vínculo verificada.
- [OK] Acabamento 3D nos cartões, painéis e responsáveis; cor dos cadastros antigos preservada.
- [PENDENTE] Publicação desta alteração no servidor; ambiente local apenas.
- [OK] 252 testes PHP gerais, 23 MySQL isolados, 12 unitários de frontend e cinco fluxos de navegador aprovados; lint, TypeScript, Pint e build aprovados.

- [OK] Cards de instituições compactados para 250 px, com cartões proporcionais e acabamento 3D preservado; backup externo anterior verificado.
- [OK] Build/TypeScript, lint e cinco fluxos de navegador aprovados após compactação; captura desktop conferida.


## Controle de Gasto — dívidas por foto (02/10/2026)

- [OK] Backup externo de código/alterações/histórico e banco/arquivos privados verificado; 54 tabelas existentes e 128 arquivos privados preservados por hash.
- [OK] Foto/câmera, prévia, rotação e progresso; OCR português executado no navegador com recursos locais.
- [OK] Lista com rolagem e fichas 3D editáveis: nome, valor por parcela, parcela atual, total, responsável e tipo.
- [OK] Padrões de instituição/mês/vencimento/divisão, seleção de compras e conferência obrigatória antes de salvar.
- [OK] Totais/pagamentos/estornos ignorados; alerta de linha repetida/leitura incerta e revisão do texto extraído.
- [OK] Cadastro transacional, retry e bloqueio da mesma foto por instituição; backup/restauração mantêm compras e proteção contra repetição.
- [OK] Foto e texto bruto não enviados/armazenados; backend restringe o módulo aos perfis autorizados.
- [OK] 258 testes PHP, 29 MySQL isolados e 17 unitários de frontend aprovados; leitura real de imagem em navegador e regressões verificadas.
- [OK] Lint, TypeScript, Pint e build; desktop/mobile inspecionados.
- [PENDENTE] Publicação desta alteração no servidor; disponível no ambiente local.

## Leitura opcional Gemini — 03/10/2026

- [OK] Integração backend, chave privada, consentimento, autorização, limites de tentativas/tokens/custo estimado, cache e revisão obrigatória implementados e testados com respostas Google simuladas.
- [OK] Alternativa Tesseract real e cadastro financeiro verificados em navegador; 9 E2E do módulo passaram.
- [OK] 40 testes em MySQL isolado (353 verificações), 11 testes PHP específicos e suíte geral de 267 testes PHP passaram; lint, TypeScript e build verificados.
- [OK] Backup externo verificado em `C:\Users\Allan\ARL-backups\controle-gasto-gemini-20261003-001607`; hashes de 55 tabelas existentes e 128 arquivos privados preservados.
- [PENDENTE] Resolver permissão da conta Google, configurar chave e faturamento, validar precisão/custo com fatura real. Integração permanece desligada.
- [PENDENTE] Publicação em produção, precedida de backup validado do banco e arquivos privados do servidor.

## Mistral — leitura por foto (03/10/2026)

- [OK] Provedor Mistral OCR 4.1 integrado, chave privada configurada, consentimento explícito, cache, limites e leitura No aparelho preservados.
- [OK] API real HTTP 200: imagem fictícia e fatura de novembro com 9 compras; os 9 valores, parcelas atuais e totais de parcelas conferiram. Nenhuma dívida cadastrada nesses testes reais. Precisão validada nessas amostras.
- [OK] 274 testes PHP (2.345 verificações), 45 testes em MySQL isolado (385 verificações), 17 testes frontend e 9 E2E do módulo passaram. Build/TypeScript, lint e Pint passaram. Dois E2E tiveram seletor corrigido e passaram na repetição.
- [OK] Backup verificado em `C:\Users\Allan\ARL-backups\controle-gasto-mistral-20261003-013308`. Preservados 55 tabelas preexistentes e 128 arquivos privados; apenas 2 registros de leitura autorizados adicionados à tabela de consumo.
- [PENDENTE] Publicação em produção com backup prévio validado, configuração da chave privada e verificação no servidor.
- [PENDENTE] Reformulação de Fornecedores; depois, interface própria Mobile/Tablet completa para Controle de Gasto, com acabamento 3D.

## Revisão por foto e menus — 03/10/2026

- [OK] Seletores gerais opcionais na barra inferior para cartão e tipo; escolhas individuais por compra, revisão obrigatória e salvamento atômico com proteção contra repetição em cada cartão.
- [OK] Percentuais exibidos somente para Casal; cartões/tipos gerais aplicados como padrão sem sobrescrever escolhas individuais. Navegação azul com item ativo vermelho; seletores azuis/foco vermelho.
- [OK] Backup externo verificado em `C:\Users\Allan\ARL-backups\controle-gasto-revisao-20261003-015022`; 55 tabelas preservadas por hash e 128 arquivos privados, com alteração somente de timestamps de leitura em notificações pelo uso simultâneo do app. Dados financeiros preservados. Nenhuma migração.
- [OK] 276 testes PHP (2.366 verificações), 47 testes MySQL isolado (406 verificações), 17 testes frontend, build/TypeScript, lint e Pint. Oito cenários E2E passaram: seis na rodada inicial, o novo teste de padrões após correção da asserção do contrato e dois testes do leitor local após isolar a configuração de API no servidor de testes.
- [PENDENTE] Publicar esta atualização no servidor com backup prévio validado.


## Cards compactos e azul claro — 03/10/2026

- [OK] Cards compactos em azul claro, avatares de homem/mulher/casal e aviso opcional de resumo pessoal separado.
- [OK] Cadastrar por foto e Nova dívida em azul com texto vermelho; revisão individual compactada sem remover campos.
- [OK] Build/TypeScript, lint e quatro E2E passaram; inspeção de capturas desktop/mobile. Sem chamada paga nem migração.
- [OK] Backup externo verificado em `C:\Users\Allan\ARL-backups\controle-gasto-resumo-compacto-20261003-020346`; 55 tabelas e 128 arquivos privados preservados, notificações alteradas somente nos timestamps de leitura.
- [PENDENTE] Publicação e interface Mobile/Tablet completa do módulo em etapa própria.


## Resumo e vencimentos por foto — 03/10/2026

- [OK] Menu único Resumo; perspectivas pessoal/casal preservadas para contas vinculadas e Projeção direcionada ao mês do casal.
- [OK] Seletor de mês compacto com calendário e setas; navegação dezembro/janeiro verificada no navegador.
- [OK] Caixa superior removida, responsável escolhido em cada compra; mês/dia da fatura numa linha compacta. Cartão/tipo gerais opcionais no rodapé.
- [OK] Com cartão geral, dia bloqueado e obtido do cadastro no backend. Sem cartão geral, dia manual respeitado. Regra apenas para novas importações, sem migração.
- [OK] Nove testes PHP (79 verificações), oito E2E, build/TypeScript, lint e Pint passaram. API externa simulada nos testes, sem chamada paga.
- [OK] Backup externo de código, alterações e histórico Git validado: `C:\Users\Allan\ARL-backups\controle-gasto-mes-resumo-20261003-021234`. Arquivos privados existentes preservados. O app local foi usado simultaneamente, com novos cadastros/alterações nas tabelas de gastos; não restaurados nem sobrescritos.
- [PENDENTE] Publicação e interface própria Mobile/Tablet completa em etapa futura.


## Pagamentos e contagens — 03/10/2026

- [OK] Opções explícitas de quitar parcela inteira, valor parcial ou parte de Allan/Carol, preservando quem efetivamente pagou e histórico.
- [OK] Prévia dos saldos e resumo de parcelas parcialmente pagas, com valores por responsável. Exemplo de R$350 validado sem alterar dívidas de uso real.
- [OK] Instituições preservadas ao filtrar responsável; contagens por tipo antes da paginação, zeros nos tipos vazios e filtro mantido ao abrir cartão.
- [OK] Cards de navegação em azul e cartões reduzidos mais 10% (250→225 px), preservando arte.
- [OK] 19 testes PHP/249 verificações, 28 MySQL isolado/328 verificações; cinco cenários E2E concluídos, com seletor acessível corrigido no novo teste. Build/TypeScript, lint e Pint passaram.
- [OK] Backups locais verificados de pagamentos e contagens documentados em CONTROLE_GASTO.md. Sem migrações; cadastros simultâneos no localhost preservados.
- [PENDENTE] Publicação com backup do servidor e interface Mobile/Tablet completa em etapa própria.


## Listas, resumo e quitação da instituição — 03/10/2026

- [OK] Lista/Cards para instituições e projeção; contagens por responsável preservadas.
- [OK] Resumo Allan/Carol/Casal com métricas e vencimentos próprios; Casal contém apenas despesas compartilhadas.
- [OK] Pagamento por instituição/mês com simulação, prioridade pessoal/parte do casal e proteção do saldo da outra pessoa.
- [OK] Transação, idempotência, rejeição de saldo excedente/prévia alterada e histórico por parcela.
- [OK] Confirmação antes de editar/excluir; exclusão lógica preserva pagamentos. Quitadas saem de Gastos e ficam no histórico existente.
- [OK] 281 testes PHP (2487 verificações), 30 testes MySQL isolado (376 verificações), sete cenários E2E. Build/TypeScript e lint passaram.
- [OK] Backups externos validados: controle-gasto-lista-resumo-20261003-023730 e controle-gasto-quitacao-instituicao-20261003-024604 em C:\Users\Allan\ARL-backups.
- [PENDENTE] Publicação com backups do servidor e interface Mobile/Tablet completa em etapa futura.


## Calendário e cards compactos — 03/10/2026

- [OK] Mês MM/AAAA ao lado dos botões menores; seletor de ano/doze meses, setas e Mês atual; transição dezembro/janeiro verificada.
- [OK] Resumo mais próximo dos menus; card da compra compactado com valores de 16px e ações na linha do título.
- [OK] Projeção inicia em Lista a cada entrada; Cards disponível durante a visita.
- [OK] Gastos preserva Lista/Cards por conta autenticada neste navegador, sem misturar usuários; não sincroniza dispositivos.
- [OK] Oito cenários E2E verificados (sete passaram na execução ampla; correção do carregamento da preferência e dois cenários focados passaram depois). Conferência visual desktop/mobile, 21 testes PHP/297 verificações, build/TypeScript e lint passaram.
- [OK] Backup de código/alterações/histórico validado: C:\Users\Allan\ARL-backups\controle-gasto-calendario-20261003-025548. Nenhuma migração ou publicação.
- [PENDENTE] Publicação e interface Mobile/Tablet completa continuam em etapa própria.


## Fatura do mês e quitação da compra — 03/10/2026

- [OK] Saldo imediato do responsável, pagamento integral/parcial somente no mês aberto, com prévia.
- [OK] Quitar compra baixa todas as parcelas pendentes, inclusive futuras e as duas partes do casal; protege repetição/prévia alterada e preserva histórico.
- [OK] Filtros de Gastos retornam ao padrão ao abrir pelo menu; Lista/Cards continua memorizado por conta neste navegador.
- [OK] Resumo agrupa vencimentos por instituição e remove painel duplicado.
- [OK] Pagamentos compacto e todos os botões do módulo azuis, inclusive popups; tema das telas de OS preservado.
- [OK] 283 testes PHP/2530 verificações, 32 MySQL isolado/419 verificações e dez E2E passaram. Dois cenários de revisão final passaram depois da padronização azul. Build/TypeScript, lint e Pint aprovados.
- [OK] Backup externo validado: C:\Users\Allan\ARL-backups\controle-gasto-quitar-compra-20261003-031600. Sem migração/publicação/dados financeiros reais alterados por testes.
- [PENDENTE] Publicação e interface Mobile/Tablet completa continuam em etapa própria.


## Histórico compacto e Fixos de Casa — 03/10/2026
- [OK] Quitadas compacto com instituição, nome da compra, valor pago e abatimento separado.
- [OK] Projeção com fonte e dimensões menores, mantendo informações e lista padrão.
- [OK] Pagamentos por instituição/tipo com quantidades completas do mês e detalhes sob demanda.
- [OK] Grupo Fixos de Casa e restrição de tipo aplicada no backend; vencimentos próprios por conta.
- [OK] Forma de pagamento prevista opcional, sem alterar saldos.
- [OK] Backups externos de arquivos/Git e banco/arquivos privados verificados.
- [OK] 285 testes PHP, 34 MySQL, 17 frontend e 11 fluxos E2E validados; build, lint e Pint.
- [OK] Arte do cartão Fixos de Casa recriada na execução das 07h; detalhes na atualização geral abaixo.
- [OK] Área interna de Fornecedores reorganizada/ampliada; limites e pendências explícitos abaixo.
- [PENDENTE] Publicação destas alterações em produção.


## Atualização geral das 07h — 03/10/2026

- [OK] Novo cartão Fixos de Casa branco/3D criado com imagegen e integrado como recurso estático independente de IA em produção.
- [OK] Fixos de Casa por último por identificação persistente, inclusive instituições novas, configuração/seletoras, resumo e pagamentos; indicador de próximo vencimento continua cronológico.
- [OK] Botão Nova OS pequeno em cápsula preto/vermelho com sombra, ícone/texto brancos e ação preservada.
- [OK] Lista paginada de fornecedores e ficha individual organizada; teste com 20 fornecedores e conferência desktop/mobile.
- [OK] Cadastro obrigatório/máscaras/CEP/CNPJ anteriores preservados; complemento de inscrições/tipo/representante/site, condições comerciais e banco/Pix.
- [OK] Vínculos de produtos por fornecedor, marca/código/custo/mínimo/entrega; último custo recebido real. Produtos sem fornecedor e brindes zero preservados.
- [OK] Compras/recebimentos/parcelas/histórico preservados; lote opcional; juros/descontos ao quitar o título com principal e dinheiro pago separados.
- [OK] Documentos PDF/imagem/XML privados, validação de conteúdo/entidades e downloads com autorização no backend; backup/restore/zeramento verificados.
- [OK] Devolução transacional/idempotente com saldo recebido/estoque conferidos, motivo, crédito/reembolso/troca/negociação e movimento de saída legível no histórico.
- [OK] Ocorrências e avaliação interna, relatórios por período da compra, totais completos em páginas diferentes, alertas de pagamento/entrega/custo.
- [OK] Novos endpoints protegidos por Master/Administrador; perfil de Controle de Gasto bloqueado no backend.
- [OK] 291 testes PHP/2637 asserções; 57 testes MySQL isolado/712 asserções; 17 testes frontend; build/TypeScript, lint e Pint.
- [OK] Navegador: 125 cenários passaram na suíte geral; o teste restante de galeria foi atualizado para 12 cartões e confirmação obrigatória de edição. Revisão final de cinco cenários passou, incluindo esse fluxo, fornecedor completo e mobile; 11 cenários de Controle de Gasto também passaram na revisão focada.
- [OK] Backup externo prévio verificado em C:\Users\Allan\ARL-backups\atualizacao-geral-20261003-070057; backups anteriores preservados. Migração somente local; 51 conjuntos e 128 arquivos privados conferidos contra backup, com diferenças esperadas de migração/auditoria e timestamps de dois lembretes.
- [PENDENTE] Consulta oficial automatizada da existência de CPF: depende de serviço/credencial externo; nenhuma contratação ou validação fictícia.
- [PENDENTE] Matriz granular por ação/usuário, pagamento parcial de títulos ao fornecedor e consumo automático de créditos: fluxos adicionais, sem interface fictícia ou alteração de regras existentes nesta entrega.
- [OK] Interface própria Mobile/Tablet do Controle de Gasto entregue na revisão abaixo, mantendo as funções e permissões existentes.
- [PENDENTE] Publicação: requer backup validado do servidor, implantação e migrations; produção não foi acessada nesta execução.

Detalhes e alcance em `docs/FORNECEDORES_FICHA.md`. O agendamento único é encerrado ao entregar esta revisão local.


## Fornecedores — organização de compras e produtos (03/10/2026)
- [OK] Financeiro em linhas por compra, totais/contagens anteriores à paginação e próximas datas.
- [OK] Detalhes da compra em popup com abas, atalhos e parcelas numeradas inicialmente recolhidas; ações de pagamento, notas e recebimento preservadas.
- [OK] Produto adquirido abre popup com dados atuais, condições comerciais e histórico de compras/custos/lotes/devoluções, protegido e paginado.
- [OK] Desktop/mobile, 32 parcelas, backend SQLite/MySQL, frontend, build/TypeScript, lint e Pint verificados. Resultados detalhados em docs/FORNECEDORES_FICHA.md.
- [PENDENTE] Limpeza dos cadastros de fornecedores: aguarda resposta sobre dados de teste versus registros reais/todos os dados locais. Nenhum registro foi apagado nesta revisão.


## Controle de Gasto — Mobile/Tablet (03/10/2026)
- [OK] Resumo inicial compacto: total do mês, pago/abatido, Allan, Carol e Casal; partes compartilhadas sem duplicação no total.
- [OK] Saldos e primeiro vencimento pendente por instituição, filtro individual/casal, indicação de atraso e acesso aos gastos correspondentes.
- [OK] Mês no topo e Nova dívida com escolha manual/foto, consentimento IA e revisão obrigatória; câmera/galeria existentes preservadas.
- [OK] Parcelas em blocos no mobile, campos legíveis, ações tocáveis; oito menus existentes acessíveis e desktop preservado.
- [OK] Quatro atalhos inferiores somente com ícones para Master/Administrador, Nova OS vermelha; funcionário/exclusivo mantêm restrições backend.
- [OK] Backup externo verificado; testes isolados, revisão visual 320/393/768px, 293 PHP, 17 frontend, 11 E2E desktop, cinco regressões mobile e três fluxos mobile novos; build/TypeScript e lint.
- [PENDENTE] Publicar e testar no aparelho físico após a implantação autorizada. Esta entrega permanece local.


## Controle de Gasto — correção HTTP local e vínculo (03/10/2026)
- [OK] Cadastro manual, foto/IA, OCR local e IDs de pagamentos compatíveis com ausência de randomUUID/subtle no acesso por IP HTTP; sem enfraquecer UUID/idempotência ou enviar foto do OCR local.
- [OK] Mobile somente com seis menus, organizados em grade; Ajustes/Histórico mantidos no Web/PC.
- [OK] Conta vinculada inicia na parte do responsável (individual + sua parte do casal), com saldo principal e instituições filtrados, permitindo trocar de visão.
- [OK] Backup externo verificado, 19 testes frontend, 16 E2E, build/TypeScript, lint e revisão visual. Dados e testes isolados, sem chamadas pagas.
- [PENDENTE] Repetir conferência no celular físico do proprietário após recarregar a página; produção permanece sem publicação.


## Cadastro de fornecedor — acabamento em 03/10/2026
- [OK] Consulta de documento separada de Contato, botão com ícone/estilo e espaçamento.
- [OK] Campos com bordas definidas, rótulos legíveis e contatos empilhados compactos; campos de 16px no celular.
- [OK] Novo cadastro usa celular como WhatsApp; edição preserva WhatsApp diferente até mudar celular. Cenários reais de API em banco isolado.
- [OK] Verificação visual desktop/mobile e ausência de overflow no popup. Capturas locais em output/fornecedores.
- [OK] Lint, TypeScript/build, 19 testes frontend, 24 testes PHP (291 verificações) e quatro cenários E2E distintos de fornecedores aprovados. Cenário visual repetido após acrescentar verificações geométricas.
- [OK] Backup externo verificado em C:/Users/Allan/ARL-backups/supplier-form-20261003-123005; nenhuma migração ou alteração direta do banco de uso.
- [PENDENTE] Publicação no servidor, fora desta execução.


## Registro de compra — duas colunas
- [OK] Produtos, recebimento e pagamento à esquerda; fechamento/total/nota à direita, empilhados no celular.
- [OK] Campos legíveis, relevo discreto e rodapé acessível; conferência visual e geométrica desktop/mobile.
- [OK] Lint, TypeScript/build, 19 testes frontend e três fluxos E2E, incluindo nota/parcelas/recebimento/reenvio sem duplicação.
- [OK] Backup externo verificado: C:/Users/Allan/ARL-backups/supplier-purchase-layout-20261003-123752. Sem mudança direta no banco de uso.
- [PENDENTE] Publicação no servidor, fora desta execução.


## Histórico de compras detalhado
- [OK] Cards com número, itens/quantidades do snapshot, datas reais de compra/recebimento e estado da entrega.
- [OK] Condição/forma, parcelas/valores, próxima parcela e contagens pagas/canceladas, total/pago/em aberto.
- [OK] Leitura em lote da página; sem migração ou alteração dos registros históricos.
- [OK] Lint, TypeScript/build, Pint, 19 testes frontend, 25 testes PHP (314 verificações) e quatro cenários E2E; revisão visual desktop/mobile.
- [OK] Backup externo verificado em C:/Users/Allan/ARL-backups/supplier-history-20261003-124539.
- [PENDENTE] Publicação no servidor, fora desta execução.


## Popup de detalhes da compra — tamanho padrão
- [OK] Largura/altura/posição estáveis nas quatro abas; corpo rolável e fechamento fixo, limitado à tela.
- [OK] Teste geométrico desktop/celular e conferência visual; três fluxos E2E, lint, TypeScript/build e 19 testes frontend aprovados.
- [OK] Backup externo verificado: C:/Users/Allan/ARL-backups/supplier-dialog-size-20261003-125445. Sem alteração do banco de uso.


## Popups de Fornecedores — padrão unificado
- [OK] Moldura única de até 1180 × 760px para formulários e detalhes, limitada à tela, com rolagem interna e ações fixas.
- [OK] Troca das abas de compra/produto mantém dimensões e posição no desktop e celular; formulários compartilham o padrão.
- [OK] Lint, TypeScript/build, 19 testes frontend e quatro fluxos E2E aprovados; revisão visual desktop/mobile.
- [OK] Backup externo verificado: C:/Users/Allan/ARL-backups/supplier-popup-standard-20261003-130019. Banco de uso preservado.
- [PENDENTE] Publicação no servidor, fora desta execução.


## Menu lateral e Usuários — 03/10/2026
- [OK] Usuários dentro de Configurações, exclusivo do Master; URL anterior compatível e Configurações destacada.
- [OK] Fixado/Fixar compacto com persistência preservada, barra de 26px, fonte de 10px e ícone de 12px.
- [OK] Abas de Configurações em uma linha com rolagem horizontal se necessário; interferência do estilo legado corrigida por seletor específico.
- [OK] Lint, TypeScript/build e 19 testes frontend. Suíte inicial com 32 cenários aprovados; expectativa de quantidade de abas atualizada para nove, ajuste de quebra de linha validado e três cenários focados aprovados, incluindo cadastro real de usuário em banco de teste.
- [OK] Diagnóstico dos tipos Fixo Casa/Fixos de Casa somente de leitura, sem excluir ou reclassificar dívidas.
- [OK] Backup externo verificado: C:/Users/Allan/ARL-backups/menu-settings-20261003-134223 (1788 arquivos e histórico Git).
- [PENDENTE] Unificação dos tipos de despesas domésticas e publicação no servidor, fora do pedido atual.


## Desktop com ajuste automático — 03/10/2026
- [OK] Adaptação à largura/altura útil pelo CSS, inclusive redimensionamento em tempo real, sem alterar o zoom do navegador ou a preferência de layout.
- [OK] Menus laterais completos, logo/rodapé acessíveis e nav sem rolagem nos oito tamanhos testados: 1280×720, 1360×768, 1366×768, 1440×900, 1440×1080, 1920×1080, 2560×1440 e 1280×640.
- [OK] Onze telas principais carregadas, dados isolados de cliente/produto/fornecedor, sem overflow horizontal da página; popup de cadastro contido e ação de salvar visível.
- [OK] Sete cenários desktop finais, três de cabeçalho e cinco mobile aprovados; seis fluxos de OS/fornecedores aprovados. A interferência inicial entre testes de menu fixado foi corrigida com restauração da preferência ao final do teste.
- [OK] Lint, TypeScript/build e 19 testes frontend aprovados; capturas desktop revisadas.
- [OK] Backup externo verificado: C:/Users/Allan/ARL-backups/desktop-auto-fit-20261003-135745 (1793 arquivos e histórico Git). Banco de uso e Mobile/Tablet preservados.
- [PENDENTE] Publicação no servidor, fora desta execução.


## Exclusão segura dos cadastros de gastos — 03/10/2026
- [OK] Lixeira para instituições e tipos, confirmação explícita e popup compacto com botões azuis.
- [OK] Backend bloqueia saldo em aberto de qualquer mês, recorrência em andamento e exclusão de tipo ligado a instituição exclusiva.
- [OK] Exclusão lógica preserva compras/parcelas/pagamentos e imagens; cadastro retirado dos seletores e bloqueado para novas dívidas/edição direta.
- [OK] Estorno restaura cadastros excluídos quando a dívida volta a ficar em aberto, com auditoria.
- [OK] 28 testes PHP (421 verificações), 19 testes frontend, lint, TypeScript/build e Pint; seis testes no navegador (exclusão + cinco fluxos mobile), com revisão visual desktop e tela estreita.
- [OK] Backup externo de 1809 arquivos/Git e banco/privados de 20391980 bytes verificados em C:/Users/Allan/ARL-backups/expense-catalog-delete-20261003-140859; migração aditiva aplicada localmente.
- [PENDENTE] Publicação no servidor. Nenhum cadastro real foi excluído nesta execução.

## Simulações gerais em volume — 03/10/2026

- [OK] Backup externo de 1.823 arquivos/alterações/Git e pacote validado de banco/privados em C:/Users/Allan/ARL-backups/simulacoes-gerais-20261003-144339.
- [OK] Cenários isolados com 30 clientes/30 OS, 30 fornecedores/30 compras e 48 dívidas em oito instituições; sem cadastros fictícios no banco de uso.
- [OK] Suíte PHP final em SQLite e MySQL: 299 testes e 6.325 verificações em cada motor; 19 testes frontend, lint, TypeScript e build aprovados.
- [OK] Cinco cenários concorrentes reais MySQL; corrigida disputa de repetição do pagamento de OS, sem duplicar dinheiro/estoque.
- [OK] Comparação das 58 tabelas: 57 idênticas; somente updated_at de dois alertas supplier_due mudou. Todos os 266 arquivos privados idênticos; cadastros, valores e estoque de uso preservados.
- [OK] Testes mobile atualizados aos quatro ícones, cenário integrado de volume e 15 testes de financeiro/finalização no navegador aprovados.
- [OK] Rodada completa final de navegador: 136/137 aprovados; expectativa de formato do número da compra corrigida no novo teste de volume e reteste 1/1 aprovado. Total de 137 cenários distintos aprovados, sem falha final pendente.
- [OK] Pint dos arquivos PHP alterados aprovado; relatório detalhado em docs/RELATORIO_TESTES_GERAL_2026-10-03.md.
- [OK] Pint global aprovado após normalização local do final de linha em routes/api.php, sem mudança de código.
- [PENDENTE] Homologação sobre cópia do banco online, backup/restauração do servidor e publicação; integrações externas reais e dispositivos físicos não validados nesta rodada.

## Etiqueta 40 × 20 mm da OS — 04/10/2026

- [OK] Botão pequeno Imprimir Etiqueta na Ficha de entrada, junto de Senha do usuário, também em OS sem senha e no mobile.
- [OK] Popup compacto: nome editável só na etiqueta, separador tracejado, número da OS e ARL Informática pequena; prévia e impressão em 40 × 20 mm.
- [OK] Impressão isolada abre diálogo nativo, sem imprimir menus/popup e sem alterar cliente, OS ou documentos; nome vazio bloqueado e fonte ajustada para nomes longos.
- [OK] Teste E2E de etiqueta aprovado em desktop/mobile, com medida física, impressão interceptada, ajuste de nome longo e preservação do cadastro; regressão da senha aprovada. 19 testes frontend, lint e TypeScript/build aprovados. Capturas revisadas em output/etiquetas.
- [OK] Backup externo de 1.945 arquivos/alterações/Git verificado em C:/Users/Allan/ARL-backups/etiqueta-os-20261004-015749. Sem migração, mudança de dados de uso ou publicação.
- [PENDENTE] Impressão física na B21S: selecionar papel 40 × 20 mm, escala 100%, sem cabeçalho/rodapé; conferir orientação e margens do driver.
## Controle de Gasto: No Mobile.docx — 04/10/2026

- [OK] Projeção futura/Historico de gastos: filtros de responsável/período, gráfico mensal, total, maior/menor mês e comparação; parcelas originais e antecipações separadas conforme regra aceita pelo proprietário.
- [OK] Consulta autenticada com validação de período até 120 meses; recorrências ainda não geradas calculadas sem gravação, valores editados e histórico financeiro preservados.
- [OK] Quitadas compacta por compra, com instituição, nome, valor pago e pagadores; estornos/descontos excluídos do dinheiro pago.
- [OK] Mobile: filtros recolhidos, Lista só com nomes/vencimento, tipos compactos ao abrir instituição, ícone de dinheiro igual a editar/excluir e Projeção sem sobreposição de Ver mês.
- [OK] Regras desktop e preferência Lista/Cards por conta preservadas; filtros de Gastos voltam ao padrão ao entrar e Projeção inicia em Lista.
- [OK] 31 testes / 473 verificações em SQLite e MySQL descartável, 19 testes frontend, lint, TypeScript/build e Pint; 18 cenários distintos de navegador aprovados, com reteste final dos dois novos fluxos após compactação da lista. Capturas desktop/mobile revisadas; histórico sem overflow horizontal em 320px.
- [OK] Backup externo de 1.954 arquivos, alterações locais e Git verificado em C:/Users/Allan/ARL-backups/gastos-mobile-historico-20261004-021521. Sem migração, alteração de dados de uso ou publicação.
- [PENDENTE] Homologação pelo proprietário no celular físico e publicação com backup do servidor, conforme fluxo geral do projeto.
## Política de senha solicitada — 04/10/2026

- [OK] Cadastro, redefinição e instalação: mínimo 6 caracteres, maiúscula e símbolo; regra validada no backend e informada no formulário, sem exigência de número/minúscula.
- [OK] Confirmação, hashing e autorização preservados; senhas existentes não alteradas. Testes cobrem 5/6 caracteres, ausência de maiúscula/símbolo, espaço não sendo símbolo, Unicode, confirmação divergente e instalador bloqueado após uso.
- [OK] 17 testes PHP / 121 verificações de administração/autorização/sessão, E2E de cadastro real com senha de 6 caracteres, lint, TypeScript/build e Pint aprovados. Banco de testes isolado; backup externo verificado em C:/Users/Allan/ARL-backups/senha-usuarios-20261004-024337. Sem publicação.
## Resumo mobile: totais empilhados — 04/10/2026

- [OK] Total original e Pago / abatido em duas linhas, valores alinhados à direita, em qualquer responsável selecionado. Revisão visual e regressão mobile existente aprovadas; lint e TypeScript/build aprovados. Alteração exclusiva de CSS, sem banco/publicação. Backup externo verificado em C:/Users/Allan/ARL-backups/resumo-mobile-linhas-20261004-025257.

## Resumo mobile: instituições compactas — 04/10/2026

- [OK] Nome e saldo na mesma linha, vencimento e responsável/parcelas abaixo; fontes e espaços menores. Divisão de Todos e acesso aos gastos preservados. Lint, TypeScript/build e regressão mobile existente aprovados em banco isolado. Backup externo verificado de 1.972 arquivos, alterações e Git em C:/Users/Allan/ARL-backups/instituicoes-mobile-compactas-20261004-025504. Sem alteração de dados de uso ou publicação.

## Gastos mobile somente em lista — 04/10/2026

- [OK] Gastos mobile sem filtros e sem Cards/Lista; instituições e tipos ativos/customizados em linhas azuis compactas com contagens. Retorno às instituições e aos tipos; ações de pagamento/quitação abaixo da listagem. Preferência e filtros Web/PC, Quitadas e Projeção preservados.
- [OK] Lint e TypeScript/build aprovados; dois fluxos mobile e dois desktop de contagens/preferência passaram em banco isolado. Captura mobile revisada. Backup externo de 444 arquivos de projeto, diff local e histórico Git verificado em C:/Users/Allan/ARL-backups/gastos-mobile-lista-20261004-030248. Sem mudança no banco de uso ou publicação.

## Projeção mobile: responsáveis em linhas — 04/10/2026

- [OK] Allan/Carol/Casal empilhados com retratos, valores à direita, separadores e cores verde/preto/amarelo escuro; mês e total preservados. Estilos exclusivos mobile em Lista/Cards, sem mudanças de cálculo ou desktop. Lint, TypeScript/build e fluxo mobile existente aprovados; captura revisada. Backup externo de 444 arquivos, diff e Git verificado em C:/Users/Allan/ARL-backups/projecao-mobile-linhas-20261004-030841. Sem banco de uso/publicação.

## Performance — Etapa 1 final para release — 04/10/2026

- [OK] Sete itens implementados em commits próprios; contadores com equivalência antes/depois comprovada e uma única consulta de agregação.
- [OK] 307 testes PHP / 6.450 verificações; 21 testes direcionados / 261 verificações; 22 testes frontend; TypeScript, lint, Pint e build final aprovados.
- [OK] 24 E2E relacionados aprovados; perfis Funcionário/Administrador aprovados; reteste final dos cinco cenários específicos de performance aprovado, incluindo paginação.
- [OK] Backups externos verificados; alterações preexistentes preservadas; limpeza restrita aos artefatos desta tarefa; relatório e lista de publicação em docs/PERFORMANCE_ETAPA1_RELEASE.md.
- [PENDENTE] Publicação pelo usuário com backup do servidor; confirmar scheduler/cron real na KingHost e conferência após publicação. Nenhum deploy realizado nesta etapa.

## Publicação geral autorizada — 04/10/2026

Esta seção atualiza a situação da publicação registrada acima; relatórios anteriores descrevem suas respectivas etapas.

- [OK] Release completa `36598494cdf3c789edfc5de6ab555ca543077950` publicada na KingHost a partir de clone do GitHub, sem dados locais/testes/credenciais no pacote.
- [OK] Backup local/alterações/Git, backup protegido #8 do banco e arquivos privados e backup do código anterior baixados e verificados antes da publicação. Versão anterior e entrypoints de retorno preservados.
- [OK] Schema real conferido; dez migrações novas ensaiadas em cópia isolada e aplicadas. 47 migrações registradas; dados de negócio existentes preservados por comparação antes/depois, incluindo 626 clientes, 53 OS e 33 pagamentos.
- [OK] 307 testes MySQL / 6.450 assertions, 22 testes frontend, 24 E2E, lint, Pint, TypeScript/build e auditorias de dependências aprovados.
- [OK] HTTPS, login responsivo sem erros JavaScript, 16 leituras de backend real, permissões, PDF/foto existentes, 71 estáticos públicos e 88 arquivos privados verificados. Sessão autenticada de testes somente em memória; nenhum dado fictício em produção.
- [OK] Mistral configurada privadamente conforme autorização anterior; nenhuma nova chamada paga de teste. APP_KEY, banco, sessão e armazenamento privado preservados.
- [OK] Recuperação histórica completa `post-sale:check` executada com sucesso na release nova; zero ciclos novos.
- [PENDENTE] Cron KingHost observado a cada cinco minutos fora do minuto zero: ajustar para cada minuto no painel e comprovar as tarefas horárias. `crontab` é negado pela hospedagem.
- [PENDENTE] Proprietário confirmar login com senha real e homologação prática PC/celular, impressão B21S e Push nos dispositivos.
- [OK] Relatório completo de publicação, backups, migrações, rollback e limites em `docs/PUBLICACAO_2026-10-04.md`.

## Revisão das falhas da CI e reemissão da release — 04/10/2026

- [OK] Falha original do histórico reproduzida e expectativa corrigida com baseline, cálculo individual, antecipação e variação mensal verificados; nenhuma checagem financeira removida.
- [OK] Timeout posterior diagnosticado por screenshot/trace: menu lateral se recolhia durante o clique. Teste aguarda layout e confirma aba ativa; mantém clique real, timeout e zero retries.
- [OK] 307 testes SQLite e 307 MySQL / 6.450 assertions em cada banco isolado; 22 testes frontend; lint, TypeScript, Pint, build e npm audit aprovados.
- [OK] 145 E2E locais, 13 direcionados após ajuste de navegação e três repetições independentes do pagamento parcial passaram. CI do commit `a2ea9cbcecda53aa283a1aaaf4fae01be8879975` integralmente aprovada, incluindo 145 E2E no GitHub: run `37209022788`.
- [OK] Backups externos de código/alterações/Git e backups protegidos de produção #9/#10 baixados e validados. #10 atualizado imediatamente antes da ativação; banco, arquivos privados, APP_KEY e credenciais preservados.
- [OK] Release aprovada reemitida no servidor original por troca atômica; nenhum novo código de execução, dependência ou migration. Comparação das 64 tabelas antes/depois preservou todos os registros: 626 clientes, 54 OS e 33 pagamentos.
- [OK] Conferência após troca: 7.719 hashes de execução, 71 públicos, 89 privados; 17 consultas/PDF/foto com sucesso, permissões e acesso sem sessão, HTTPS e login responsivo sem erros JavaScript/overflow.
- [OK] Rollback de código preparado; relatório em `docs/REVISAO_CI_PUBLICACAO_2026-10-04.md`. Runs vermelhos anteriores mantidos como histórico; não representam a CI do commit ativo.
- [PENDENTE] Ajuste anterior do cron KingHost para cada minuto e comprovação das tarefas horárias; testes físicos B21S/Push e login por senha do proprietário continuam fora desta revisão.

## Menu lateral: recolhimento somente pelo botão — 04/10/2026

- [OK] Menu Web/PC desfixado permanece em 58px; hover mostra nomes sem expandir ou deslocar o conteúdo. Fixar abre em 240px, Desfixar recolhe imediatamente e a conta mantém sua preferência após recarga. Mobile preservado.
- [OK] Seis testes específicos do menu, adaptação desktop em oito dimensões/onze telas, capturas revisadas, 22 testes frontend, lint, TypeScript/build, Pint e npm audit aprovados. 307 testes SQLite e 307 MySQL isolado, com 6.450 assertions em cada execução, passaram.
- [OK] Backup externo de 2.099 arquivos/alterações/Git verificado; commit funcional `6f34d44` enviado ao GitHub e pacote oficial completo preparado e verificado. Alterações preexistentes preservadas.
- [OK] Regressão local teve 144 aprovados e uma falha no teste novo por comparar altura da página durante carregamento. Verificação corrigida para largura/posição horizontal; os seis cenários do menu passaram no reteste. CI final `37220285180`, commit `8cb058a`, passou integralmente nos quatro jobs, incluindo todos os 145 E2E sem retries.
- [OK] Bloqueio inicial do GitHub por cobrança deixou de impedir execução. Publicação no servidor original realizada somente após CI verde e backups protegidos #11/#12 do banco/privados baixados e validados. Nenhuma cobrança efetuada pelo agente.
- [OK] Nova release `8cb058a30ac4e05169f54f277f3f78ab8226700f` ativada reversivelmente; zero migrations pendentes/aplicadas. Hashes das 54 tabelas de negócio antes/depois preservados, incluindo 626 clientes, 54 OS e 34 pagamentos. `.env`, APP_KEY e 89 arquivos privados preservados.
- [OK] 7.719 arquivos de execução e 71 públicos verificados; novo build conferido também por HTTPS. 17 leituras de API/PDF/foto, permissões, acesso sem sessão, health/PWA/OCR e login responsivo aprovados. Rollback de código/manifesto disponível, sem restaurar banco.
- [OK] Escopo, pacote, evidências, bloqueio e procedimento de retomada documentados em `docs/MENU_LATERAL_FIXACAO_2026-10-04.md`.
## Performance Etapa 2A — 05/10/2026

- [OK] Cache explícito somente em memória, identidade/geração/parâmetros completos, TTL, retenção por inatividade, LRU de 128 entradas e rejeição de respostas obsoletas. Sem tokens/senhas/pagamentos/saldos ou detalhe completo de OS no cache.
- [OK] Clientes preserva lista, pesquisa, ordenação, página e tamanho; Ordens preserva aba, texto/termo efetivo, página, tamanho, apresentação e metadados. Refresh mantém linhas; loading inicial e falha de atualização verificados. Voltar da OS preservado.
- [OK] Quatro auxiliares seguros com TTL 5min e invalidação após confirmação de mutações. Criação/edição/exclusão/importação de clientes e operações de OS invalidam os assuntos relacionados. Comunicação entre abas contém somente assuntos/limpeza.
- [OK] 36 testes frontend, TypeScript, ESLint, build, 39 testes backend/431 assertions isoladas e 51 cenários E2E distintos pertinentes aprovados; execução final de 26 E2E sem retries. Capturas revisadas. Não foi alegada execução da suíte E2E completa ou nova validação MySQL nesta etapa de frontend.
- [OK] Backup externo de 2.102 arquivos, alterações e histórico Git verificado; 312 arquivos protegidos conferidos sem mudanças. Arquivos e alterações preexistentes preservados e fora dos commits desta etapa. Sem migration nova, mudanças no banco em uso ou publicação.
- [OK] Relatório com arquitetura, commits/arquivos, políticas, invalidações, testes, limites, rollback do código e escopo em `docs/PERFORMANCE_ETAPA2A.md`; implementação em `codex/performance-etapa2a`, baseada em `main`.
- [PENDENTE] Revisão/CI remota e eventual publicação sob autorização separada; medições reais de latência, volume e memória na KingHost após publicação. Não são entregas efetuadas por esta tarefa.
## Navegação e aviso de chamado aberto — 07/10/2026

- [OK] Identidade/CSRF confirmados em uma consulta privada ao retornar; token excluído de estado/cache. Sessão, geração, permissões e rejeição de respostas antigas preservadas.
- [OK] Painel reutiliza apresentação por 15s; retorno vencido mantém linhas, mutações invalidam e consultas anteriores são descartadas. Sem cache financeiro novo.
- [OK] Popup de OS existente com número/status/relato; cancelamento sem gravação e confirmação explícita. Backend transacional rejeita aberturas concorrentes não confirmadas. Sem migration.
- [OK] Backup externo de arquivos/alterações/Git validado; testes em cópia/banco isolados. 311 testes backend/6.479 verificações, 36 frontend, lint, TypeScript/build e Pint aprovados.
- [PENDENTE] CI do commit final e publicação autorizada com backup atual de banco/privados, rollback e smoke test; resultados finais no relatório externo da execução.
