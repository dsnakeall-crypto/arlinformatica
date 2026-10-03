# Leitura opcional de faturas com Gemini

Atualização: o provedor preferido agora é Mistral; consulte [MISTRAL_FATURAS.md](MISTRAL_FATURAS.md). Para usar esta configuração histórica Gemini, selecione `EXPENSE_PHOTO_AI_PROVIDER=gemini`.

Implementação local em 03/10/2026. O leitor **No aparelho** continua disponível com Tesseract. **Gemini Pro** envia a imagem ao Google somente após consentimento e clique do usuário. Ambos exigem conferência de cada compra antes do cadastro; ler uma foto não registra dívidas automaticamente.

## Ativação privada

1. Abra https://aistudio.google.com/apikey com a conta Google desejada. Brasil consta entre as regiões disponíveis. Redirecionamento para regiões ou `permission denied` pode envolver elegibilidade, verificação de idade ou localização; a imagem do erro não permite identificar a causa exata. Consulte https://ai.google.dev/gemini-api/docs/available-regions.
2. Configure faturamento da API no projeto Google. Assinatura do aplicativo Gemini não inclui o consumo desta API. Contas novas podem exigir compra inicial de US$ 5 em créditos, conforme a modalidade oferecida; isso não é mensalidade. Confira condições, validade dos créditos e recarga automática em https://ai.google.dev/gemini-api/docs/billing antes de pagar.
3. Crie a chave e configure diretamente no `.env` privado do servidor. Não envie a chave pelo chat, não coloque no frontend e não faça commit. Exemplo sem credencial:

```dotenv
GEMINI_EXPENSE_PHOTO_ENABLED=true
GEMINI_API_KEY=
GEMINI_EXPENSE_PHOTO_MODEL=gemini-3.1-pro-preview
GEMINI_EXPENSE_PHOTO_MONTHLY_READS=20
GEMINI_EXPENSE_PHOTO_MONTHLY_MICRO_USD=1000000
```

Preencha `GEMINI_API_KEY` somente no arquivo privado. Limpe o cache de configuração com `php artisan config:clear` usando o PHP do ambiente. A integração permanece desligada enquanto não houver habilitação e chave. Antes de publicar/migrar em produção, valide backup do banco e arquivos privados.

## Custo e limites

O modelo padrão é **Gemini 3.1 Pro Preview**, sujeito a mudanças pelo Google. As tarifas configuradas são US$ 2 por milhão de tokens de entrada e US$ 12 por milhão de saída, incluindo raciocínio. Fonte: https://ai.google.dev/gemini-api/docs/pricing. Não há garantia de precisão ou custo fixo por fotografia.

O módulo permite até 20 tentativas mensais compartilhadas pelos usuários e um teto estimado de **US$ 1**. Esse teto pertence ao aplicativo, não controla a cobrança da conta Google, câmbio, impostos ou consumo de outros aplicativos. A contagem de tokens antecede a geração; a reserva considera até 4.096 tokens de saída. São aceitos até 16.000 tokens de entrada. Uso conhecido atualiza o custo; timeout ou uso desconhecido preserva a reserva conservadora. Erros também entram no limite de tentativas. Não há repetição automática de uma chamada paga. A mesma solicitação ou imagem concluída pode reutilizar resultado durante 24 horas, sem nova geração.

## Dados e revisão

- JPEG, PNG ou WebP até 10 MB e 16 megapixels no Gemini. O servidor corrige orientação, limita a maior dimensão a 2.400 pixels e reencoda JPEG sem metadados; não grava a foto na área privada da aplicação.
- Chave enviada apenas pelo backend ao endpoint oficial HTTPS, em cabeçalho. Redirecionamentos e retries automáticos desativados. Funcionário e Usuário local não acessam essas rotas.
- `cg_photo_reads` registra usuário, hashes, modelo, estado e consumo; resultados financeiros reconhecidos podem ficar em cache por 24 horas. Resultados vencidos são apagados na próxima leitura; o registro de consumo permanece e participa do backup.
- Valores ou parcelas desconhecidos ficam para correção. Duplicatas são sinalizadas. Resposta truncada ou inválida não é importada. Confira especialmente valor da parcela, parcela atual, total de parcelas e datas; números na descrição não substituem o valor da coluna da fatura.
- Cancelar a tela depois do envio não garante cancelamento da cobrança Google. Uma chamada interrompida pode manter reserva; uma execução fatal pode deixar registro pendente que requer investigação, sem estornar consumo presumido.
- O cadastro em lote mantém transação, autorização e proteção contra repetição da importação. A leitura não altera OS, estoque ou Financeiro empresarial.

## Validação e pendências

Testes PHP com respostas Google simuladas verificam contrato, limites, privacidade, permissões, custos, timeout, respostas incompletas, cache e backup/restauração. Testes em navegador verificam consentimento, revisão, cadastro e retorno ao Tesseract real. **Ainda pendentes:** liberar acesso da conta, configurar chave/faturamento, medir precisão e consumo com a fatura real e publicar em produção. Nenhuma chamada Google real foi feita nesta etapa.

Backup anterior verificado: `C:\Users\Allan\ARL-backups\controle-gasto-gemini-20261003-001607`, com código, alterações locais, histórico Git, banco e arquivos privados. Migração aditiva: `2026_10_03_030000_create_expense_photo_reads.php`.
