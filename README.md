# Voucher Excecao SAF

Aplicacao em `Next.js + TypeScript + Tailwind CSS` para registrar solicitacoes
de voucher de excecao pela escola e operar o fluxo interno do SAF com painel,
detalhe protegido, textos gerados automaticamente e persistencia via Prisma.

## Visao geral

O sistema possui duas frentes:

- area publica para a escola registrar uma solicitacao
- area interna do SAF para consultar solicitacoes, atualizar status e copiar os
  textos operacionais gerados

Os textos de e-mail, aprovacao, Magento e codigo de voucher continuam sendo
gerados dinamicamente a partir dos dados salvos. Eles nao sao persistidos no
banco.

## Funcionalidades atuais

- formulario publico validado para desconto e parcelamento
- persistencia real com Prisma
- banco SQLite para desenvolvimento local
- API interna em App Router
- autenticacao simples com Auth.js usando credenciais via variaveis de ambiente
- painel SAF protegido com busca, filtros e atualizacao de status
- tela de detalhe protegida com resumo, blocos de copia e acoes rapidas
- seed inicial com dados de exemplo
- catalogo interno de escolas/franquias persistido no banco
- importacao inicial da base de escolas via CSV ou Excel
- fundacao interna de vouchers/campanhas preparada no banco e em APIs protegidas
- tratamento de estados de loading, erro e vazio

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite para desenvolvimento local
- Auth.js (`next-auth` v5 beta) para autenticacao da V1

## Variaveis de ambiente

Crie um arquivo `.env` local a partir de `.env.example`.

Obrigatorias em desenvolvimento e producao:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret-with-32-plus-characters"
SAF_ADMIN_EMAIL="admin@saf.local"
SAF_ADMIN_PASSWORD="change-me-please"
MAIL_PROVIDER="smtp"
MAIL_FROM_NAME="Voucher Maple Bear"
MAIL_FROM_EMAIL="no-reply@maplebear.local"
SMTP_HOST="smtp.exemplo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="usuario-smtp"
SMTP_PASSWORD="senha-smtp"
APP_PUBLIC_URL="http://localhost:3000"
```

Descricao:

- `DATABASE_URL`: conexao do Prisma. Em desenvolvimento local usa SQLite.
- `AUTH_SECRET`: segredo usado para assinar a sessao do Auth.js.
- `SAF_ADMIN_EMAIL`: e-mail autorizado para a area interna.
- `SAF_ADMIN_PASSWORD`: senha inicial do acesso SAF.
- `MAIL_PROVIDER`: provedor de envio. Nesta etapa, use `smtp` para envio real.
- `MAIL_FROM_NAME`: nome exibido no remetente dos e-mails.
- `MAIL_FROM_EMAIL`: e-mail remetente usado pelo mailer.
- `SMTP_HOST`: host SMTP.
- `SMTP_PORT`: porta SMTP.
- `SMTP_SECURE`: `true` para SMTPS/465 e `false` para STARTTLS/587.
- `SMTP_USER`: usuario SMTP.
- `SMTP_PASSWORD`: senha SMTP.
- `APP_PUBLIC_URL`: base publica para montar links de acompanhamento.

Observacoes:

- `AUTH_SECRET` deve ser forte e unico em producao.
- Em Vercel, configure todas essas variaveis no projeto.
- Para producao real, troque `DATABASE_URL` para Postgres gerenciado e altere o
  provider do Prisma de `sqlite` para `postgresql`.

## Instalacao

```bash
npm install
```

## Scripts uteis

- `npm run dev`: sobe o ambiente local
- `npm run build`: gera o build de producao
- `npm run start`: inicia a aplicacao compilada
- `npm run lint`: valida o codigo com ESLint
- `npm run db:generate`: gera o client do Prisma
- `npm run db:migrate:dev`: cria/aplica migracoes locais durante evolucao de schema
- `npm run db:migrate`: aplica migracoes versionadas existentes
- `npm run db:seed`: popula o banco com dados de exemplo
- `npm run notifications:process -- --limit <n>`: processa eventos pendentes de notificacao por e-mail
- `npm run db:import:schools -- <arquivo>`: importa escolas/franquias via CSV, XLSX ou XLS
- `npm run db:import:vouchers -- <arquivo>`: importa vouchers/campanhas via CSV, XLSX ou XLS
- `npm run db:create:internal-user -- --email <email> --password <senha> --role <admin|operador|viewer>`: cria ou atualiza um acesso interno da Central/SAF
- `npm run db:studio`: abre o Prisma Studio

## Ordem recomendada para rodar localmente

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Se voce estiver alterando o schema localmente:

```bash
npm run db:migrate:dev
npm run db:seed
```

## Importacao inicial de escolas e franquias

O catalogo interno de escolas/franquias fica na tabela `School` do Prisma.
Nesta etapa, ele ainda nao altera o formulario publico, o painel SAF atual ou a
geracao dos textos operacionais.

Campos persistidos:

- obrigatorios: `id`, `schoolName`, `createdAt`, `updatedAt`
- principais: `externalSchoolId`, `schoolEmail`, `schoolStatus`, `cluster`, `safOwner`, `city`, `state`, `cnpj`
- opcionais: `tradeName`, `region`, `contactPhone`

Regras:

- `externalSchoolId` e unico quando informado
- `schoolName` e obrigatorio

Formatos aceitos pelo importador:

- `.csv`
- `.xlsx`
- `.xls`

Comando:

```bash
npm run db:import:schools -- ./caminho/para/base-escolas.xlsx
```

Mapeamento esperado da planilha:

- `ID da Escola` -> `externalSchoolId`
- `Nome da Escola` -> `schoolName`
- `E-mail da Escola` -> `schoolEmail`
- `Status da Escola` -> `schoolStatus`
- `Cluster` -> `cluster`
- `Carteira SAF` -> `safOwner`
- `Cidade da Escola` -> `city`
- `Estado da Escola` -> `state`
- `CNPJ` -> `cnpj`

Colunas opcionais reconhecidas, se existirem:

- `Nome Fantasia` -> `tradeName`
- `Regiao` -> `region`
- `Telefone` ou `Telefone da Escola` -> `contactPhone`

Comportamento do script:

- usa a primeira aba do arquivo Excel
- ignora linhas totalmente vazias
- ignora linhas invalidas e mostra os motivos no resumo final
- cria novas escolas quando nao encontra registro correspondente
- atualiza escolas existentes quando encontra `externalSchoolId`, `cnpj` ou `schoolName`
- normaliza `schoolEmail` para minusculas, `state` para maiusculas e `cnpj` para apenas digitos

Fluxo recomendado para carga inicial:

```bash
npm run db:migrate
npm run db:import:schools -- ./caminho/para/base-escolas.xlsx
```

## Fundacao interna de vouchers e campanhas

O modulo interno de vouchers/campanhas foi preparado para evoluir sem alterar o
fluxo atual de excecoes.

Estrutura criada nesta etapa:

- tabela `SchoolVoucher` no Prisma
- relacao opcional com `School` via `schoolId`
- rastreabilidade preservada com `schoolExternalId` e `schoolName`
- camada server-side dedicada em `src/lib/server/vouchers.ts`
- APIs internas protegidas:
  - `GET /api/vouchers`
  - `POST /api/vouchers`
  - `GET /api/vouchers/[id]`
  - `PATCH /api/vouchers/[id]`

Tipos preparados:

- `voucherType`: `campanha` ou `outro`
- `status`: `rascunho`, `ativo`, `enviado`, `esgotado`, `expirado`, `cancelado`

Preparacao para importacao futura:

- pasta operacional prevista: `/imports`
- formato preferencial: `.csv` em UTF-8
- exemplos esperados:
  - `imports/vouchers-2026.csv`
  - `imports/voucher-campanha.csv`
  - `imports/excecoes.csv`

Nesta etapa, ainda nao existe importador completo nem UI final para esse modulo.

## Importacao manual de vouchers e campanhas

Nesta etapa, a carga operacional de vouchers/campanhas passa a ser feita por
arquivo exportado para a pasta `/imports`, com foco principal em `.csv` UTF-8.

Arquivo base validado nesta etapa:

- `imports/VoucherdeCampanha2026.csv`

Comando:

```bash
npm run db:import:vouchers -- imports/VoucherdeCampanha2026.csv
```

Formatos aceitos pelo importador:

- `.csv`
- `.xlsx`
- `.xls`

Mapeamento preparado para a planilha real e para variacoes proximas:

- `id da escola` ou `id_escola` -> `schoolExternalId`
- `escola`, `nome da escola`, `nome` ou `unidade` -> `schoolName`
- `tipo do voucher` -> `voucherType`
- `campanha` -> `campaignName`
- `codigo do voucher` -> `voucherCode`
- `quantidade disponibilizada` ou `qtd. vouchers` -> `quantityAvailable`
- `quantidade enviada` -> `quantitySent`
- `email de envio` -> `sentToEmail`
- `data de envio` -> `sentAt`
- `validade` -> `expiresAt`
- `status` -> `status`
- `observacao` ou `observacoes` -> `notes`

Comportamento atual do importador:

- usa o nome do arquivo como `campaignName` quando a coluna de campanha nao existir
- usa `voucherType = campanha` como default quando a coluna estiver ausente
- tenta vincular primeiro por `schoolExternalId` e depois por `schoolName`
- mantem o voucher mesmo sem vinculo com `School`, preservando snapshot da escola
- usa chave composta simples para idempotencia:
  - `schoolExternalId` ou `schoolName`
  - `campaignName`
  - `voucherCode`
  - `sentToEmail`
  - `sentAt`
- reimportacoes atualizam o registro correspondente quando a chave bate
- mostra resumo com lidos, criados, atualizados, ignorados e avisos

Observacoes especificas do CSV `VoucherdeCampanha2026.csv`:

- a coluna de campanha nao existe; o importador deriva `Voucher de Campanha 2026`
- a coluna de e-mail de envio nao existe; `sentToEmail` fica vazio
- a coluna de data de envio nao existe; `sentAt` fica vazio
- a coluna de validade nao existe; `expiresAt` fica vazio
- `Voucher enviado = SIM` passa a gerar `status = enviado`
- `Direito a voucher = Nao` sem envio vira `status = cancelado`

## Banco e Prisma

O projeto esta preparado para manter a camada de acesso desacoplada do banco:

- o datasource atual usa SQLite para desenvolvimento local
- a camada server-side concentra o acesso em `src/lib/server/db.ts` e
  `src/lib/server/requests.ts`
- a base interna de escolas/franquias foi preparada na tabela `School`
- a futura migracao para Postgres deve exigir principalmente:
  - troca do provider em `prisma/schema.prisma`
  - nova `DATABASE_URL`
  - migracoes adequadas para o novo ambiente

SQLite atende bem a fase inicial e ao fluxo local. Para deploy real em
producao, o caminho recomendado e Postgres.

## Autenticacao do SAF

Login da area interna:

- rota: `/login`
- credenciais: `SAF_ADMIN_EMAIL` e `SAF_ADMIN_PASSWORD`
- logout disponivel no header

Perfis internos atuais:

- `SAF_ADMIN`: acesso completo para o time SAF
- `SAF_OPERADOR`: operacao interna com leitura e edicao operacional
- `SAF_LEITURA`: perfil `viewer` da Central, com consulta ampla e sem escrita

Permissoes esperadas:

- `SAF_ADMIN`: pode criar, editar, importar e alterar status
- `SAF_OPERADOR`: pode operar as areas internas, sem campos administrativos de escola
- `SAF_LEITURA` (`viewer`): pode consultar painel, escolas, detalhe da escola, historicos, vouchers e trilha operacional, sem criar, editar, importar ou alterar status

Provisionamento de um acesso interno:

```bash
npm run db:create:internal-user -- --email viewer@central.local --password senha-segura --role viewer
```

Roles aceitas no script:

- `admin`
- `operador`
- `viewer`

Rotas publicas:

- `/solicitacao`
- `POST /api/requests`

Rotas protegidas:

- `/painel-saf`
- `/solicitacoes/[id]`
- `GET /api/requests`
- `GET /api/requests/[id]`
- `PATCH /api/requests/[id]/status`

Se a sessao expirar, o provider e as APIs internas retornam mensagens amigaveis
orientando novo login.

## Acompanhamento publico

O retorno para a escola acontece exclusivamente pela area publica:

- rota: `/acompanhar`
- detalhe: `/acompanhar/detalhes?ticket=<protocolo>`

A escola informa o numero de atendimento/protocolo gerado na abertura da
solicitacao e consulta:

- status atual
- condicao analisada
- mensagem school-facing liberada para aquele protocolo

Nao existe mais portal autenticado da escola nem fluxo de login da unidade.

## Build e validacao

```bash
npm run lint
npm run build
```

## Notificacoes por e-mail

A fila persistida `NotificationEvent` passa a suportar envio real de e-mail
nesta etapa.

Escopo inicial de envio:

- `request_approved`
- `voucher_available`
- `campaign_available`

Observacao importante:

- `request_rejected` ainda nao dispara e-mail porque o fluxo atual de
  solicitacao nao possui um status explicito de reprovacao.

Processamento da fila:

- formato atual: runner manual por script
- comando:

```bash
npm run notifications:process -- --limit 20
```

Comportamento atual:

- processa apenas eventos `pending`
- envia somente eventos do canal `email`
- atualiza `status`, `processedAt`, `attemptCount`, `lastError` e
  `providerMessageId`
- nao reenfileira automaticamente eventos `failed`
- eventos sem `recipientEmail` ficam `suppressed`
- eventos sem template configurado tambem ficam `suppressed`

Templates iniciais:

- solicitacao aprovada: orienta a escola a acompanhar o ticket por link publico
- voucher disponibilizado: orienta a escola a falar com o SAF para uso do saldo
- campanha disponibilizada: orienta a escola a falar com o SAF para uso da campanha

Limitacoes desta etapa:

- sem job automatico ou cron
- sem integracao com WhatsApp
- sem retries automaticos de eventos `failed`
- sem central de monitoramento da fila na UI

## Deploy na Vercel

Pontos de atencao:

- configurar todas as variaveis de ambiente do `.env.example`
- garantir `AUTH_SECRET` forte em producao
- SQLite nao e o banco ideal para producao na Vercel
- o deploy inicial pode continuar localmente com SQLite, mas o ambiente real
  deve migrar para Postgres gerenciado
- revisar migracoes antes de apontar `DATABASE_URL` para producao
- o `postinstall` ja executa `prisma generate`, o que ajuda no build da Vercel

Recomendacao para producao real:

1. trocar o provider do Prisma para `postgresql`
2. apontar `DATABASE_URL` para um Postgres gerenciado
3. aplicar migracoes no ambiente alvo
4. configurar as credenciais SAF ou substituir a autenticacao simples por um
   provedor corporativo

## Estrutura relevante

- `src/app/solicitacao`: pagina publica
- `src/app/painel-saf`: painel interno protegido
- `src/app/solicitacoes/[id]`: detalhe protegido
- `src/app/api/requests`: API publica e interna
- `src/lib/server`: banco, auth guard, respostas de API e acesso a dados
- `prisma`: schema, migracoes e seed
- `scripts/import-schools.ts`: importacao operacional da base inicial de escolas

## Observacoes finais

- os dados sensiveis de autenticacao ficam apenas no servidor
- o fluxo publico nao expoe leitura de solicitacoes
- os textos gerados seguem dinamicos para evitar duplicacao de dados
- a autenticacao atual e simples e adequada para V1, mas a estrutura ja esta
  preparada para evoluir depois para autenticacao corporativa
