# Fornecedores: cadastro, pagamentos e notas fiscais

Extensão solicitada pelo proprietário em 02/10/2026.

## Cadastro

Novos cadastros e edições exigem razão social/nome completo, nome fantasia, CPF/CNPJ, celular, WhatsApp, CEP, logradouro, número (aceita `S/N`), bairro, cidade e UF. Complemento, contato, e-mail e telefone fixo são opcionais. Para pessoa física, preencher o nome completo na razão social e o nome comercial ou nome completo no nome fantasia.

Celular e WhatsApp brasileiros usam DDD + nove dígitos, iniciando por 9. Fixo usa DDD + oito dígitos, iniciando por 2–5. Máscaras no formulário e validação no servidor. O botão “Usar celular no WhatsApp” copia o número sem obrigar que sejam iguais.

O CEP consulta o ViaCEP após oito dígitos, preenchendo logradouro, bairro, cidade e UF quando disponíveis. Respostas de uma pesquisa antiga são descartadas. Consulta indisponível ou CEP não localizado permitem preenchimento manual; todos os campos obrigatórios continuam exigidos.

CPF, CNPJ numérico e CNPJ alfanumérico têm os dígitos verificadores validados no backend. Cadastro duplicado é rejeitado. A validação matemática **não confirma existência, titularidade ou situação cadastral**.

“Verificar documento” consulta CNPJ numérico na BrasilAPI, com timeout e cache de uma hora. Mostra nome e situação retornada pela base pública, sem apresentá-la como confirmação oficial em tempo real. Falha/ausência do cadastro não é confundida com CPF/CNPJ inexistente. CPF e CNPJ alfanumérico possuem orientação para consulta oficial manual. A integração automática do CPF com a Receita/Serpro depende de contratação e credenciais; não está implementada nem simulada. Nenhum CPF é enviado à BrasilAPI.

## Compra e contas a pagar

Condição e forma são independentes:

- Condições: à vista, a prazo em uma parcela, parcelada e duplicata/títulos.
- Formas: Pix, dinheiro, transferência, boleto, cartão de débito, cartão de crédito, cheque e outro.
- Até 60 parcelas, com valor e vencimento editáveis. Valores devem somar exatamente o total calculado dos produtos no servidor.
- Sugestão mensal preserva o dia do primeiro vencimento, ajustando apenas meses mais curtos. Não transfere automaticamente vencimentos em feriados ou fins de semana.
- Cartão de crédito: informar vencimentos da fatura. A compra com cartão não significa que a fatura já foi paga.
- “Compra já paga integralmente” exige data efetiva. Caso contrário, confirmar cada parcela após pagar, com data, forma utilizada e referência do comprovante opcionais.
- Data de pagamento não pode ser anterior à compra ou futura. Recebimento de mercadoria e pagamento permanecem independentes.
- Repetir a mesma confirmação não duplica compra, recebimento, parcelas ou pagamento. Dados conflitantes são rejeitados.
- Cancelar um título em aberto exige motivo e preserva histórico. Cancelar saldo de entrega **não cancela dívidas automaticamente**: parcelas de mercadorias recebidas ou adiantamentos precisam de negociação própria.

Este controle não cria despesas automaticamente em `financial_expenses`. O Financeiro existente permanece operando como antes; se o operador já registra compras nele, não há uma segunda despesa automática. Integração contábil e estorno de pagamentos confirmados são evoluções separadas.

Lembretes internos: três dias antes, no dia e após o vencimento. Uma notificação ativa por etapa/título; pagar ou cancelar encerra os avisos. Somente Master e Administrador recebem/consultam avisos de fornecedores. O scheduler verifica a cada hora e o acesso ao sino/Fornecedores recupera lembretes se o cron não executar. Não há envio automático ao fornecedor por WhatsApp/e-mail.

## Notas fiscais

No registro da compra, anexar PDF, JPG/JPEG, PNG ou WebP de até 10 MB. Depois, a ficha permite anexar outras notas e baixar as anteriores, até 20 anexos por compra.

Arquivos ficam no disco **privado**, em `supplier-invoices/{compra}`. Downloads exigem sessão e perfil Master/Administrador; o JSON não expõe caminhos. O servidor verifica tamanho, MIME real e assinatura de PDF/imagem, e entrega como download com `nosniff`. Anexos possuem hash, usuário, data e auditoria; não são substituídos silenciosamente. São incluídos no backup de arquivos privados.

Na hospedagem, o limite efetivo também depende de `upload_max_filesize` e `post_max_size` do PHP. Para permitir anexos de 10 MB, configurar ao menos `upload_max_filesize=10M` e `post_max_size=12M`, conforme as opções do plano.

A compra e o upload são duas confirmações: se o upload falhar, a compra permanece registrada. A interface informa a falha e permite repetir o envio sem duplicar a compra. A nota também pode ser anexada posteriormente na ficha.

## Compatibilidade e migração

Migração aditiva `2026_10_02_120000_add_supplier_payables_and_invoices.php`: novas colunas opcionais em fornecedores/compras e tabelas `supplier_payables`, `supplier_invoices`. Não apaga ou preenche dados antigos com valores inventados. Compra antiga sem condição permanece sem parcelas; nenhum débito retroativo é criado. Cadastro anterior incompleto precisa ser completado ao editar.

Backup verificado antes de editar/migrar em `C:\Users\Allan\ARL-backups\fornecedores-pagamentos-20261002-105244`. Código anterior, alterações locais, histórico Git e banco/arquivos privados preservados. ZIP anterior: SHA-256 `9a50a9179dab58fc9ad4fbe14cd43209902186c410086926bd3f5dba1f0a1906`. A conferência da migração compara dados existentes, desconsiderando apenas as colunas novas, e hashes dos arquivos privados. Produção não é atualizada por esta alteração local.

## Pesquisa utilizada

- [Omie: despesas recorrentes e parcelas](https://ajuda.omie.com.br/pt-BR/articles/499171-cadastrando-uma-despesa-recorrente): valores, quantidade de parcelas e primeiro vencimento.
- [Omie: contas a pagar e receber atrasadas](https://ajuda.omie.com.br/pt-BR/articles/6846490-relatorios-financas-contas-a-pagar-e-a-receber-atrasadas): títulos em aberto após vencimento.
- [Omie: cartão e fatura](https://ajuda.omie.com.br/pt-BR/articles/16417884-perguntas-frequentes-cartao-omie): distinção entre compra, parcelas e fatura.
- [ViaCEP](https://viacep.com.br/): consulta de CEP e resposta de CEP inexistente.
- [Receita: CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico): formato e cálculo de dígitos.
- [Consulta oficial do CPF](https://www.gov.br/pt-br/servicos/consultar-cadastro-de-pessoas-fisicas).
- [Serpro: API Consulta CPF](https://www.gov.br/pt-br/servicos/obter-solucao-de-consulta-de-dados-de-cadastro-de-pessoa-fisica-cpf): contratação para consulta automatizada.
- [BrasilAPI: documentação](https://brasilapi.com.br/docs#tag/CNPJ) e [implementação do endpoint](https://github.com/BrasilAPI/BrasilAPI/blob/main/pages/api/cnpj/v1/%5Bcnpj%5D.js).

Decisão do projeto baseada nessas referências: separar condição, meio de pagamento, vencimento e quitação efetiva, preservando estoque e financeiro existentes.

## Verificações

Migração local: 45 conjuntos de dados existentes e 128 arquivos privados preservados, conferidos por hash. Suíte E2E geral: 106 testes aprovados. Fluxos finais de fornecedores: 2 testes aprovados, incluindo cadastro/CEP, nota, parcelas, pagamento, estoque, mobile, falha/reenvio de anexo e abertura da compra pelo sino. Lint, TypeScript, build, Pint e 12 testes unitários de frontend aprovados. Os testes PHP e MySQL com restauração usam bases próprias; executar essas duas suítes em sequência porque os discos fake padrão do PHPUnit compartilham a pasta temporária.

Resultados finais: 230 testes PHP / 1.965 asserções; 25 testes MySQL isolado / 230 asserções; 106 E2E gerais e 2 fluxos finais do módulo aprovados, sem retries. A rodada final PHP/MySQL foi executada em sequência para evitar disputa entre discos temporários fake; dados reais/arquivos privados reconferidos sem alterações.


### Cadastro de fornecedor — organização em 03/10/2026
Consulta do documento separada de Contato, com botão estilizado e resultado destacado. Campos com rótulos legíveis, bordas definidas e contatos empilhados em coluna compacta; fonte de 16px no celular. Celular é usado como WhatsApp em novos cadastros e ao trocar o celular. Editar outros dados preserva um WhatsApp antigo diferente, com aviso no formulário. Não há remoção da coluna ou alteração de registros existentes por migração. Identificação/endereço, máscaras, consulta de CEP e validações do backend preservados.
Backup de arquivos, alterações locais e histórico Git verificado: `C:/Users/Allan/ARL-backups/supplier-form-20261003-123005` (1736 arquivos). Sem publicação ou mudança direta no banco de uso.


### Registro de compra em duas colunas — 03/10/2026
Desktop: data/recebimento, produtos e plano de pagamento na primeira coluna; referência, quitação integral/data, observações, total e nota fiscal na segunda. Cards com bordas definidas, campos legíveis e rodapé fixo. Em telas até 900px as colunas se empilham; no celular campos usam 16px. Dados de compra bloqueados após sucesso; upload permanece disponível para reenvio sem duplicar compra/estoque.
Backup externo verificado: `C:/Users/Allan/ARL-backups/supplier-purchase-layout-20261003-123752` (1748 arquivos e histórico Git). Sem migração, alteração direta de dados ou publicação. Lint, TypeScript/build, 19 testes frontend e três fluxos E2E de fornecedores aprovados; conferência desktop/mobile com verificação de posição/conteúdo das colunas, overflow, nota, parcelas e reenvio de anexo.
