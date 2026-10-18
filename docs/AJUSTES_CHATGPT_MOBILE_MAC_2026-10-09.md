# Ajustes diretos pelo ChatGPT — 09/10/2026 (somente ambiente local)

Sem uso de Claude ou Codex. Arquivos editados diretamente na pasta `C:\laragon\www\arlinformatica`. Não houve commit, push, deploy, publicação, troca de APP_KEY, nem alterações no banco MySQL/MariaDB do DDEV.

## Ponto de retorno

Backup anterior às edições confirmado em `C:\Users\Allan\ARL-backups\ajustes-chatgpt-20261009-172258`, contendo bundle Git verificado, patch das modificações existentes, cópia física dos arquivos alterados e não rastreados antes desta rodada, arquivo .env em cópia privada e relação de arquivos. **Nunca publicar a cópia do .env.**

## Falha “The MAC is invalid”

A leitura do log `storage/logs/laravel.log` apontou `ServiceOrderController::show` na verificação de `system_password` criptografada (`ServiceOrder` usa cast `encrypted`). Registros locais importados do servidor podem ter sido cifrados com APP_KEY diferente da local.

- Na abertura/edição, verificar apenas presença via `getRawOriginal('system_password')`, sem tentar descriptografar.
- Na consulta restrita da senha, tratar `DecryptException` com código claro `SYSTEM_PASSWORD_KEY_MISMATCH` (HTTP 409), mantendo acesso à OS, segurança da consulta e rastreabilidade de visualizações válidas.
- Nunca alterar o texto cifrado, gerar APP_KEY nova ou substituir a chave para ocultar o problema.
- Se o usuário necessitar revelar uma senha histórica cifrada com outra chave, a senha poderá requerer a chave original ou recadastro autorizado.
- Teste novo para texto cifrado incompatível: OS abre, consulta da senha produz 409 sem expor dados, edição de relato não altera senha; 5 testes dessa classe e 73 verificações passaram no DDEV, com SQLite em memória.

## Interface

- Indicador “Total a pagar no mês”: valor principal = bruto/original; linha secundária = “Pago / abatido”. NÃO usar a legenda “Falta pagar” nesse indicador.
- Indicadores das duas pessoas e do Casal: valor principal = falta pagar; linha secundária = total original. Backend financeiro não foi alterado.
- Barra inferior ARL e miniapp de gastos: ícones em círculos mais compactos, mantendo pelo menos área tátil confortável.
- Botão de três tracinhos no modo barra inferior: painel lateral mobile translúcido e arredondado, com fundo escurecido e clique fora para fechar; menu compacto independente e desktop preservados.
- Projeção do miniapp mobile: quatro chips/submenus sempre visíveis em Gastos/Quitadas/Pagamentos/Projeção: Quitadas, Pagamentos, Projeção futura, Histórico de gastos; seção selecionada marcada.
- Clientes mobile: compactação do cabeçalho da busca, toolbar e ordenação alfabética.
- Home mobile de OS e layout Web/PC não foram reformados nessa rodada.

## Verificações

- `ServiceOrderSystemPasswordTest`: 5 testes / 73 verificações OK (DDEV, SQLite :memory:).
- TypeScript + Vite build: OK; lint projeto: OK; 41 testes frontend: OK.
- Playwright financeiro: 2 testes completos PC e mobile OK (larguras 320, 360, 375, 390, 414, 430, 768, 1366, 1920).
- Playwright menu/painel, submenus, Clientes: 3 testes mobile OK. Playwright utilizou banco de TESTE `database/e2e.sqlite` descartável e `PHP_INI_SCAN_DIR` apenas no processo de testes; não usou MariaDB do DDEV.

## Pendências e limites

- [PENDENTE] Conferir no navegador DDEV autenticado com as OS importadas (não usar/alterar senhas dos clientes), e avaliar manualmente os detalhes e o menu nas dimensões reais de celulares.
- [PENDENTE] Escolher com o proprietário ajustes finos de cores/opacidade/tamanhos dos ícones e fluidez; DDEV sobre /mnt/c tem lentidão pré-existente separada dos testes.
- [PENDENTE] Suíte completa de navegador já possuía falhas antigas; não foi executada nesta rodada, apenas testes focados novos.
- [PENDENTE] Nenhuma mudança publicada; publicação futura requer autorização explícita e backups de produção.
