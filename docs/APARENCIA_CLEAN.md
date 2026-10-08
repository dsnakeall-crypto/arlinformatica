# Aparência Original e Clean — 08/10/2026

Solicitação: repaginação gráfica integral, inspirada no dashboard claro fornecido pelo proprietário, preservando posições, funcionalidades e o estilo Original como alternativa.

## Uso

Em **Configurações → Identidade → Aparência do aplicativo**, escolher Original ou Clean. No Clean, escolher Verde, Azul, Amarelo, Roxo, Vermelho, Preto ou Claro. A alteração é imediata, sem clicar em Salvar configurações. Original continua sendo o padrão para navegadores sem preferência.

A preferência fica neste navegador/dispositivo (`arl-appearance-v1`), acompanha recargas e sincroniza outras abas da mesma origem. Não altera o cadastro da empresa, permissões ou banco. Se o navegador bloquear armazenamento, a escolha funciona durante a página e um aviso informa que não foi salva. Dados inválidos retornam ao Original/Azul.

## Implementação

- `appearance-preference.ts`: normalização fechada e sete paletas com contraste AA entre fundo e texto dos botões.
- `appearance.ts`: aplicação por atributos no elemento raiz, persistência e evento de atualização. Entrada Vite pequena, disponível também no login; sem biblioteca/dependência nova, API ou observador de DOM.
- `appearance-settings.tsx`: botões de seleção acessíveis dentro da Identidade existente, sem formulário aninhado ou submissão ao servidor.
- `clean-appearance.css`: camada optativa **somente para tela**, incluindo login, navegação, Painel, Ordens/ficha/edição/orçamento, Clientes, Serviços, Produtos, Fornecedores, Financeiro, Controle de Gasto, Pós-Venda, Configurações, popups e mobile. Fundos claros, botões sólidos, bordas discretas e sombras pequenas; remove brilho, degradês decorativos e blur dos componentes cobertos.
- CSS original permanece intacto. Remover o atributo Clean desativa todas as suas regras. A camada não muda display, grade, ordem, posição, largura, altura, espaçamento ou tipografia dos controles existentes. A nova opção de configuração é o único bloco acrescentado à interface.
- Preserva imagens dos cartões, WhatsApp/Maps, gráficos e cores de estados/valores financeiros. Amarelo e Claro usam texto escuro. Impressão e documentos não recebem o tema de tela.

Não há migration, alteração de schema, `.env`, uploads, dados reais, regras de pagamento ou dependência em produção. A configuração Vite local previamente modificada pelo usuário é preservada; o build de verificação usa uma cópia isolada com a configuração versionada e a nova entrada.

## Segurança e limites

Backup incremental verificado, com manifesto SHA-256 e histórico Git: `C:/Users/Allan/ARL-backups/clean-appearance-20261008`. A restauração completa usa a base indicada em `manifest.json` mais o delta, preservando os backups anteriores.

Esta repaginação permite comparar aparências; **não comprova a resolução da lentidão de servidor relatada**, nem substitui a investigação de desempenho. Não houve publicação nesta tarefa. CI, revisão e publicação são etapas separadas; produção exige backup atualizado do banco e arquivos privados.

## Validação

Testes unitários verificam preferência inválida, padrão Original e contraste das sete paletas. Testes de navegador verificam escolha, persistência, ausência de gravações no backend durante a escolha, restauração do Original, geometria, impressão, dez destinos principais, popup de dívida e seis abas mobile. Fluxos existentes também são exercitados com Clean ativo em banco isolado; resultados finais registrados em CHECKLIST_FINAL.md.

### Ajuste de isolamento da CI PHP
A primeira CI identificou seis respostas 500 em testes PHP de login: a nova entrada visual exige manifesto Vite, ausente intencionalmente nos jobs backend. Tests/TestCase.php passa a usar withoutVite() nos testes de servidor, sem remover nenhuma asserção de autenticação/permissão. O E2E continua validando o login com build real. A suíte PHP completa passou com o build temporariamente retirado da cópia isolada: 313 testes e 6505 verificações. No Windows, o processo de teste usou memory_limit=512M para as imagens sintéticas; nenhuma configuração de produção foi alterada.
