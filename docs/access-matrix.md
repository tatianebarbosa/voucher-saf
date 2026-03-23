# Matriz de Acesso

## Objetivo

Documentar:

- o modelo atual de acesso
- a matriz perfil x rota x acao
- a proposta futura de perfis
- as regras de escopo para evoluir de um acesso interno unico para RBAC simples

## Estado Atual

Hoje o sistema possui apenas dois niveis reais de acesso:

| Perfil | Autenticacao | Escopo | Observacao |
| --- | --- | --- | --- |
| Publico | Nao | Aberto | Pode abrir solicitacao e buscar escola no autocomplete |
| SAF interno | Sim | Total | Um unico usuario interno com acesso total ao painel, escolas e solicitacoes |

Nao existe hoje separacao entre `admin`, `operador` e `somente leitura`.

Tambem nao existe hoje um perfil autenticado de escola.

`requesterType` (`responsavel` ou `escola`) nao e perfil de acesso. Ele e apenas um atributo da solicitacao.

## Matriz Atual

### Rotas de pagina

| Rota | Publico | SAF interno | Acao atual |
| --- | --- | --- | --- |
| `/` | Sim | Sim | Redireciona para `/solicitacao` |
| `/solicitacao` | Sim | Sim | Abrir formulario publico |
| `/login` | Sim | Redireciona para `/painel-saf` se autenticado | Entrar na area interna |
| `/painel-saf` | Nao | Sim | Listar solicitacoes, filtrar, mudar status, abrir detalhe |
| `/solicitacoes/[id]` | Nao | Sim | Ver detalhe, copiar textos gerados, mudar status |
| `/escolas` | Nao | Sim | Listar escolas, filtrar, criar escola, editar escola |
| `/escolas/[id]` | Nao | Sim | Ver detalhe da escola e historico vinculado |

### Rotas de API

| Rota | Metodo | Publico | SAF interno | Acao atual |
| --- | --- | --- | --- | --- |
| `/api/public/schools` | `GET` | Sim | Sim | Buscar escolas para selecao publica |
| `/api/requests` | `POST` | Sim | Sim | Criar solicitacao |
| `/api/requests` | `GET` | Nao | Sim | Listar solicitacoes |
| `/api/requests/[id]` | `GET` | Nao | Sim | Ler solicitacao especifica |
| `/api/requests/[id]/status` | `PATCH` | Nao | Sim | Atualizar status da solicitacao |
| `/api/schools` | `GET` | Nao | Sim | Listar escolas |
| `/api/schools` | `POST` | Nao | Sim | Criar escola |
| `/api/schools/[id]` | `GET` | Nao | Sim | Ler detalhe da escola |
| `/api/schools/[id]` | `PATCH` | Nao | Sim | Atualizar escola |
| `/api/auth/[...nextauth]` | `GET/POST` | Sim | Sim | Login/logout/sessao Auth.js |

## Acoes Reais do Produto Hoje

### Publico

| Dominio | Acoes |
| --- | --- |
| Solicitacoes | Criar solicitacao |
| Escolas | Buscar escola para autocomplete |

### SAF interno

| Dominio | Acoes |
| --- | --- |
| Solicitacoes | Listar, filtrar, ver detalhe, atualizar status, copiar textos gerados |
| Escolas | Listar, buscar, criar, editar, ver detalhe e ver historico da escola |
| Sessao | Login e logout |

## Perfis Futuros Propostos

### 1. SAF admin

Perfil com visao global e poder administrativo.

Responsabilidades:

- ver todas as solicitacoes
- atualizar qualquer status
- ver e editar qualquer escola
- cadastrar escolas
- futuramente gerenciar usuarios, vinculos e permissoes

Escopo:

- todas as escolas
- todas as solicitacoes

### 2. SAF operador

Perfil operacional do dia a dia.

Responsabilidades:

- ver solicitacoes do seu escopo
- atualizar status
- abrir detalhe e copiar textos gerados
- consultar escolas do seu escopo
- opcionalmente editar dados operacionais da escola

Escopo sugerido:

- por `safOwner`
- ou por `cluster`
- ou por lista explicita de escolas vinculadas ao operador

Recomendacao:

- comecar por escopo via `safOwner` ou lista explicita de escolas
- evitar liberar CRUD global de escolas para operador

### 3. SAF leitura

Perfil de consulta.

Responsabilidades:

- ver solicitacoes do escopo permitido
- ver detalhe da solicitacao
- copiar textos gerados
- ver escolas e detalhe da escola

Nao pode:

- atualizar status
- criar escola
- editar escola

### 4. Publico com protocolo

Nao e um perfil autenticado. E a jornada externa da escola e do solicitante por
numero de atendimento / protocolo.

Responsabilidades:

- abrir solicitacao no formulario publico
- acompanhar status da solicitacao por protocolo
- consultar o retorno school-facing liberado para aquele protocolo

Escopo:

- apenas a solicitacao cujo protocolo foi informado

## Matriz Futura Proposta

### Paginas

Legenda:

- `V` = visualizar
- `C` = criar
- `E` = editar/atualizar
- `-` = sem acesso

| Rota | SAF admin | SAF operador | SAF leitura | Publico |
| --- | --- | --- | --- | --- |
| `/solicitacao` | C | C | V | C |
| `/acompanhar` | V | V | V | V |
| `/acompanhar/detalhes` | V | V | V | V por protocolo |
| `/login` | V | V | V | V |
| `/painel-saf` | V | V | V | - |
| `/solicitacoes/[id]` | V/E | V/E | V | - |
| `/escolas` | V/C/E | V e edicao limitada | V | - |
| `/escolas/[id]` | V/E | V e edicao limitada no escopo | V | - |

### APIs

| Rota | Metodo | SAF admin | SAF operador | SAF leitura | Publico |
| --- | --- | --- | --- | --- | --- |
| `/api/public/schools` | `GET` | Sim | Sim | Sim | Sim |
| `/api/requests` | `POST` | Sim | Sim | Nao | Sim |
| `/api/public/request-tracking` | `GET` | Sim | Sim | Sim | Sim por protocolo |
| `/api/requests` | `GET` | Todas | Escopo | Escopo | Nao |
| `/api/requests/[id]` | `GET` | Todas | Escopo | Escopo | Nao |
| `/api/requests/[id]/status` | `PATCH` | Sim | Sim no escopo | Nao | Nao |
| `/api/schools` | `GET` | Todas | Escopo | Escopo | Nao |
| `/api/schools` | `POST` | Sim | Nao | Nao | Nao |
| `/api/schools/[id]` | `GET` | Todas | Escopo | Escopo | Nao |
| `/api/schools/[id]` | `PATCH` | Sim | Limitado e no escopo | Nao | Nao |

## Regras de Escopo Recomendadas

### SAF admin

- acesso global
- ignora filtros de ownership

### SAF operador

- acesso apenas a solicitacoes e escolas do proprio escopo
- o escopo deve ser resolvido por uma regra unica e auditavel

Opcoes de escopo:

1. por `safOwner`
2. por `cluster`
3. por associacao explicita `usuario <-> escola`

Recomendacao:

- usar associacao explicita `usuario <-> escola` quando houver variacao operacional real
- usar `safOwner` apenas como atalho inicial

### SAF leitura

- mesmo escopo do operador
- sem mutacoes

### Publico com protocolo

- acesso apenas ao retorno liberado para o protocolo informado
- nunca deve consultar listagens globais
- nao deve depender de sessao
- nao deve expor dados internos, CPFs completos ou payload operacional bruto

## Estrutura de Permissoes Recomendada

Mesmo com poucos perfis, vale separar `role` de `permission`.

Permissoes sugeridas:

- `requests.create`
- `requests.read.all`
- `requests.read.scoped`
- `requests.read.by_protocol`
- `requests.update_status.all`
- `requests.update_status.scoped`
- `requests.copy_generated_texts`
- `schools.read.all`
- `schools.read.scoped`
- `schools.create`
- `schools.update.all`
- `schools.update.scoped`
- `admin.access`
- `users.manage`

Mapeamento inicial:

| Perfil | Permissoes base |
| --- | --- |
| SAF admin | Todas |
| SAF operador | `requests.create`, `requests.read.scoped`, `requests.update_status.scoped`, `requests.copy_generated_texts`, `schools.read.scoped`, `schools.update.scoped` |
| SAF leitura | `requests.read.scoped`, `requests.copy_generated_texts`, `schools.read.scoped` |
| Publico | `requests.create`, `requests.read.by_protocol` |

## Modelo de Dados Futuro Recomendado

Para sustentar essa matriz, o schema vai precisar de identidade e vinculo.

Entidades sugeridas:

- `User`
- `Role`
- `UserRole`
- `SchoolMembership`

Campos minimos sugeridos:

- `User.id`
- `User.email`
- `User.name`
- `User.isActive`
- `Role.code`
- `SchoolMembership.userId`
- `SchoolMembership.schoolId`
- `SchoolMembership.scopeType`

Escopos uteis:

- `GLOBAL`
- `SCHOOL`
- `CLUSTER`
- `SAF_OWNER`

## Ordem Recomendada de Implementacao

### Fase 1

- introduzir `role` no usuario interno
- separar `SAF_ADMIN`, `SAF_OPERADOR`, `SAF_LEITURA`
- manter escola ainda sem autenticacao
- aplicar policy nas APIs internas existentes

### Fase 2

- adicionar vinculo de escopo para operador e leitura
- filtrar `/api/requests` e `/api/schools` por escopo
- bloquear mutacoes fora do escopo

### Fase 3

- introduzir `escola autenticada`
- criar rotas dedicadas `my-school` e `my-requests`
- manter `/solicitacao` publico como fallback ou migrar gradualmente para autenticado

## Decisoes Consolidadas

As decisoes abertas foram consolidadas no baseline de rollout:

1. `SAF operador` pode editar escola, mas apenas campos operacionais e dentro do proprio escopo.
2. `SAF leitura` pode visualizar e copiar os textos gerados internos, sem poder mutar status ou cadastro.
3. `Escola autenticada` deve receber payload e textos school-facing restritos, nunca o pacote operacional interno completo.
4. A regra final de escopo deve ser associacao explicita `usuario <-> escola`, sem usar `safOwner` como policy final.

O detalhamento tecnico dessas decisoes e o backlog por fase estao em
`docs/access-backlog.md`.

## Fonte do Mapeamento

Esse documento foi derivado das rotas e guards atuais:

- `auth.ts`
- `auth.config.ts`
- `proxy.ts`
- `src/lib/server/auth-guard.ts`
- `src/app/api/requests/*`
- `src/app/api/schools/*`
- `src/app/api/public/schools/route.ts`
- `src/app/solicitacao/page.tsx`
- `src/app/painel-saf/page.tsx`
- `src/app/solicitacoes/[id]/page.tsx`
- `src/app/escolas/page.tsx`
- `src/app/escolas/[id]/page.tsx`
