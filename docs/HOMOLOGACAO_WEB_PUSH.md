# Homologação manual do Web Push

A automação valida configuração ausente, payload mínimo, falha tolerante, inscrição inválida e ausência da chave privada nas respostas. A exibição em aparelho físico depende do navegador, sistema operacional, HTTPS e chaves VAPID reais:

1. publique uma release em HTTPS;
2. configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` somente no `.env`;
3. instale a PWA no Android e no iPhone compatível;
4. permita notificações no aparelho;
5. envie um teste individual em **Configurações > Sistema e Diagnóstico**;
6. confirme a exibição e que o toque abre o link correto;
7. quando possível, invalide/remova a inscrição e confirme a reinscrição.

Registre aparelho, versão do sistema/navegador, data e resultado. Até executar o roteiro, a validação física permanece **[PENDENTE]**.
