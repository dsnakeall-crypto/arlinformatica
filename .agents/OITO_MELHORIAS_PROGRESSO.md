# Checkpoint — oito melhorias ARL — 12/10/2026

Cópia isolada: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\02 - Desenvolvimento\arl-oito-melhorias-20261012
Branch: codex/oito-melhorias-20261012
Base publicada: e90f11fea20839e573df7a40d67489301dbcaad7
Backup externo verificado: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\oito-melhorias-base-20261012-012927 (ZIP e bundle Git verificados).

## Estado preservado
- Implementados backend de pagamento por responsável/dívida, prévia verificável, distribuição por vencimento, idempotência e transação no mecanismo financeiro existente.
- Valor personalizado significa dinheiro efetivamente pago, conforme resposta do proprietário.
- Implementados totais por instituição incluindo parcelas futuras, sem materializar parcelas durante cálculo.
- Interface inicial de pagamento rápido, identificação compacta das parcelas e aria-pressed dos botões de atendimento implementados, ainda em validação.
- Pendente: criar CSS importado arl-eight-improvements-20261012.css; o build neste checkpoint ainda está incompleto.
- Pendente: validar concorrência real, CSRF, regressão financeira, Playwright das oito alterações, lint, TypeScript, build e testes unitários.
- Pendente: corrigir cancelamento de prévia da interface (loading), revisar efeitos colaterais, pacote/publicação revisáveis e relatório final.
- Nenhuma migration nova. Nenhuma alteração no repositório original ou em produção. Nenhum push.

## Evidências
- PHPUnit ExpensePersonPaymentTest: 10 testes, 112 assertions aprovados em SQLite isolado.
- Uma assertion adicional de saldo futuro por instituição foi acrescentada depois e precisa ser reexecutada.
- Sintaxe PHP do controller e serviço aprovada antes das últimas mudanças; repetir ao concluir.
- Uso consultado: 76% consumido / 24% restante da janela de 300 minutos. Este registro é uma medição pontual, não previsão.

## Retomada
Executar na cópia isolada acima:
    git status --short
    git branch --show-current
    git log -1 --format=%H
    $env:APP_KEY='base64:'+ [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    php vendor/phpunit/phpunit/phpunit tests/Feature/ExpensePersonPaymentTest.php
    npm run lint
    npm run build
    npm run test:unit

O hash deste checkpoint é obtido por git log -1 e registrado também no arquivo externo CHECKPOINT-OITO-MELHORIAS.txt dentro do backup. Nunca executar comandos de escrita na cópia original. Não ativar release sem autorização final expressa.
