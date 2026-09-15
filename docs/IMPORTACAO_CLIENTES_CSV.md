# Importação de clientes do IntegraOS

Em **Configurações > Sistema**, o Master encontra o cartão **Importar clientes por CSV**. O endpoint `POST /api/settings/clients/import` também exige Master no backend, com autenticação e CSRF existentes.

O arquivo deve ter extensão `.csv`, conteúdo textual UTF-8, no máximo 2 MB e cabeçalho exato:

```text
Nome;CPF/CNPJ;Endereço;Número;Bairro;Cidade;UF;CEP;Celular
```

O leitor trata BOM e CRLF, aceita campos entre aspas e preserva o número físico inicial de cada registro, inclusive quando há quebra de linha dentro de um campo. O relatório conta registros após o cabeçalho, inclusive inválidos; uma linha vazia intermediária é um erro.

Nome, CPF/CNPJ e Celular são obrigatórios. Aplica-se o validador existente de CPF/CNPJ, normalização de documento/CEP e limites das colunas. Os campos opcionais vazios são inseridos como strings vazias. Celular utiliza exclusivamente `clients.phone`. O cadastro manual permanece com suas regras atuais.

Leitura sequencial e lotes de 50 clientes limitam memória e consultas: para 600 clientes válidos distintos são 12 consultas de duplicidade e 12 inserções coletivas. Duplicatas no arquivo, no banco ou em clientes arquivados são ignoradas sem atualização. O índice único continua protegendo concorrência; eventual conflito concorrente aborta toda a transação e permite repetir o arquivo.

Todos os lotes e o evento `clients.imported` pertencem à mesma transação. A auditoria contém usuário, IP, data/hora e contagens, sem copiar dados pessoais do CSV. Falha grave reverte todas as inserções, inclusive se ocorrer na auditoria. Erros de validação de linha são reportados e não impedem as demais linhas válidas.

O upload é lido diretamente do arquivo temporário do PHP, sem cópia para storage. O stream é fechado em `finally`; o PHP remove o upload temporário ao finalizar a requisição. Falhas de rede podem impedir o recebimento do resumo após commit: reenviar o CSV é seguro pela deduplicação.

Validação local: suíte PHP completa, E2E `settings-editors.spec.ts` e `settings-import.spec.ts`, build/TypeScript e Pint nos arquivos PHP alterados. O lint geral do repositório tem pendências anteriores: falta `eslint.config.*` e o Pint global acusa CRLF/formatação em arquivos fora deste escopo.
