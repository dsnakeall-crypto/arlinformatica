# Pacote financeiro final - checkpoint de 13/10/2026

Pasta oficial: C:/Users/Allan/OneDrive/Programacao APP/www/arlinformatica
Branch: codex/final-financeiro-laragon-20261013. Base publicada 5c8885f, publicador1555411. Não alterada a main.

## Implementado, ainda em validação final
1. Resumo compacto com original em preto, falta pagar em verde, Casal amarelo, avatares e ações preservados. Próximo vencimento incorporado ao principal. Removida duplicação dos cards grandes.
2. Componente único de cifrão verde/preto circular 3D. Excluído do estilo neutro Clean para não perder cor após carregar preferências.
3. Pagamento por dívida reutilizado; parcial/mensal e total individual preservados; casal permanece mensal por participação.
4. Quitação institucional por instituição + modalidade + pessoa + mês; somente a parte escolhida no casal. Prévia vinculada por hash, bloqueio transacional e idempotência. Agrupamento de UI separado por modalidade.
5. Comprovante capturado como snapshot imutável na auditoria existente, dentro da transação. cg_entries continua fonte financeira. Endpoint privado exige acesso ao módulo, sem cache. Download automático após persistir; botão alternativo e reemissão no histórico não repetem pagamento. Estorno aparece no comprovante histórico. Operações anteriores sem snapshot retornam mensagem explícita, sem inventar descrição histórica.
6. PDF detalhado Allan/Carol/Geral organizado por instituição/modalidade, nova página por grupo, tabelas individuais alternadas azul/verde, total da parcela e participação separada, subtotais e somas conferidos. Pagas incluídas, futuro não multiplicado e Casal não duplicado.
7. Menu inferior ARL: três segundos de inatividade, interação reinicia, fora fecha imediatamente, navegação/fecho/desmontagem cancelam timer; desktop e miniapp de Gastos preservados.

## Testes confirmados
- PHP Laragon8.3 SQLite: 400 testes, 7439 verificações.
- MySQL8.4 Laragon isolado, porta33418, datadir exclusivo no OneDrive: 400 testes, 7439 verificações. Servidor de teste encerrado após validar; nenhum banco de uso conectado.
- Concorrência real entre usuários: statuses201/422, somente5000centavos; prévia antiga rejeitada. Mesma solicitação concorrente:201/201 com replay, somente5000centavos.
- Unitários:61 aprovados. Lint, TypeScript, build e Pint aprovados.
- E2E novo institucional: falha simulada do PDF, reemissão e nenhum pagamento repetido, modalidade/participação/futuro preservados: aprovado.
- E2E quickPayment desktop/mobile: aprovado após adequar expectativa visual ao novo símbolo preto autorizado.
- E2E menu/cards320/390/430: aprovado depois de corrigir interferência Clean; espera os dados carregarem antes da captura.
- Comprovante fictício multipágina gerado/renderizado; acentuação, valores e conteúdo legíveis. Guia manual do certificado salvo em BACKUPS APP/KH-CERTIFICADO-LIMPEZA-20261013/GUIA-CERTIFICADO-ARLCG-20261013.pdf.

## Em andamento / pendente
- Regressão ampliada E2E de todos os specs expense rastreados + novos + menu. Resultado em output/FINAL_LARAGON_E2E_REGRESSAO_20261013.log. Não declarar integralmente verde antes do término; corrigir falhas reais e adequar apenas expectativas incompatíveis com mudanças explicitamente aprovadas.
- Conferência visual final dos três PDFs longos e dos cards com valores grandes. Comprovante já renderizado; relatórios precisam QA final.
- CI do GitHub do novo checkpoint precisa terminar verde.
- Publicador antigo exige adaptação para arl-private e rollback com arquivos locais verificados: releases9a/stagee90 foram removidas na manutenção. Não reutilizar publicador antigo em produção. Nova publicação depende de confirmação expressa do proprietário.
- Certificado/domínio fica exclusivamente para o proprietário, conforme comando; nenhum chamado enviado. TERRAPLAN e bancos oficiais intactos.

## Teste manual pronto
http://127.0.0.1:8020/login - PHP do Laragon, SQLite dedicado database/laragon-homologacao-20261013.sqlite, privados separados em storage/framework/testing/laragon-demo-private. Conta exclusivamente fictícia e2e.master / E2e-Segura-2026!.
Reabrir: pwsh -NoProfile -File deploy/INICIAR-LARAGON-HOMOLOGACAO.ps1
Não recria dados existentes e não modifica .env. Nenhum dado oficial importado.

Backup da pasta anterior e histórico Git validado: APP ARL/BACKUPS APP/LARAGON-SINCRONIZACAO-20261013/PASTA-OFICIAL-ANTES.tar.gz,4047arquivos, SHA2568392520295812ea3f714fa2c0b0c480e2de405c063303d4209dd70de46c930fd. Vendor/node_modules regeneráveis preservados em disco e excluídos do arquivo. Stash documental anterior preservado; arquivos não rastreados não removidos nem enviados indiscriminadamente ao GitHub.
PAUSA8%: regressão ampla ainda não verde; dois cenários mobile reprovados (expense-control-mobile.spec.ts31/120), causa pendente. CI89252d1 estava em andamento. Ver RETOMADA-CODEX.md. Não publicado.

## Retomada expressamente autorizada — 13/10/2026
Proprietário autorizou continuar, concluir testes e publicar, SEM alterações no banco oficial. Uso confirmado ao retomar: 0% consumido / 100% disponível. Nova localização de backups: C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 13-10-26 - 12-54. Código/Git local anterior validado, 4.593 arquivos, SHA256 fdf18a7ca6cfe3e107bf3062a98b17429ed4de24e8c7a7e11e563070e3e9ac24. Senha SSH local ignorada no Git, nunca exibida ou incluída no pacote.
Correções solicitadas implementadas: restauração dos cards detalhados Allan/Carol; compactos menores, sem Ver gastos; valor pendente menor; carteira web sem posição absoluta; clique no card abre popup mensal somente de leitura por instituição/modalidade, incluindo sua participação do casal; cifrão continua pagamento independente. PDF detalhado agora reserva altura real de todos os textos e mantém alternância/paginação sem sobreposição.
Validações desta rodada: 400 PHP SQLite / 7439 assertions;61 unitários; lint/types/build;9 cenários focados aprovados, reteste mobile mensal aprovado,24 regressões adicionais aprovadas;3 cenários finais resumo/modalidade/clique/320-430 e visual aprovados. Falhas intermediárias conservadas nos logs. PDFs fictícios longos: Allan15 páginas,Carol15,Geral22,Casal11; páginas de abertura/final renderizadas e inspecionadas. Testes Linux somente do publicador/limpeza em container isolado, sem rede ou banco (não DDEV): ativação, rollback, falha de smoke, rejeição de backup alterado e preservação de symlinks/privados/TERRAPLAN aprovados. Testes financeiros usam Laragon isolado.
Backup remoto feito APENAS por streaming para o PC: código/privados/aliases,8030arquivos, todos conferidos com manifesto e SHA256. SQL oficial exportado somente para o PC, conclusão e hash validados; nenhuma importação, migration ou alteração de dados. Não houve ativação nesta anotação.
Próximo: obter CI integral verde da fonte nova; gerar/validar pacote com prepare-laragon-final-package.py; executar publish-laragon-final.py publish com relatório, backup-dir e --authorize-publication; conferir HTTPS/privacidade/TERRAPLAN; só então cleanup do antigo5c com manifesto do backup local. Publicador antigo NÃO usar. Toda publicação usa arl-private permanente; nenhuma operação de banco em deploy. O código novo ainda não está no ar nesta anotação. Regra de parar aos8% permanece.
