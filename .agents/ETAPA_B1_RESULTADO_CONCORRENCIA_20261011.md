# Etapa B1 — teste isolado de concorrencia documental (11/10/2026)

Autorizacao: reproduzir sem alterar aplicativo original ou usar Codex.

## Metodologia
Inspecionado `app/Services/DocumentService.php`: `exists()` => `Storage::put(path)` => `insert()`.
Dois processos independentes em SQLite descartavel e filesystem temporario reproduziram o interleaving das operacoes, com mesmo caminho e UNIQUE(order_id,type,revision). Nao invocaram diretamente o Laravel DocumentService nem MySQL: trata-se de teste de algoritmo, nao teste end-to-end do aplicativo.

## Evidencia
Rodada nao deterministica: um insert aprovado e outro rejeitado, hash coincidiu. Houve erro de limpeza no Windows devido a conexao SQLite ainda aberta em processo principal no primeiro harness; nao houve acesso a banco de uso.
Rodada de ordem forcada: A gravou e inseriu PDF-A; B, usando verificacao de existencia previamente obsoleta, sobrescreveu o mesmo caminho com PDF-B; o indice UNIQUE rejeitou a insercao de B.
- Hash registrado: 9f1ff5d50283f00d4950dd7a832ae5e5808a8f2ce141ba9c22780b38463b2dea
- Hash do arquivo: deedb2c9501256a7abfbef7eda16079a3c2682b9fc1cfd71fb1337752c82f2c1
- Resultado: DIVERGENCIA=true. Ambos processos terminaram com exitcode 0.
- Ficheiros harness externos: C:/Users/Allan/ARL-backups/b1-race-reproduction-20261011.py e b1-forced-interleaving-20261011.py.

## Conclusao
A sequencia utilizada por DocumentService possui uma janela plausivel de corrida capaz de quebrar correspondencia SHA do PDF. Reproduzido deterministicamente para o algoritmo equivalente; falta teste de integracao com DocumentService real em duas conexoes MySQL descartaveis antes de considerar falha real confirmada no framework/runtime. NAO remover documentos, alterar dados ou emitir em producao.

## Proximo gate
Criar teste de integracao concorrente em MySQL isolado invocando Laravel, depois corrigir por reserva atomica/lock e escrita segura preservando contratos, com rollback, testes e CI. Exige autorizacao nova para mudancas.
