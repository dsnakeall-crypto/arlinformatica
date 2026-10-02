# Isolamento de backup, restauração e testes — 02/10/2026

Durante a validação do módulo Fornecedores foram identificadas duas falhas anteriores do isolamento de testes. A instalação de produção não foi acessada.

## Causa

`BackupService` chamava `Schema::getTableListing()` sem informar o schema. Na versão instalada do Laravel, o MySQL retorna tabelas de todos os schemas acessíveis à conexão. Criar um banco de testes separado não bastava: ao testar a restauração, a rotina também apagava/reinseria tabelas do banco local de uso. Nomes iguais em bancos diferentes também colidiam nos arquivos JSON do ZIP.

O E2E usava banco SQLite próprio, mas mantinha o mesmo diretório privado da aplicação. PDFs de teste com os mesmos IDs podiam substituir PDFs locais.

## Correções

- Backup e restauração agora enumeram explicitamente apenas `Schema::getCurrentSchemaListing()`. Isso também evita incluir dados de outra aplicação no ZIP.
- Restauração de dados preserva o registro das migrações instaladas: um backup anterior à criação de Fornecedores não deve fazer uma migração já aplicada tentar recriar suas tabelas.
- `tests/TestCase.php` bloqueia testes em banco MySQL cujo nome não contenha o segmento `test`, antes das traits de migração/limpeza.
- PHPunit usa arquivos privados em `storage/framework/testing/phpunit-private`.
- Playwright usa `storage/framework/testing/e2e-private`, separado de `storage/app/private`.
- `PRIVATE_STORAGE_PATH` permite configurar esse caminho nos testes. A produção conserva o diretório padrão quando a variável não está definida.
- Teste de regressão cria outro schema SQLite acessível com uma tabela `clients`, valida que o backup não inclui seus registros e que a restauração não o modifica.

## Recuperação e conferência

O teste de restauração alterou o banco local. Foi criada uma cópia de segurança do estado encontrado e restaurados os dados do ZIP validado antes da implementação. As tabelas novas e a migração de Fornecedores foram preservadas.

Foram recuperadas e conferidas por SHA-256 as 35 tabelas de dados do aplicativo presentes no backup. Clientes (596), OS (17), catálogo (22), estoque, orçamentos, documentos e financeiro correspondem ao estado protegido. Também foram recuperados 28 arquivos privados que divergiam: os 123 arquivos privados presentes no backup passaram a conferir por hash, sem diferenças.

As 22 tabelas da outra aplicação acessível no MySQL foram comparadas com o backup anterior e não apresentaram diferenças. Nenhum dado fictício de fornecedor ficou no banco de uso.

Backup original preservado em `C:\Users\Allan\ARL-backups\fornecedores-20261002-092132`. Os scripts de conferência/recovery ficam em `output/diagnostico`, fora dos commits e da publicação. Logs e contagens finais estão no checklist.

Depois da correção, a suíte PHP inteira e os testes de fornecedores/estoque em MySQL descartável foram repetidos; a suíte de navegador também foi repetida usando o diretório privado separado. Os dados/arquivos locais são conferidos novamente ao finalizar.
