# Vendas / PDV

A página Vendas usa o padrão das demais features: tipos e Zod compartilhados, service, repository, IPC/preload e API React. O carrinho fica no componente da aplicação, preservado entre páginas durante a sessão. Fechar o aplicativo descarta o rascunho. Cancelar pede confirmação e não grava uma venda no banco.

## Cálculo e finalização

Preços começam com o cadastro e podem ser editados. Valores são inteiros seguros em centavos; entradas em reais aceitam vírgula ou ponto e até duas casas decimais. Quantidades aceitam frações positivas.

- Bruto da linha: `Math.round(quantidade * preçoEmCentavos)`.
- Total da linha: bruto menos desconto da linha.
- Subtotal da venda: soma dos totais das linhas, após seus descontos.
- Total da venda: subtotal menos desconto adicional.
- Pagamentos positivos em dinheiro, Pix, débito ou crédito devem somar exatamente o total, sem troco. Total zero exige pagamentos vazios.

O backend recalcula os valores e captura o nome atual do produto. Verificações de caixa aberto, cliente ativo, produtos ativos e estoque acontecem dentro da mesma transação SQLite `immediate` que salva a venda, itens, pagamentos e movimentos de estoque. Produtos repetidos no payload têm a quantidade acumulada antes da validação do saldo. Pequenos resíduos binários de quantidades fracionárias são tratados proporcionalmente à precisão de ponto flutuante.

A venda é montada como `open` e passa a `paid` somente depois de todas as escritas. Erros lançados durante a operação causam rollback completo. O service converte o erro em resposta após esse rollback. Triggers impedem mudanças em vendas pagas e em seus itens/pagamentos, mesmo com caixa aberto. Não existe API para editar ou estornar vendas finalizadas nesta entrega.

O resumo do caixa continua derivado das vendas pagas e dos pagamentos em dinheiro, sem acumuladores adicionais. Uma falha ao atualizar a tela após a confirmação não é apresentada como falha da venda já salva.

## Banco e validação

A migração 0005 é aplicada pelo inicializador existente. Preserva itens e pagamentos, preenche nomes antigos com o nome atual do cadastro e inicializa descontos de itens antigos em zero. Não é possível reconstruir o nome original da venda antiga. Vendas sem vínculo com caixa fazem a migração falhar integralmente, sem atribuição artificial de caixa. Os triggers de caixa são recriados durante a migração.

Executar:

```sh
npm run typecheck
npm test
npm run build
npm run test:ui
```

O teste de interface usa o renderer compilado em uma janela oculta do Electron, perfil temporário e API simulada. Cobre navegação, cancelamento, respostas de busca fora de ordem, campos decimais, preço e descontos editados, cliente, pagamentos mistos, preservação do carrinho no erro, envio duplicado, falha de atualização após sucesso e caixa fechado. Salva uma captura em `/tmp/hardware-pdv.png` em Linux. Requer ambiente gráfico disponível.

Os testes de integração do service usam SQLite real em memória, com as migrações e triggers reais. Incluem falha forçada na baixa do segundo produto e conferência de rollback de todas as tabelas envolvidas. Os testes de migração cobrem banco vazio, dados anteriores e falha sem mudanças parciais.

## Recibo

Após a confirmação da venda, o PDV exibe um recibo com nome da loja, data/hora local, itens e nomes gravados, quantidades, preços unitários, descontos, totais e todas as formas de pagamento com seus valores. O nome acompanha `STORE_NAME`, usado também na navegação do aplicativo.

“Imprimir recibo” abre a impressão do sistema e imprime somente o recibo. “Ver último recibo” permite reabrir o recibo da última venda concluída durante a sessão, inclusive após navegar para outras telas. Esta etapa não inclui histórico de recibos nem recuperação após reiniciar o aplicativo.
