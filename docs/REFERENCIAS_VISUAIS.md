# Referências Visuais — ARL Informática

As referências abaixo foram reenviadas e confirmadas pelo proprietário em **04/09/2026** para a homologação visual final da PR #11. Elas são a fonte visual oficial; as regras funcionais atuais continuam sendo definidas por `docs/PROJETO_MESTRE.md` e `CHECKLIST_FINAL.md`.

## Arquivos oficiais recebidos

| # | Arquivo | Uso | SHA-256 |
|---|---|---|---|
| 1 | `01 - tela inicial e menu.jpg` | Painel inicial, menu lateral, cards, tabela, filtros, paginação e identidade Web/PC | `fe7eaa8db7b226f4785768312422b1783864cd22c54cc15a9df9e53a576b6578` |
| 2 | `02 - Cadastro clientes.png` | Listagem/cadastro de clientes e responsividade | `7f231372363ee7333e69151828f1d448017b3217330492a15171858801a4a3ea` |
| 3 | `03 - Nova OS.jpeg` | Nova OS / abertura de chamado desktop e mobile | `9aebb43f6831b0ecaeb35881bfc41643de0f279786444bf331d517eb300e7b4b` |
| 4 | `04 - Opcao de Alteracoes dos chamados abertos na lista.jpg` | Aparência do seletor rápido de status | `e900c32ac84b5351af2162b83057353002f484e22e81aa63d0c289f06bddea72` |
| 5 | `05 - Impressao A4 Fechamento do Chamado.jpg` | Pré-visualização/PDF A4 de fechamento | `a55eaced143a697c9d83e8e0886669023974076e56136f34192fd32d968a1ddf` |
| 6 | `06 - Menu Pos Venda.jpg` | Inspiração visual do Pós-Venda | `f5c2253c91713a843bc6ba1590c16854fcd79be3da3000caad6f5a41216cde6f` |
| 7 | `LOGO.png` | Logomarca oficial ARL Informática | `f3dbf2abf49a5a2adc348aabb16e5d10b681d015370dba1d46ec82bb6313b2e2` |
| 8 | `TIMBRADO.png` | Referência visual oficial para Orçamentos/Laudos | `2016d92d8bacda902c2198eddc8f46cc10e1d2819f39f909326d2e0ca535e824` |
| 9 | `resources/images/documents/papel-timbrado.png` | Fundo oficial imutável de Orçamentos e PDFs de finalização | `5e640a129a7b33d954e9f3b44a872b6f003ed8266f30039a578c11fe599e0087` |

O papel timbrado de produção mede exatamente **1055 × 1491 px**. Sua integridade é validada antes da geração documental; o arquivo não deve ser recortado, deformado, reamostrado ou regravado.

Se os anexos não estiverem montados em um chat futuro, **pesquisar a Library pelos nomes exatos acima antes de pedir novo envio ao proprietário**. Não declarar que uma imagem diferente é a referência oficial apenas por semelhança.

## Regras de fidelidade

- Desktop deve seguir as referências com máxima fidelidade razoável de hierarquia, densidade, espaçamento, cards, tabela, navegação e identidade.
- Não substituir por template genérico.
- Mobile/Tablet não copia a tabela desktop; segue experiência própria mobile-first definida no Projeto Mestre.
- Antes de considerar uma tela homologada, capturar a aplicação já carregada e comparar com a referência. O E2E de homologação deve aguardar dados reais da própria execução, e não apenas ausência momentânea de um texto de loading.
- Dados antigos impressos no `TIMBRADO.png` são apenas referência visual e **não devem ser hardcoded**. Os documentos usam os dados configuráveis da empresa.
- Instagram oficial atual: `https://www.instagram.com/allanluttembarck`. O endereço `instagram.com/arlinformatica` existente no timbrado histórico está desatualizado e não deve voltar ao sistema.
- A `LOGO.png` deve ser usada sem redesenho. Em produção, cadastrar a imagem oficial em **Configurações > Dados/Identidade da Empresa** e validar um PDF real com a logo; o fallback textual `ARL` só é aceitável enquanto nenhuma logo tiver sido configurada.

## Diferenças funcionais intencionais em relação às imagens históricas

As imagens são referência visual, não autorização para restaurar regras antigas que já foram substituídas:

- **Painel:** permanece operacional e **sem faturamento**. Receita e caixa ficam no Financeiro, conforme arquitetura atual, mesmo que a imagem histórica mostre “Faturamento (mês)”.
- **Status:** pagamento continua separado do status operacional; não reintroduzir `Pago` como status da OS apenas porque aparece na imagem histórica do dropdown.
- **Pós-Venda:** a aparência pode se inspirar na referência, mas o fluxo funcional é o modelo simplificado/auditado do Projeto Mestre.
- **Menu Financeiro:** não recriar módulos separados apenas para imitar a navegação antiga se as funções atuais estão consolidadas no Financeiro.

## Homologação realizada na PR #11

- As capturas automáticas foram corrigidas no commit `53b21279fb689938eb84f663242107a22aca9339` para só fotografar Painel/Clientes depois que a OS e o cliente criados pelo próprio teste aparecem de fato.
- A comparação das novas capturas revelou duas falhas reais na listagem de Clientes: ações extrapolando o card/coluna no desktop e telefone quebrando excessivamente no mobile.
- O CSS foi corrigido no commit `4601f74d83a96d0b68698b276b25f3bdf9328920` e a regressão mobile passou a ser protegida por geometria no Playwright no commit `cdffc543df5c147b64b9c87f14a20831145d962a`.
- No CI #356, backend SQLite, backend MySQL 8, frontend e E2E ficaram verdes; o E2E executou 26 testes e incluiu a validação de Clientes no mobile.
- O PDF de fechamento gerado pelo artefato visual permaneceu em uma única página A4, sem corte/overlap observado na renderização automática.

A comparação visual automatizada de layout está concluída para as referências recebidas. **Ainda permanecem externas** a validação com a `LOGO.png` cadastrada no ambiente real e a impressão física A4.
