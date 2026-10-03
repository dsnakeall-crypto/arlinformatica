# Faturas com Mistral — 03/10/2026

A opção Mistral substitui Gemini como provedor preferido no cadastro de dívidas por foto. Leitura local no aparelho continua disponível. Não muda compras, parcelas, OS, estoque ou Financeiro automaticamente: todos os itens passam pela revisão e pelo cadastro transacional existente.

## Configuração privada

No `.env` local/servidor, configure:

```dotenv
EXPENSE_PHOTO_AI_PROVIDER=mistral
MISTRAL_EXPENSE_PHOTO_ENABLED=true
MISTRAL_API_KEY=
```

Cole a chave somente depois de `MISTRAL_API_KEY=` no arquivo privado; nunca no chat, Git ou frontend. Após salvar, execute `php artisan config:clear`. Em produção, use o PHP da hospedagem e valide previamente backup do banco e arquivos privados. A conta deve permitir a API no pagamento por uso; assinatura do chat Mistral não é necessária. Desative a autorização de treinamento na conta, conforme preferência do proprietário. Não confundir ausência de treinamento com ausência de processamento/retenção pelo fornecedor.

## Como funciona

O backend chama uma vez `https://api.mistral.ai/v1/ocr`, com modelo fixado `mistral-ocr-4-1`, imagem JPEG em memória e `document_annotation_format` JSON Schema. O prompt orienta usar o valor cobrado da parcela, associar a coluna correta à descrição, ignorar pagamentos/totais e deixar números ilegíveis vazios. A chave usa cabeçalho Bearer; não há redirecionamento nem retry automático.

A foto só é enviada após consentimento na tela. São aceitos JPEG/PNG/WebP até 10 MB e 16 megapixels; orientação corrigida, maior dimensão de até 2.400 pixels e metadados removidos. Não é persistida no armazenamento do aplicativo. Markdown bruto, cabeçalhos pessoais e imagem devolvida pelo fornecedor não são enviados ao frontend. Apenas campos financeiros validados chegam à revisão. Falha, timeout, documento com quantidade inesperada de páginas ou JSON incompleto impedem a importação; leitura no aparelho permanece disponível.

Cache financeiro por 24 horas e registro de tentativas em `cg_photo_reads`, reaproveitando tabela existente, sem nova migração. Hash inclui provedor/modelo/rotação e versão para evitar misturar resultado Gemini e Mistral. Resultados vencidos são apagados na próxima leitura, mantendo histórico de consumo. Não há garantia de cancelar cobrança ao fechar a tela.

## Limite e estimativa

Mantidos 20 tentativas por mês e US$ 1 de limite estimado compartilhado pelos usuários. A reserva é feita antes da chamada paga. O contador usa estimativa conservadora de US$ 0,009 por foto: US$ 4 de OCR + US$ 5 de páginas anotadas por mil páginas, cobrindo conservadoramente possível composição dessas tarifas. Não afirma que a fatura real da Mistral será essa soma. Fonte: https://docs.mistral.ai/models/ocr-4-1.

Com 20 fotos, essa estimativa é US$ 0,18; a R$ 6 por dólar apenas como exemplo, R$ 1,08 antes de impostos. Não é cotação atual nem garantia de cobrança. Erros/timeouts preservam reserva quando pode ter ocorrido cobrança. O limite do aplicativo não controla usos externos, mudança de tarifa ou câmbio. Configure também limite na conta Mistral e confira condições de pagamento: https://docs.mistral.ai/admin/billing-usage/billing.

Para retornar ao Gemini, selecione `EXPENSE_PHOTO_AI_PROVIDER=gemini` com configuração privada própria; nunca há troca automática entre provedores pagos.

## Validação

Testes usam respostas Mistral simuladas e imagem fictícia: consentimento, chave somente no backend, valor/parcelas estruturados, cache, orçamento insuficiente, timeout e resposta inválida. Além dos mocks, a chave privada foi configurada e a API real respondeu HTTP 200: a imagem fictícia teve duas compras corretas; a fatura pessoal de novembro foi enviada com consentimento expresso e retornou os nove valores, parcelas atuais e totais de parcelas exatamente como na imagem. Isso valida essa amostra, sem garantir precisão para qualquer foto. Nenhuma dívida foi cadastrada nos testes reais. Duas tentativas registraram US$ 0,018 no contador conservador, não na fatura confirmada do provedor.

Backup anterior verificado: `C:\Users\Allan\ARL-backups\controle-gasto-mistral-20261003-013308`, incluindo arquivos/alterações locais, histórico Git, banco e arquivos privados. Backup e conferência inicial de 56 tabelas e 128 arquivos privados. Conferência final preservou por hash as outras 55 tabelas e todos os arquivos privados; somente dois registros autorizados de leitura foram adicionados a `cg_photo_reads`. Nenhuma publicação em produção nesta etapa.

## Próximas etapas combinadas

Depois da Mistral e da reformulação de Fornecedores: Controle de Gasto com acesso e interface própria Mobile/Tablet, acabamento 3D e fluxos completos de cadastro por foto, revisão, compras, parcelas e pagamentos. Essa etapa deve ser planejada e testada separadamente; não está concluída.
