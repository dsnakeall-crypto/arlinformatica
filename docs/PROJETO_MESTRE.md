# ARL Informática — Projeto Mestre

## 1. Objetivo

Construir do zero um sistema completo de gestão para assistência técnica de informática, em português do Brasil, rápido, profissional, responsivo, seguro e independente de ChatGPT, Codex, Supabase ou qualquer serviço da OpenAI para funcionar depois de pronto.

O GitHub privado é a fonte oficial do código. O primeiro alvo de produção é hospedagem compartilhada KingHost, mas o sistema deve permanecer portátil para outro shared hosting, VPS, cloud ou servidor próprio.

## 2. Arquitetura obrigatória

- Backend: Laravel/PHP 8.x, versão estável compatível com hospedagem compartilhada.
- Banco: MySQL/MariaDB.
- Frontend: React + TypeScript + Vite + Tailwind CSS; usar Inertia se fizer sentido arquitetural.
- Produção não pode exigir processo Node.js permanente; Node pode ser usado apenas para build do frontend.
- PDFs: solução compatível com PHP/shared hosting, como Dompdf, mPDF ou equivalente.
- Imagens: GD e/ou Imagick com fallback.
- Arquivos: armazenamento privado no próprio servidor, com rotas autenticadas ou links assinados quando necessário.
- Configuração: .env; nunca versionar senhas, tokens ou chaves.
- Timezone: America/Sao_Paulo.
- Moeda: BRL.
- Datas: dd/mm/aaaa.

## 3. Perfis e permissões

### Master
Acesso total. Administra usuários, configurações, financeiro, backups/restauração, fotos, auditoria e todo o sistema.

### Administrador
Administra praticamente todo o app, pode corrigir registros e financeiro, mas não administra usuários.

### Usuário local / Funcionário
Acesso operacional: painel, clientes, OS, abertura/conclusão, impressão, atendimento externo e funções permitidas. Sem ações administrativas sensíveis.

Permissões devem ser validadas no backend, não apenas ocultando botões.

## 4. Identidade visual e referências

As imagens anexadas ao projeto são referências oficiais para desktop. O layout Web/PC deve reproduzir com alta fidelidade cores, espaçamentos, menu lateral, tabelas, cards, botões, tipografia e hierarquia visual.

Referências previstas:
- Painel/menu principal.
- Cadastro/listagem de clientes.
- Nova OS.
- Dropdown de status.
- PDF A4 final.
- Pós-venda como inspiração visual.
- TIMBRADO.png para Orçamentos e Laudos.

O layout Mobile/Tablet será próprio e não apenas o desktop espremido.

## 5. Dados da empresa e logo

Configurações > Dados da Empresa:
- Nome da empresa.
- CNPJ.
- Endereço completo.
- Telefone.
- E-mail.
- Instagram.
- Logomarca.

Instagram padrão inicial: https://www.instagram.com/allanluttembarck

A logo deve ser redimensionada automaticamente, sem deformação, para menu, termo de entrada, orçamento, laudos e PDF final. Mostrar preview. Trocar a logo futuramente não altera documentos antigos já gerados.

## 6. Login e usuários

- Sem cadastro público.
- Master cria usuários.
- Usuário: nome, login/e-mail quando definido, senha hash segura, perfil, ativo/inativo, datas.
- Criar fluxo seguro de primeira instalação para cadastrar Master inicial e dados básicos da empresa. Após setup, desabilitar instalador.

## 7. Menu lateral Web

- Painel.
- Mesa de Chamados.
- Nova OS.
- Ordens de Serviço.
- Clientes.
- Serviços.
- Financeiro.
- Caixa.
- Relatórios.
- Pós-Venda.
- Usuários.
- Configurações.

Na parte inferior, usuário conectado, perfil e versão.

## 8. Painel inicial

Não mostrar faturamento no painel principal.

No topo mostrar principalmente:
- OS abertas.
- OS concluídas na semana.

Botões rápidos:
- + Nova OS.
- + Entrada Rápida.

Tabela principal:
- Número da OS.
- Cliente.
- Status.
- Contato.
- Endereço.
- Problema relatado resumido.
- Data de entrada.
- Ver OS.

Ter busca, filtros, paginação e ordenação.

## 9. Mesa de Chamados

Visão operacional das OS abertas, organizada por status, podendo usar lista ou Kanban sem criar novas regras de negócio exclusivas.

## 10. Status da OS

Status operacionais padrão:
- Em Análise.
- Aguardando Peça.
- Em Serviço.
- Concluído.
- Interrompido.

"Pago" aparece na interface conforme a referência, mas pagamento deve ser modelado separadamente do status operacional.

Uma OS pode estar Concluída e não paga, ou Em Serviço e já paga.

Registrar histórico de status: anterior, novo, usuário, data/hora.

## 11. WhatsApp e Maps

Telefone clicável:
- Desktop: WhatsApp Web.
- Mobile: app WhatsApp quando disponível.

Endereço clicável: abrir Google Maps já com o endereço.

Modo padrão do sistema: abrir WhatsApp com mensagem pré-preenchida. Não afirmar envio automático sem confirmação. Preparar arquitetura opcional para WhatsApp Business Cloud API no futuro.

## 12. Clientes

Cadastro simples:
- Nome completo / Razão Social.
- CPF ou CNPJ.
- Telefone.
- CEP.
- Rua.
- Número.
- Bairro.
- Cidade.
- Estado.
- Complemento opcional.

Não pedir e-mail nem data de nascimento.

CEP deve preencher endereço automaticamente via ViaCEP ou equivalente, com fallback manual.

CPF/CNPJ:
- aceitar com ou sem pontuação;
- normalizar;
- validar;
- criar unique no valor normalizado;
- bloquear duplicidade com aviso claro.

Listagem por ordem alfabética e busca por nome, telefone ou CPF/CNPJ.

## 13. Histórico do cliente

Ao abrir cliente mostrar dados atuais e histórico completo de OS, mais recente primeiro. Cada item pode mostrar número, data, status, resultado, resumo, valor, Ver OS e Baixar PDF.

Alterar cadastro atual nunca modifica snapshots/documentos antigos.

## 14. Serviços e produtos

Um único menu Serviços. Não criar menu separado Produtos.

Campos:
- Nome/descrição.
- Valor.
- Categoria opcional: Serviço ou Produto.

Permitir criar, editar, pesquisar e desativar. Alterar preço futuro nunca altera OS antiga.

Cada item pode ter Garantia Contratual Adicional padrão:
- Ativar sim/não.
- Prazo numérico.
- Unidade: dias, meses ou anos.

Ao usar o item numa OS, copiar snapshot da garantia e permitir ajuste naquela OS.

## 15. Garantias no PDF final

A antiga garantia geral permanece armazenada apenas por compatibilidade histórica, sem opção visível em Configurações e sem uso em novos documentos.

Na finalização de cada OS, uma opção desmarcada por padrão permite incluir no PDF as garantias contratuais adicionais copiadas dos itens. A escolha e as garantias dos itens fazem parte do snapshot da revisão emitida. Se um item não tiver garantia contratual marcada, não escrever "sem garantia"; apenas omitir a informação correspondente. Garantia contratual não substitui direitos legais do consumidor.

## 16. Equipamentos e fabricantes

Equipamentos iniciais:
- Notebook.
- CPU / Computador.
- Tablet.
- Impressora.
- MacBook.
- iPad.

Fabricantes iniciais: Dell, ASUS, Acer, Lenovo, HP, Apple, Samsung, Epson, Canon, Brother, Positivo, LG, Microsoft, Xiaomi, Motorola e outras marcas relevantes.

Configurações permite adicionar, editar e desativar, preservando histórico.

## 17. Tipo de atendimento

Na abertura da OS:
- Análise na Bancada.
- Atendimento Externo.

Isso não é serviço financeiro e não gera valor automaticamente. Mostrar badge Bancada/Externo.

## 18. Nova OS

Fluxo:
- Cliente.
- Tipo de atendimento.
- Equipamento.
- Fabricante.
- Checklist.
- Problema relatado.
- Foto.
- Serviços/itens opcionais.
- Criar OS.

Pesquisar cliente cadastrado e preencher dados automaticamente. Ter acesso rápido para cadastrar cliente novo.

Problema relatado é obrigatório e deve ser preservado exatamente como escrito.

Gerar número sequencial único e amigável, por exemplo 0001167, protegido contra duplicidade e clique duplo.

Ao criar, executar transação segura e salvar snapshots necessários. Status inicial: Em Análise.

## 19. Checklist de entrada

Bloco recolhível/accordion. Fechado por padrão:

CHECKLIST DE ENTRADA — 100% OK

Se nenhuma avaria for marcada, considerar automaticamente 100% OK. Não obrigar botão "Tudo OK".

Itens por equipamento.

Notebook/MacBook:
- Tela riscada.
- Tela trincada.
- Tela quebrada.
- Carcaça quebrada.
- Carcaça trincada.
- Dobradiça quebrada.
- Dobradiça avariada.
- Carregador com emenda.
- Carregador danificado.
- Outro.

CPU/Computador:
- Gabinete amassado.
- Gabinete quebrado.
- Tampa avariada.
- Conector danificado.
- Outro.

Tablet/iPad:
- Tela riscada.
- Tela trincada.
- Tela quebrada.
- Carcaça amassada.
- Carcaça quebrada.
- Conector danificado.
- Outro.

Impressora:
- Carcaça quebrada.
- Carcaça trincada.
- Tampa quebrada.
- Bandeja quebrada.
- Cabo danificado.
- Outro.

"Outro" abre campo curto.

Configurações > Checklist de Entrada permite adicionar, editar e desativar opções por equipamento sem destruir histórico.

Se houver avarias, mostrar resumo no accordion fechado e incluir no WhatsApp e PDFs. Se 100% OK, PDF mostra apenas "CHECKLIST DE ENTRADA: 100% OK".

## 20. Fotos do equipamento

Permitir:
- selecionar arquivo do PC;
- galeria/fototeca;
- câmera do celular;
- webcam.

Regra obrigatória: foto armazenada deve ter no máximo 100 KB.

Processamento:
- corrigir orientação;
- remover EXIF;
- manter proporção;
- redimensionar;
- preferir WebP/JPEG otimizado;
- reduzir qualidade/dimensão progressivamente até <=100 KB;
- limite inicial sugerido de 1280 px no maior lado, reduzindo mais se necessário.

Não guardar original gigante. Validar no servidor também.

Foto pode aparecer na OS, histórico, PDF final e laudos. Se entrar em PDF final, incorporar ao próprio PDF.

## 21. Fotos e armazenamento

Configurações > Fotos e Armazenamento:
- quantidade de fotos;
- MB/GB utilizados;
- média por foto;
- número de OS com foto;
- indicador de uso quando capacidade conhecida.

Somente Master pode excluir fotos.

Opções:
- todas as fotos;
- anteriores a uma data;
- mais antigas que 1, 2 ou 3 anos.

Antes, mostrar quantidade e espaço estimado liberado. Exigir confirmação forte, como digitar EXCLUIR TODAS AS FOTOS. Registrar auditoria.

Excluir foto nunca exclui OS, cliente, serviço, laudo, histórico, financeiro, PDF, termo ou orçamento.

## 22. Regra absoluta de histórico

OS concluída nunca pode ser excluída fisicamente por fluxo normal, nem pelo Master. Pode existir Arquivar/Ocultar de listas operacionais, mas o registro permanece.

Mudanças futuras de cliente, endereço, serviço, preço, logo, garantia, termo, checklist, fabricante ou configuração não alteram silenciosamente documentos históricos.

## 23. Termo automático na abertura

Ao criar OS, gerar PDF "TERMO DE RECEBIMENTO E RETIRADA DE EQUIPAMENTO" com logo, dados da empresa, nº OS, cliente, CPF/CNPJ, data, equipamento e checklist.

Texto padrão inicial:

> O cliente declara estar ciente de que o equipamento permanecerá sob responsabilidade da assistência durante o período necessário para diagnóstico ou reparo.
>
> Após a comunicação de que o equipamento está disponível para retirada, recomenda-se a retirada em até 30 dias corridos.
>
> Caso o equipamento não seja retirado, a assistência poderá realizar novas tentativas de contato e adotar as medidas legais cabíveis para cobrança de valores ou despesas de guarda.
>
> O simples decurso do prazo não transfere a propriedade do equipamento para a assistência, nem autoriza automaticamente sua venda, doação ou descarte.
>
> Ao aceitar este termo, o cliente confirma que leu e concorda com as condições acima.

Não incluir abandono automático após 90 dias nem autorização automática de venda/descarte.

Configurações > Termos e Documentos deve permitir editar texto, usar variáveis e versionar modelos. Variáveis: {{numero_os}}, {{nome_cliente}}, {{cpf_cnpj}}, {{data_entrada}}, {{equipamento}}, {{marca}}, {{problema_relatado}}.

Ao criar OS, salvar snapshot do texto usado.

## 24. Mensagem de abertura

Modelo padrão:

ORDEM DE SERVIÇO CRIADA Nº {{numero_os}}

Olá, {{nome_cliente}}.

Recebemos seu equipamento e sua Ordem de Serviço foi aberta com sucesso.

Problema relatado:
{{problema_relatado}}

No momento, o equipamento encontra-se em análise.

Assim que houver a conclusão ou uma atualização importante, entraremos em contato.

ARL Informática

Se houver avarias, acrescentar bloco de Checklist. Texto editável em Configurações > Mensagens.

## 25. Ver OS

Página completa com:
- número;
- cliente;
- CPF/CNPJ;
- telefone;
- endereço;
- tipo atendimento;
- equipamento;
- fabricante;
- foto;
- checklist;
- problema;
- data entrada;
- status e histórico;
- itens;
- orçamento;
- laudos;
- garantias;
- fechamento;
- pagamento;
- PDFs/documentos.

## 26. Orçamento dentro da OS

Botão GERAR ORÇAMENTO.

Campos:
- diagnóstico/laudo resumido;
- serviço/reparo proposto;
- itens;
- quantidade;
- valor unitário;
- subtotal;
- total;
- validade;
- observação opcional.

Validade padrão sugerida: 7 dias, editável.

PDF A4 baseado em TIMBRADO.png, com dados dinâmicos da empresa. Não hardcode dados antigos da imagem. Instagram padrão: https://www.instagram.com/allanluttembarck

Texto padrão:

"Após análise do equipamento acima identificado, foi constatada a necessidade do seguinte procedimento:"

Mostrar diagnóstico, serviço proposto, itens, total e:

"Este orçamento possui validade de {{validade}} dias a partir da data de emissão. A execução do serviço será realizada após a aprovação do cliente. Em caso de dúvidas, estamos à disposição. ARL Informática."

Status:
- Aguardando aprovação.
- Aprovado.
- Recusado.

Registrar usuário/data/hora. Ao aprovar, oferecer copiar itens para a OS. Nunca sobrescrever orçamento antigo; manter histórico e PDFs.

Mensagem padrão de orçamento:

Olá, {{nome_cliente}}.

Finalizamos a análise da sua OS nº {{numero_os}}.

Segue o orçamento para avaliação.

Valor: R$ {{valor_orcamento}}

Qualquer dúvida, estamos à disposição.

ARL Informática

## 27. Finalização da OS

Ao selecionar Concluído, abrir tela/modal de Finalização antes de encerrar.

Campos:
- Resultado do atendimento.
- Laudo técnico.
- Itens existentes.
- Adicionar produto/serviço.
- Quantidade.
- Valor.
- Desconto.
- Total.

Resultados:
- Reparo realizado.
- Equipamento sem possibilidade de reparo.
- Cliente desistiu/cancelou.
- Reparo economicamente inviável.
- Sem defeito constatado.
- Outro.

Se não houve reparo, permitir concluir sem serviço e com R$ 0,00; motivo/laudo obrigatório.

Calcular subtotal, desconto e total, sem permitir valor negativo.

Registrar data/hora, usuário, resultado, laudo, itens, garantias e valores.

## 28. PDF final

Usar como referência obrigatória a imagem A4 final anexada. Reproduzir o layout com alta fidelidade.

Mostrar:
- logo e dados da empresa;
- nº OS;
- entrada e fechamento;
- cliente, CPF/CNPJ, telefone e endereço;
- equipamento/fabricante;
- foto quando houver;
- checklist;
- problema relatado;
- resultado do atendimento;
- laudo técnico;
- serviços/produtos, quantidade, valor unitário, subtotal;
- desconto;
- total;
- garantias;
- assinatura/responsável quando configurado.

Mesmo sem reparo, gerar PDF com resultado, laudo, "Nenhum serviço realizado" e total R$ 0,00.

Prévia com Imprimir, Baixar PDF, Fechar. Imprimir usa diálogo nativo do navegador/SO.

Documentos emitidos são históricos. Correção gera nova revisão, não sobrescreve silenciosamente documento antigo.

## 29. Laudos técnicos

Configurações > Laudos deve oferecer modelos editáveis:
- Laudo Técnico Geral.
- Laudo de Dano Elétrico.
- Equipamento Irreparável.
- Reparo Economicamente Inviável.
- Inspeção / Estado do Equipamento.
- Pós-Reparo.

Usar TIMBRADO.png como referência visual. Mostrar aviso de que o técnico deve revisar e confirmar tudo antes da emissão.

Na OS, botão GERAR LAUDO TÉCNICO. Preencher automaticamente dados da OS/cliente/equipamento e permitir campos técnicos: relato, análise, testes, componentes, diagnóstico, conclusão, situação, valor estimado opcional, fotos, técnico responsável, qualificação, registro/certificação opcional e assinatura.

Laudo de dano elétrico deve incluir:
- data aproximada do evento;
- relato do cliente;
- componentes danificados;
- testes;
- diagnóstico;
- conclusão selecionada pelo técnico: compatível com origem elétrica, sem evidência de origem elétrica ou inconclusiva;
- situação: reparável, irreparável, reparado, aguardando reparo.

O sistema nunca presume causa elétrica sozinho.

Permitir incluir fotos em seção REGISTRO FOTOGRÁFICO.

Modelos podem ser editados, duplicados, criados e desativados. Laudo emitido fica bloqueado; correções geram Revisão 2, Revisão 3 etc.

## 30. Pagamento e Financeiro

Pagamento é separado do status operacional.

Ao selecionar Pago, modal com:
- Pix.
- Dinheiro.
- Débito.
- Crédito.
- Transferência.
- Outro.

Registrar OS, valor, forma, data/hora e usuário. Evitar duplicidade.

Financeiro terá abas:
- Visão Geral.
- Caixa Diário.
- Movimentações.
- Mensal.
- Relatórios.

Visão Geral:
- Entradas hoje.
- OS pagas hoje.
- Ticket médio hoje.
- Total do mês.
- comparação hoje x ontem;
- média diária;
- melhor dia do mês;
- quantidade de OS pagas;
- gráfico dia a dia.

Caixa diário automático: 00:00:00 a 23:59:59 no timezone America/Sao_Paulo, sem abertura/fechamento manual. Transações são a fonte da verdade; relatórios não podem depender exclusivamente de cron.

## 31. Entrada Rápida

Botão no Painel e Financeiro.

Modal com único campo obrigatório: Valor recebido.

Não pedir cliente, forma de pagamento, descrição nem OS.

Registrar origem "Serviço rápido não cadastrado", valor, data, hora e usuário. Atualizar caixa, faturamento, gráfico, mês e relatório.

## 32. Correções financeiras

Não apagar silenciosamente. Admin/Master pode corrigir com auditoria: valor anterior, novo, usuário, data/hora e motivo quando aplicável. Preferir estorno/correção auditável.

## 33. Fechamento mensal e PDF financeiro

Mostrar faturamento total, total vindo de OS, total de Entrada Rápida, OS pagas, ticket médio, descontos, faturamento diário, formas de pagamento, serviços/produtos, quantidades e totais. Histórico permanente.

Gerar PDF "RELATÓRIO FINANCEIRO — MÊS/ANO" com logo, empresa, período, data, resumo, formas de pagamento, movimento detalhado, resumo de serviços/produtos e total do mês.

## 34. Pós-Venda

Tela simples com apenas:
- Nº OS.
- Cliente.
- Botão Acompanhamento.
- Botão Google.
- Botão Instagram.

### Acompanhamento
Botão: CONFIRMAR SE ESTÁ TUDO CERTO

Mensagem padrão:

"Olá, {{nome_cliente}}.

Passando para saber se está tudo certo com o equipamento e se o serviço está funcionando normalmente.

Se tiver qualquer dúvida ou precisar de ajuda, pode entrar em contato com a ARL Informática."

### Google
Botão: PEDIR AVALIAÇÃO

Mensagem padrão:

"Olá, {{nome_cliente}}

Poderia avaliar a ARL Informática no Google?
Leva 10 segundos:

Basta clicar no link e dar sua avaliação =))

{{link_google}}"

Link padrão: https://g.page/r/CSxkz5Y88MaJEBM/review

### Instagram
Botão: CONVIDAR PARA SEGUIR

Mensagem padrão:

"Olá, {{nome_cliente}} 😊

Acompanhe a ARL Informática no Instagram para ver dicas, novidades e nosso trabalho:

https://www.instagram.com/allanluttembarck

Será um prazer ter você por lá!"

Todos os textos são editáveis em Configurações.

Ao confirmar envio, botão fica cinza, desativado, mostra ✓ Enviado e salva data/hora. Os três botões são independentes.

Se o WhatsApp for manual, abrir a conversa não basta para marcar como enviado; após retorno, oferecer confirmação "Mensagem enviada".

Pós-venda normal só para Resultado = Reparo realizado.

Cinco dias após conclusão, se houver ação pendente, criar notificação interna. Não enviar automaticamente ao cliente.

Regra dos 60 dias: cada cliente tem no máximo uma OS ativa no menu Pós-Venda. Nova OS elegível após pelo menos 60 dias arquiva a linha antiga apenas no Pós-Venda e libera novo ciclo. OS antiga permanece no histórico.

## 35. Notificações e PWA

Central de notificações com sino. Eventos:
- Nova OS criada.
- Novo cliente cadastrado.
- Pós-Venda pendente.

Notificações com lida/não lida, data/hora e link para registro.

Transformar sistema em PWA instalável. Implementar Web Push quando navegador/plataforma permitir. Notificações internas sempre funcionam mesmo se push estiver bloqueado.

Em shared hosting, usar Laravel Scheduler + cron quando necessário, mas criar mecanismos de catch-up ao abrir Painel/Pós-Venda para não perder lembretes se cron falhar.

## 36. Mobile/Tablet próprio

Layout Web/PC permanece baseado nas referências. Mobile/Tablet deve ter interface própria.

Tela inicial mobile prioriza:
- Nova OS.
- OS abertas.
- Pesquisar OS.
- Entrada Rápida.

OS em cards, por exemplo: nº, status, cliente, equipamento, problema, WhatsApp, Maps, Abrir OS.

Nova OS mobile em blocos/accordions: Cliente, Equipamento, Tipo atendimento, Checklist, Problema, Foto, Criar OS. Botões grandes e câmera integrada.

Evitar zoom indesejado em inputs: fonte >=16px, viewport responsivo, foco/scroll correto. Não bloquear zoom manual do usuário.

Configurações > Aparência e Layout:
- Automático.
- Web/PC.
- Mobile/Tablet.

Preferência salva por dispositivo.

Atendimento Externo no mobile ganha atalhos: WhatsApp, Maps, Foto, Status, Finalizar.

## 37. Configurações em cards

Tela principal de Configurações deve ser uma central organizada por cards:
- Dados da Empresa.
- Aparência e Layout.
- Usuários e Permissões.
- Equipamentos.
- Fabricantes.
- Checklist de Entrada.
- Termos e Documentos.
- Mensagens.
- Pós-Venda.
- Laudos.
- Financeiro.
- Fotos e Armazenamento.
- Backup e Restauração.
- Hospedagem e Migração.
- Sistema e Diagnóstico.

## 38. Backup e restauração

Configurações > Backup e Restauração:
- Criar Backup Agora.
- Baixar Backup.
- Restaurar Backup.
- Histórico.
- Backup Automático.

Incluir dados e arquivos: clientes, OS, itens, financeiro, serviços, usuários/perfis necessários, configurações, templates, termos, laudos, orçamentos, auditoria, notificações, PDFs, fotos e uploads.

O código/layout oficial é versionado no GitHub, não exposto pela web. Cada backup deve registrar versão do app, Git commit SHA, schema/migrations e manifesto.

Manifesto: sistema, versão, commit, data, banco, contagens, tamanho.

Backup automático: ligado/desligado; diário, semanal ou mensal; retenção configurável. Compatível com shared hosting.

Restauração somente Master. Antes: validar arquivo, checksum, versão, conteúdo, confirmar e criar backup de segurança do estado atual.

## 39. Hospedagem e migração

Configurações > Hospedagem e Migração com guia simples para KingHost, VPS e outro provedor.

Criar docs/KINGHOST_DEPLOY.md com:
- criação do banco;
- migrations/import;
- PHP;
- document root;
- storage/permissões;
- cron;
- variáveis de ambiente;
- build Vite;
- Git/GitHub;
- SSL;
- backups.

Não hardcode limites comerciais do plano.

## 40. GitHub Actions

Criar CI para backend, testes, TypeScript, build e testes principais. Preparar workflow de deploy para KingHost, sem segredos versionados; usar GitHub Secrets futuramente.

## 41. Sistema e diagnóstico

Configurações > Sistema:
- versão;
- build/commit;
- banco conectado;
- espaço de arquivos;
- espaço de fotos;
- último backup;
- status scheduler;
- latência aproximada;
- ambiente;
- status geral.

## 42. Performance

O app deve parecer imediato. Implementar:
- índices corretos;
- paginação server-side;
- evitar carregar milhares de OS;
- lazy loading;
- thumbnails;
- fotos <=100 KB;
- consultas só com campos necessários;
- cache seguro;
- evitar N+1;
- evitar renders React desnecessários;
- PDFs sem congelar interface;
- feedback de salvamento;
- skeletons quando útil.

Projetar para dezenas de milhares de OS.

## 43. Auditoria

Registrar ações críticas: criação OS, status, conclusão, checklist, pagamento, correção financeira, Entrada Rápida, configurações, usuários, termos, garantias, laudos, orçamentos, exclusão de fotos, backup/restore.

Guardar usuário, ação, registro, antes/depois quando aplicável, IP quando pertinente e data/hora.

## 44. Segurança

Obrigatório:
- hash forte de senha;
- HTTPS em produção;
- CSRF;
- prevenção XSS e SQL injection;
- validação server-side;
- validação MIME e limites de upload;
- autorização backend;
- sessões seguras;
- rate limiting de login;
- lockout básico;
- backups protegidos;
- documentos privados;
- não expor paths reais;
- minimização de dados compatível com LGPD.

## 45. Banco de dados

Criar estrutura equivalente para:
users, roles/permissions, clients, service_catalog, equipment_types, manufacturers, checklist_templates, service_orders, service_order_snapshots, service_order_checklists, service_order_items, service_order_photos, status_history, budgets, budget_items, budget_revisions, technical_reports, technical_report_templates, technical_report_revisions, payments, financial_transactions, financial_adjustments, notifications, push_subscriptions, post_sale_cycles, post_sale_actions, company_settings, message_templates, term_templates, term_versions, warranty_settings, generated_documents, audit_logs, backups/backup_manifests.

Pode melhorar nomes e normalização, mantendo PKs/FKs, índices, unique constraints, timestamps, integridade referencial e soft delete/inactive onde histórico exigir.

## 46. Dados iniciais

Seed inicial:
- Status operacionais.
- Tipos de atendimento: Análise na Bancada e Atendimento Externo.
- Tipos de equipamento.
- Fabricantes.
- Templates de Checklist.
- Templates de mensagens.
- Termo padrão.
- Modelos de laudo.
- Link Google: https://g.page/r/CSxkz5Y88MaJEBM/review
- Instagram: https://www.instagram.com/allanluttembarck

Não cadastrar Análise na Bancada como serviço financeiro.

## 47. Testes

Criar testes automatizados cobrindo no mínimo:
- login e permissões;
- Master/Admin/Funcionário;
- CPF/CNPJ duplicado;
- CEP fallback;
- Nova OS;
- número sequencial concorrente;
- Checklist 100% OK;
- Checklist com avaria;
- foto <=100 KB;
- snapshots;
- termo;
- orçamento e aprovação;
- garantia;
- conclusão normal e sem reparo;
- PDFs;
- pagamento;
- Entrada Rápida;
- financeiro diário/mensal;
- Pós-Venda 5 dias/60 dias;
- notificações;
- exclusão de foto sem excluir OS;
- backup e validação de restore;
- laudos e revisões.

Criar E2E com Playwright para fluxo principal: Master -> funcionário -> cliente -> OS -> checklist -> foto -> termo -> orçamento -> andamento -> conclusão -> PDF -> pagamento -> financeiro -> histórico -> pós-venda.

## 48. Critério de pronto

Não considerar o projeto concluído por haver telas bonitas. Todas as funções devem operar de verdade.

Preciso conseguir: instalar localmente, criar Master, login, criar funcionário, cadastrar cliente, bloquear CPF duplicado, criar OS, selecionar Bancada/Externo, checklist, foto <=100 KB, termo, WhatsApp, status, orçamento, PDF timbrado, aprovação, itens na OS, garantia, laudo, conclusão com/sem reparo, PDF final fiel, impressão, pagamento, financeiro, Entrada Rápida, histórico, Pós-Venda, lembrete 5 dias, regra 60 dias, backup, restore validado, limpeza de fotos sem excluir histórico, mobile utilizável e preparação KingHost.

## 49. Modo de trabalho do Codex

1. Ler integralmente este arquivo, AGENTS.md e docs/REFERENCIAS_VISUAIS.md.
2. Analisar todas as imagens anexadas/referenciadas.
3. Criar arquitetura e modelagem do banco.
4. Documentar decisões.
5. Criar plano de implementação.
6. Implementar de verdade; não parar no planejamento.
7. Fazer commits lógicos/checkpoints.
8. Rodar testes, lint, typecheck e build continuamente.
9. Abrir e testar a aplicação.
10. Comparar screenshots com referências e ajustar.
11. Testar desktop e mobile.

Pequenas ambiguidades: escolher solução conservadora, documentar e continuar. Perguntar somente quando houver risco de destruir dados, afetar segurança, exigir credencial/custo ou mudar regra comercial essencial.

## 50. Proibições

- Não usar Supabase.
- Não criar dependência da OpenAI.
- Não exigir Node.js persistente em produção.
- Não apagar OS concluída.
- Não alterar documentos antigos quando dados atuais mudarem.
- Não guardar foto de equipamento acima de 100 KB.
- Não permitir CPF/CNPJ duplicado.
- Não guardar senha em texto puro.
- Não expor dados sensíveis publicamente.
- Não afirmar envio de WhatsApp sem confirmação.
- Não concluir dano elétrico automaticamente.
- Não tratar garantia contratual como substituta da garantia legal.

## 51. Entrega final

Ao finalizar:
- resumo do que foi implementado;
- estrutura do projeto;
- banco/migrations;
- testes;
- como executar localmente;
- como criar Master;
- como backup/restauração;
- como configurar KingHost;
- recursos que exigem HTTPS/permissão de navegador;
- integrações externas opcionais.

Criar CHECKLIST_FINAL.md marcando cada requisito como [OK] ou [PENDENTE]. Não marcar [OK] em placeholder.
