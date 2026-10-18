# ARL Informática — Etapa 1: compressão e cache HTTP de arquivos estáticos
**Data:** 15/10/2026. **Status:** configuração de produção LOCAL preparada e validada em Apache isolado; **não ativada no Apache principal até seu próximo reinício pelo Laragon**.

## Resumo executivo
- Site local `arlinformatica.test`: Apache 2.4.68 (Laragon) é proxy HTTP para o PHP local `127.0.0.1:18015`.
- Em ambos os endpoints atuais, o CSS principal era entregue sem gzip (403.616 bytes), sem Cache-Control público de versão. O main JavaScript era entregue sem gzip (57.678 bytes).
- Foi testada em processos Apache independentes nas portas localhost **18881** e **18882** uma política restrita a CSS/JS com hash Vite dentro de `/build/assets/`.
- **Resultado medido (bytes enviados, curl GET gzip):**
  - `main-DljT9dUs.css`: **403.616 → 58.641 bytes**, -85,5%.
  - `main-BivkxHa6.js`: **57.678 → 18.325 bytes**, -68,2%.
  - Descompressão com `curl --compressed`: SHA-256 de ambos os arquivos idêntico ao conteúdo original em disco.
  - Request `Accept-Encoding: identity`: corpo permanece sem gzip; retorno `Vary: Accept-Encoding` em gzip.
- Respostas de login/HTML permanecem privadas e sem cache público; chamadas anônimas de API continuam HTTP 401 `no-store, private`; `sw.js` e imagens não ganham cache de um ano.
- Um asset JS inexistente produz HTML HTTP 200 pelo fallback da aplicação local. A **primeira proposta indevidamente dava Cache-Control immutable a esse HTML**. Corrigimos *antes de promover* com filtro por tipo MIME. O teste final comprovou HTML de fallback com `no-cache, private` e sem gzip/immutable. O problema do fallback retornar HTTP 200 pode ser auditado separadamente, sem alterar as rotas existentes.
- Outras aplicações em funcionamento no Laragon: `DoctorMotos.test` HTTP 200; `arl-maquinas.test` HTTP 200; nenhum vhost analisado tinha regra direta de gzip nem .htaccess com mod_deflate nas pastas pesquisadas.

## Arquivo efetivamente alterado
`C:\laragon\etc\apache2\sites-enabled\arlinformatica.test.conf`

A configuração existente de proxy foi **preservada**. Adicionados:
1. `LoadModule deflate_module modules/mod_deflate.so` condicional, registrado globalmente porque Apache só permite LoadModule no contexto de servidor.
2. `<LocationMatch>` *dentro do vhost ARL* que só trata `/build/assets/<nome>-<hash>.css|js`, com `AddOutputFilterByType DEFLATE text/css application/javascript text/javascript`.
3. `Header always set Cache-Control "public, max-age=31536000, immutable"` somente para HTTP 200 cujos `Content-Type` são CSS ou JavaScript, verificado via `resp('Content-Type')`.
4. Gzip acrescenta `Vary: Accept-Encoding`. Cache por 1 ano é seguro para nomes Vite com hash, não para HTML/API/PDF/assets sem hash.

**O `httpd.conf` global NÃO foi editado. O código React, CSS da interface, PHP, o banco MySQL e os outros vhosts NÃO foram modificados. Não houve Git commit, push nem deploy.**

## Backup, validações e ativação
- Backup do arquivo vhost ANTES da modificação e SHA-256 validado:
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 11-57 - APACHE-ARL-GZIP-CACHE-ANTES\arlinformatica.test.conf.ANTES`
  SHA-256 antigo: `F18FB7974354AE93B814CC668F6B4E548D017D82E8815D864FB1431D2155B293`
- `httpd.exe -t` do Apache principal **Syntax OK** depois de promover as diretivas; teste da proposta Apache isolada igualmente **Syntax OK**.
- O Apache principal (PID inicial **9060**) pertence ao aplicativo Laragon, **não** a um serviço Windows Apache2.4. O comando `httpd.exe -k restart` falhou no Apache isolado por falta do serviço e **não foi usado no servidor principal**.
- Não reiniciamos o Apache principal, pois isso causaria indisponibilidade temporária a DoctorMotos e ARL Máquinas. Portanto, o CSS **ainda sai sem gzip no Apache principal** até que o usuário reinicie **somente o Apache** pela interface Laragon. Não interromper o MySQL. A configuração já está salva e será lida no próximo Start do Apache.
- Processos Apache **isolados de testes** nas portas 18881/18882 foram encerrados por PID após os testes: ambas as portas ficaram sem listener, enquanto a porta 80 permaneceu ativa.
- Arquivo de verificação local: `G:\Downloads\VERIFICAR-COMPRESSAO-ARL.bat`. Depois de reiniciar o Apache, executar o BAT para testar gzip, Cache-Control immutable, Vary, integridade SHA256 e resposta dos demais sites. Antes do reinício o BAT dá resultado **não aprovado**, corretamente.
- Se houver falha na ativação: devolver o vhost antigo copiado no backup e reiniciar o Apache pela interface Laragon; não modificar módulos nem projetos terceiros para contornar o erro.

## Evidências
`%LOCALAPPDATA%\ARL-Informatica-Dev\HTTP-PERFORMANCE-20261015\`
- Configurações QA `arl-http-gzip-sandbox.conf`, `arl-http-gzip-sandbox-v2.conf` e proposta `arlinformatica.test.conf.PROPOSTA`
- Capturas de headers por tipo: `header-v2-CSS.txt`, `header-v2-JS.txt`, `header-v2-MISSING.txt`, `header-v2-HTML.txt`, `header-v2-API.txt`, `header-v2-SW.txt`, `header-v2-STATIC-ICON.txt`.
- Respostas antes da intervenção: `header-css-BASE.txt`, `header-js-BASE.txt`, etc.
- Arquivos decodificados baixados de QA comparados por SHA-256 com `public/build/assets`.

## Próxima etapa recomendada
1. **Ativação em momento oportuno:** reiniciar somente o Apache pelo Laragon, conferindo que DoctorMotos/ARL Máquinas estão livres de operação; rodar o BAT de verificação para aprovar a mudança ativa.
2. Avaliar compressão e cache **no servidor de hospedagem KingHost separadamente**; a configuração local não altera a hospedagem, e não implica que ela esteja sem gzip.
3. Depois de medir essa melhoria ativa, investigar peso CSS/JS das abas Controle de Gastos e Fornecedores. Não deduplicar regras CSS sem comparações de layout e bateria E2E.
