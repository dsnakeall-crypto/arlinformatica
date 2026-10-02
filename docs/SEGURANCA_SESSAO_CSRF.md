# Sessões e CSRF — correções de 01/10/2026

## Problemas corrigidos

Um usuário desativado continuava acessando rotas operacionais protegidas somente por `auth` com uma sessão já aberta. O middleware `EnsureActiveUser` agora verifica a conta nas requisições web e API, encerra a autenticação, invalida a sessão e regenera o token quando encontra uma conta desativada. A API responde `401 / ACCOUNT_INACTIVE`; a página redireciona para o login. A desativação administrativa também remove o token antigo de “lembrar acesso”. Os controles de perfil continuam no backend.

O helper principal de API montava os headers de CSRF e depois permitia que `options.headers` substituísse esse objeto inteiro. Os headers agora são combinados com `Headers`, preservando objetos, tuplas e instâncias de `Headers`. Uploads com `FormData` mantêm o boundary definido pelo navegador.

## Expiração e reconexão

O módulo `session-security.ts`, carregado pelo aplicativo principal, compõe o `fetch` já usado pelos módulos existentes. Ele aplica o token atual somente a mutações da mesma origem em `/api/*`, `/login` e `/logout`. Respostas `401` e `419` mostram um aviso na tela e deixam a resposta original disponível ao chamador.

O usuário pode entrar em outra aba e clicar em **Verificar sessão** na aba original. A verificação consulta `GET /session/csrf-token`, atualiza a meta com o token corrente apenas quando a sessão está autenticada e orienta revisar os dados antes de salvar novamente. Não existe repetição automática de POST, PUT, PATCH ou DELETE. O aviso preserva os campos que a tela mantém após o erro; não cria armazenamento de rascunhos nem persiste senhas no navegador.

O formulário de login consulta o token ao enviar. Após um `419`, renova o token e mantém os campos, exigindo um novo clique em **Entrar**. A API fornece mensagens em português e códigos `SESSION_EXPIRED` e `UNAUTHENTICATED` para os erros correspondentes.

O endpoint de token também funciona para visitantes, para renovar o formulário de login. Ele retorna somente o token da própria sessão e um booleano de autenticação, exige a mesma origem para a leitura pelo navegador e usa `Cache-Control: no-store, private`. Não concede acesso a dados ou operações, não libera CORS e tem limite de 60 consultas por minuto. O service worker não armazena esse endpoint. A proteção CSRF continua ativa nos grupos web e API, inclusive login e logout.

## Validação

Resultado local completo: **203 testes PHP / 1648 asserções**, **12 testes unitários frontend** e **103 testes Playwright**, todos aprovados. ESLint, Pint, TypeScript e build também passaram. O Playwright rodou com `retries: 0` em 9,6 minutos.

- Os testes `SessionSecurityTest` cobrem sessão existente, conta desativada, cookie de lembrança, revogação administrativa e consulta de token por visitante.
- `CsrfSecurityTest` força a execução real do middleware CSRF, que o PHPUnit normalmente ignora. Tokens ausentes ou inválidos rejeitam o lançamento financeiro sem gravação; o token válido permite exatamente uma gravação.
- Os testes unitários do frontend cobrem headers personalizados, `Request`, `FormData`, restrição de origem e ausência de repetição automática.
- `session-security.spec.ts` exerce o backend real no Chromium: valor e descrição preservados após `419`, reconexão explícita, gravação somente após novo clique, conta desativada em outro contexto e login expirado. O aviso é conferido em 390 px.

As suítes locais usam SQLite descartável; esta validação não comprova os cookies, HTTPS ou operação da KingHost. Conferir o smoke test de sessão na publicação real e manter `SESSION_SECURE_COOKIE=true` com HTTPS conforme `KINGHOST_DEPLOY.md`.

## Smoke test após publicação

1. Confirmar HTTPS e os atributos `Secure`, `HttpOnly` e `SameSite` do cookie de sessão no navegador.
2. Entrar com uma conta de homologação em um navegador separado. Desativá-la pelo Master e confirmar que a próxima consulta retorna `401`, sem permitir nova gravação. Verificar também com “lembrar acesso”.
3. Abrir um formulário com dados de homologação, encerrar a sessão em outra aba e tentar salvar. Confirmar o aviso `401/419` e a manutenção dos campos. Entrar novamente, verificar a sessão na aba original e confirmar que nenhum lançamento foi criado automaticamente.
4. Revisar os dados e enviar uma vez; conferir um único registro e o valor correspondente no histórico/Financeiro. Executar em ambiente de homologação ou com dados explicitamente autorizados para o smoke test.

## Escopo

A auditoria Composer da CI identificou os avisos `GHSA-97jj-33gv-5xf9` e `GHSA-3q6v-r5mr-hxv8` na dependência transitiva `league/commonmark` 2.10.0. O lock foi atualizado somente para a versão de correção 2.10.2. A auditoria de dependências de produção passou sem avisos e os 203 testes PHP passaram novamente. A [release oficial 2.10.2](https://github.com/thephpleague/commonmark/releases/tag/2.10.2) contém as duas correções.

Estas correções tratam os achados confirmados de sessão/CSRF do relatório `analise.txt`. Os nomes “Segurança A” e “Segurança B” não possuem uma especificação detalhada no repositório; esta entrega não declara uma auditoria completa de segurança nem conclui automaticamente esses blocos do roteiro. Publicação, demais funcionalidades e homologação em produção permanecem etapas separadas.
