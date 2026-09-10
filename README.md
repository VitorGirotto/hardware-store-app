# Hardware Store

## Descrição do projeto

Aplicativo desktop para gestão de uma loja de ferragens, desenvolvido com Electron e React. Reúne cadastros, ponto de venda (PDV), caixa, estoque, relatórios e backups em uma interface em português. Os dados ficam armazenados localmente em SQLite, permitindo realizar as operações da loja sem depender de um servidor externo.

## Objetivo

Simplificar a rotina de uma pequena loja de ferragens, centralizando vendas e cadastros, automatizando a baixa de estoque e facilitando a conferência do caixa e o acompanhamento dos resultados.

## Stack usada

| Tecnologia | Uso no projeto |
| --- | --- |
| Electron | Aplicação desktop e integração com o sistema operacional |
| React | Interface e componentes das telas |
| TypeScript | Tipagem do código e dos contratos entre os processos |
| Vite e electron-vite | Ambiente de desenvolvimento e compilação |
| Tailwind CSS | Estilização da interface |
| SQLite e better-sqlite3 | Banco de dados local |
| Drizzle ORM e Drizzle Kit | Consultas, schema e migrações do banco |
| Zod | Validação dos dados de entrada |
| Vitest | Testes automatizados |
| Electron Builder | Empacotamento e geração de artefatos de distribuição |
| npm | Gerenciamento de dependências e execução de scripts |

A interface se comunica com o processo principal pelo preload e por IPC. As regras de negócio e o acesso ao banco ficam no processo principal.

## Funcionalidades do MVP

- **Produtos:** cadastro, consulta, edição e controle de status, preços, unidades e estoque mínimo.
- **Clientes:** cadastro, consulta, edição e controle de status.
- **Caixa:** abertura com saldo inicial, resumo da operação, fechamento com conferência de valores e histórico.
- **Vendas / PDV:** busca de produtos, carrinho, quantidades fracionárias, alteração de preço, descontos por item e por venda e associação opcional de cliente. A finalização exige caixa aberto.
- **Pagamentos:** registro em dinheiro, Pix, débito e crédito, incluindo pagamentos mistos e cálculo de troco em dinheiro. O registro não processa transações em bancos ou operadoras.
- **Recibo:** exibição e impressão após a venda, com acesso ao último recibo durante a sessão.
- **Estoque:** baixa automática ao concluir vendas, ajustes manuais, histórico de movimentações e consulta de produtos no estoque mínimo ou abaixo dele.
- **Relatórios:** vendas por período e forma de pagamento, produtos mais vendidos, estoque baixo e caixas.
- **Backup manual:** escolha de pasta, cópia do banco SQLite e configuração do prazo do lembrete.
- **Dashboard:** situação do caixa, total vendido e aviso de backup pendente ou atrasado.

Detalhes dos módulos: [Vendas / PDV](docs/sales.md), [Relatórios](docs/reports.md) e [Backups](docs/backups.md).

## Funcionalidades futuras

Possíveis evoluções, ainda não implementadas e sujeitas à definição de prioridades:

- Restauração de backups pela interface e agendamento de cópias automáticas.
- Exportação e impressão de relatórios.
- Histórico de vendas com consulta e reimpressão de recibos após reiniciar o aplicativo.
- Estorno de vendas e devoluções com ajuste de estoque e caixa.
- Cadastro de fornecedores e gestão de compras e reposição de estoque.
- Usuários com permissões de acesso e identificação do operador.
- Integração com emissão fiscal e serviços de pagamento.

## Como rodar em desenvolvimento

### Pré-requisitos

- Node.js 22.12 ou superior e npm, compatíveis com os requisitos das dependências presentes no projeto.
- Ambiente gráfico para abrir a janela do Electron.
- Terminal com suporte à sintaxe de variáveis de ambiente POSIX usada nos scripts (Linux/macOS). No Windows, os scripts precisam de adaptação para o shell utilizado.

### Instalação e execução

Na pasta do projeto:

```sh
npm install
npm run dev
```

O `postinstall` executa `electron-builder install-app-deps` para preparar as dependências nativas para o Electron. O comando `dev` inicia o ambiente de desenvolvimento e abre a janela do aplicativo.

O banco é criado em `database/development/hardware-store.db`, e as migrações de `drizzle/` são aplicadas automaticamente ao iniciar. Não é necessário configurar um servidor de banco ou criar um arquivo `.env` para esse fluxo.

### Banco de dados

Os scripts definem `HARDWARE_STORE_DB_ENV` e `HARDWARE_STORE_DB_PATH` para selecionar o ambiente e o caminho do banco.

| Execução | Banco utilizado |
| --- | --- |
| `npm run dev` | `database/development/hardware-store.db` |
| `npm start` | `database/production/hardware-store.db` |
| `npm test` | SQLite em memória (`:memory:`) |
| Aplicativo empacotado, sem caminho definido por variável de ambiente | `database/hardware-store.db` dentro de `app.getPath('userData')` |

Comandos auxiliares:

```sh
# Gerar migrações após alterar src/main/db/schema.ts
npm run db:generate

# Aplicar migrações manualmente no banco de desenvolvimento
npm run db:migrate

# Inspecionar o banco de desenvolvimento com Drizzle Studio
npm run db:studio
```

Também existem `npm run db:migrate:test` e `npm run db:migrate:prod`, que atualizam os arquivos em `database/test/` e `database/production/`, respectivamente. O comando de produção aponta para o banco local de preview, não para o banco do aplicativo instalado.

### Verificações

```sh
npm run typecheck
npm test
```

Os testes de interface exigem ambiente gráfico e uma build prévia:

```sh
npm run build
npm run test:ui
npm run test:ui:reports
npm run test:ui:backups
```

## Como gerar build

Para verificar os tipos e compilar os processos principal, preload e interface:

```sh
npm run build
```

Os arquivos compilados são gerados em `out/`. Para abrir essa build localmente:

```sh
npm start
```

Esse comando utiliza o banco de produção local indicado na tabela acima.

Para compilar e empacotar o aplicativo com Electron Builder:

```sh
npm run dist
```

Os artefatos de distribuição são gerados em `release/`, conforme a plataforma e a configuração do Electron Builder. As migrações são incluídas no pacote para aplicação automática na inicialização.

## Estrutura de pastas

```text
hardware-store-app/
├── assets/                     # Recursos estáticos do projeto
├── database/                   # Bancos SQLite locais por ambiente
├── docs/                       # Documentação de vendas, relatórios e backups
├── drizzle/                    # Migrações SQL e metadados do Drizzle
├── scripts/                    # Scripts de testes de interface com Electron
├── src/
│   ├── main/                   # Processo principal do Electron
│   │   ├── db/                 # Configuração, schema e inicialização do banco
│   │   ├── ipc/                # Handlers de comunicação com a interface
│   │   ├── repositories/       # Consultas e persistência de dados
│   │   ├── services/           # Regras de negócio
│   │   └── main.ts             # Inicialização do aplicativo e da janela
│   ├── preload/                # API exposta à interface via contextBridge
│   ├── renderer/               # Interface React e HTML de entrada
│   │   └── src/
│   │       ├── features/       # Componentes e APIs organizados por módulo
│   │       ├── pages/          # Telas do aplicativo
│   │       ├── main.tsx        # Entrada da aplicação React
│   │       └── styles.css      # Estilos globais
│   └── shared/                 # Código compartilhado entre os processos
│       ├── constants/          # Constantes dos módulos
│       ├── schemas/            # Schemas de validação Zod
│       ├── types/              # Tipos e contratos
│       └── utils/              # Funções auxiliares
├── out/                        # Código compilado (gerado pelo build)
├── release/                    # Artefatos de distribuição (gerados pelo dist)
├── drizzle.config.ts           # Configuração do Drizzle Kit
├── electron.vite.config.ts     # Configuração da compilação e desenvolvimento
├── package.json                # Dependências, scripts e empacotamento
├── tsconfig.json               # Configuração do TypeScript
└── vitest.config.ts            # Configuração dos testes
```

Os testes `*.test.ts` ficam próximos ao código que verificam, dentro de `src/`.
