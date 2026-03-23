# Backlog Tecnico de Acesso

## Objetivo

Transformar a matriz de acesso em um backlog tecnico executavel por fase e
fechar as decisoes de produto que impactam a implementacao de RBAC e escopo.

Este documento assume a matriz definida em `docs/access-matrix.md` e consolida
o baseline recomendado para seguir com a Fase 1.

## Decisoes Consolidadas

### 1. SAF operador pode editar escola?

Decisao:

- `Sim`, mas apenas com edicao limitada e somente dentro do proprio escopo.

Campos recomendados para operador:

- `schoolEmail`
- `schoolStatus`
- `cluster`
- `safOwner`
- `contactPhone`

Campos recomendados como exclusivos de admin:

- `externalSchoolId`
- `schoolName`
- `cnpj`
- `tradeName`
- `region`
- `city`
- `state`

Justificativa:

- evita que o operador altere identificadores e dados mestres com impacto em
  integracao, cadastro e auditoria
- preserva a agilidade operacional para ajustes do dia a dia
- reduz a chance de drift entre base interna e futuros sistemas conectados

Implicacao tecnica:

- a policy precisara ser por acao e, para `schools.update`, tambem por campo

### 2. Perfil leitura pode copiar textos gerados?

Decisao:

- `Sim`.

Escopo da permissao:

- o perfil leitura pode visualizar e copiar todos os textos gerados da area
  interna
- o perfil leitura nao pode atualizar status nem editar dados de escola

Justificativa:

- copiar nao e mutacao de estado
- a utilidade do perfil leitura fica baixa demais se ele puder apenas abrir a
  tela sem reaproveitar os textos operacionais
- essa permissao continua restrita ao ambiente interno

Implicacao tecnica:

- a UI de detalhe continua exibindo os blocos de copia para leitura
- a policy precisa separar `requests.read` de `requests.update_status`

### 3. Escola autenticada vera textos operacionais completos ou versao restrita?

Decisao:

- `Versao restrita`.

A escola autenticada deve ver:

- dados da propria solicitacao
- status atual
- historico basico
- uma mensagem school-facing especifica para a escola, quando aplicavel

A escola autenticada nao deve ver:

- `emailBody`
- `magentoDescription`
- `voucherCode`
- CPFs completos
- qualquer texto interno pensado para comercial, diretoria, atendimento interno
  ou operacao Magento

Justificativa:

- os textos atuais misturam linguagem interna e dados sensiveis
- `approvalMessage` e `magentoDescription` incluem CPFs e, em alguns casos,
  `voucherCode`
- a escola precisa de transparencia do fluxo, nao de todo o material
  operacional interno

Implicacao tecnica:

- nao reutilizar `generatedTexts` interno diretamente para escola
- criar uma projecao dedicada, por exemplo `schoolFacingTexts`
- mascarar CPF em qualquer payload school-facing
- expor voucher ou codigo apenas se existir necessidade de negocio explicita e
  em campo proprio

### 4. Qual regra final de escopo vamos adotar?

Decisao:

- `Associacao explicita usuario <-> escola` como fonte de verdade.

Diretriz:

- `safOwner` continua como metadado operacional
- `cluster` continua como classificacao de negocio
- autorizacao deve ler uma tabela de membership, nao inferir permissao a partir
  de campos editaveis da escola

Justificativa:

- e a opcao mais auditavel
- evita autorizacao derivada de dado operacional mutavel
- funciona para operadores com carteiras nao triviais
- suporta escola autenticada, leitura e operadores multi-escola sem
  sobrecarregar a modelagem

Implicacao tecnica:

- criar tabela de membership no schema
- filtrar leitura e mutacao por membership
- permitir bootstrap/importacao inicial de memberships a partir de `safOwner`,
  mas sem usar `safOwner` como policy final

## Baseline de Produto Para Implementacao

Com as decisoes acima, o baseline fica assim:

| Perfil | Solicitacoes | Status | Textos gerados | Escolas | Escopo |
| --- | --- | --- | --- | --- | --- |
| SAF admin | Le total | Atualiza total | Ve e copia todos | CRUD total | Global |
| SAF operador | Le | Atualiza | Ve e copia todos | Le + edita campos operacionais | Membership |
| SAF leitura | Le | Nao atualiza | Ve e copia todos | Le | Membership |
| Escola autenticada | Le as proprias | Nao atualiza | Ve apenas versao restrita | Le propria escola | Propria escola |

## Backlog Tecnico Por Fase

## Fase 0 - Contrato de Autorizacao

Objetivo:

- congelar o contrato tecnico antes de trocar a autenticacao e as APIs

Itens:

- definir codigos de erro de autorizacao:
  - `AUTH_REQUIRED`
  - `FORBIDDEN`
  - `OUT_OF_SCOPE`
- fechar nomes finais de roles:
  - `SAF_ADMIN`
  - `SAF_OPERADOR`
  - `SAF_LEITURA`
  - `ESCOLA`
- fechar a lista inicial de permissoes
- fechar a lista de campos editaveis por operador na entidade `School`
- documentar quais payloads sao internos e quais sao school-facing

Entregaveis:

- documento de decisao aprovado
- matriz final sem pendencias abertas

## Fase 1 - Roles Internos e Policies nas APIs

Objetivo:

- sair do usuario interno unico e introduzir roles internos reais com enforcement
  nas APIs

Escopo da fase:

- `SAF_ADMIN`
- `SAF_OPERADOR`
- `SAF_LEITURA`
- sem escopo por escola ainda
- sem autenticacao de escola ainda

Backlog:

### 1. Modelagem de identidade interna

- criar entidade `User` no Prisma
- adicionar `role` inicial ao usuario interno
- adicionar `isActive`
- adicionar campo de senha com hash
- manter bootstrap de admin inicial por seed
- opcional: manter fallback temporario por env apenas para migracao

### 2. Autenticacao

- trocar `authorize` do Auth.js para validar usuario interno no banco
- incluir `userId`, `role` e `isActive` no JWT/session
- bloquear login de usuario inativo
- ajustar seed para criar ao menos um admin inicial

### 3. Camada de policy

- criar helper central, por exemplo:
  - `requireSession()`
  - `requireRole()`
  - `assertCan()`
- mapear acoes internas:
  - `requests.read`
  - `requests.update_status`
  - `requests.copy_generated_texts`
  - `schools.read`
  - `schools.create`
  - `schools.update_operational`
  - `schools.update_admin`

### 4. Enforcement nas APIs

- proteger `GET /api/requests` com `requests.read`
- proteger `GET /api/requests/[id]` com `requests.read`
- proteger `PATCH /api/requests/[id]/status` com `requests.update_status`
- proteger `GET /api/schools` com `schools.read`
- proteger `POST /api/schools` com `schools.create`
- proteger `GET /api/schools/[id]` com `schools.read`
- proteger `PATCH /api/schools/[id]` com policy e filtro de campos

### 5. UI role-aware

- esconder ou desabilitar seletor de status para `SAF_LEITURA`
- esconder ou desabilitar criacao de escola para quem nao tiver
  `schools.create`
- separar visualmente campos de escola que so admin pode editar
- exibir feedback consistente quando a API responder `FORBIDDEN`

### 6. Testes minimos obrigatorios

- testes da camada de policy
- testes dos handlers de API para admin, operador e leitura
- cobertura minima para:
  - leitura sem mutacao
  - operador sem criar escola
  - admin com acesso completo

Criterios de aceite:

- um admin consegue usar tudo que o sistema atual oferece
- um operador nao consegue criar escola nem editar campos admin-only
- um perfil leitura nao consegue alterar status nem editar escola
- a interface nao depende apenas do frontend para seguranca

Dependencias:

- nenhuma dependencia de membership ainda

## Fase 2 - Escopo por Membership

Objetivo:

- limitar operador e leitura ao proprio conjunto de escolas e solicitacoes

Backlog:

### 1. Modelagem de escopo

- criar entidade `SchoolMembership`
- vincular `userId` e `schoolId`
- definir `roleScope` ou reutilizar o `role` global com membership por escola
- garantir unicidade por usuario/escola

### 2. Bootstrap de dados

- criar script para gerar memberships iniciais
- permitir importacao inicial a partir de `safOwner`
- revisar manualmente a carga antes de ativar o enforcement

### 3. Enforcement de escopo

- filtrar `listRequests()` por membership para operador e leitura
- filtrar `getRequestById()` por membership
- filtrar `listSchools()` por membership
- filtrar `getSchoolDetailsById()` por membership
- bloquear `PATCH` fora do escopo com `OUT_OF_SCOPE`

### 4. Observabilidade

- logar tentativas de acesso fora do escopo
- logar mutacoes aprovadas com `userId`, entidade e acao

### 5. Testes

- operador so ve escolas do proprio membership
- leitura so ve solicitacoes do proprio membership
- admin continua global
- acesso fora do escopo retorna erro consistente

Criterios de aceite:

- operador e leitura deixam de ter visao global
- o escopo nao depende de `safOwner` em runtime
- a mesma policy funciona para leitura de lista, detalhe e mutacao

## Fase 3 - Acompanhamento Publico por Protocolo

Objetivo:

- consolidar a jornada school-facing sem autenticacao, usando protocolo publico
  para consulta e mantendo o canal autenticado apenas para o SAF

Backlog:

### 1. Protocolo como identificador publico oficial

- consolidar `ticketNumber` como numero de atendimento / protocolo
- garantir que o protocolo esteja presente em toda solicitacao publica criada
- padronizar nomenclatura entre tela, e-mail e payload

### 2. Projecao publica dedicada

- criar ou endurecer DTO publico para acompanhamento por protocolo
- nao expor `generatedTexts` internos
- nao expor payload bruto de Magento / comercial / diretoria
- revisar se `voucherCode`, `campaignVoucherCode` e `decisionReason` entram
  integralmente, parcialmente ou ficam fora do canal publico
- mascarar qualquer dado sensivel remanescente

### 3. Rotas e APIs publicas

- manter `/acompanhar`
- manter `/acompanhar/detalhes`
- manter `/api/public/request-tracking`
- corrigir bugs de encoding e querystring na navegacao do acompanhamento
- garantir mensagens de erro consistentes para protocolo invalido ou nao
  encontrado

### 4. Comunicacao com a escola

- usar o protocolo como ancora das notificacoes externas
- manter e-mail de aprovacao e negativa com link direto para o acompanhamento
  publico
- opcionalmente criar confirmacao de abertura com protocolo gerado

### 5. Desativacao da frente autenticada da escola

- remover CTA de portal da escola da navegacao
- remover `/login/escola` e derivadas do fluxo publico
- remover `/minha-escola` e APIs associadas
- descontinuar role `SCHOOL` e fluxo `SchoolAccessToken` em cleanup controlado

### 6. Testes

- protocolo invalido retorna erro consistente
- protocolo inexistente nao vaza informacao extra
- payload publico nao expoe textos internos
- redirecionamentos e links de e-mail abrem o detalhe correto
- escola continua conseguindo acompanhar somente com protocolo valido

Criterios de aceite:

- a escola nao depende de login para acompanhar solicitacoes
- o protocolo vira o canal oficial de consulta externa
- nao existe superficie ativa de portal autenticado da escola
- o payload publico permanece restrito e coerente com o produto

## Fase 4 - Operacao e Administracao

Objetivo:

- tirar a gestao de usuarios e memberships do seed/script e colocar em fluxo
  administravel

Backlog:

- tela admin para criar usuario interno
- tela admin para ativar/desativar usuario
- tela admin para atribuir role
- tela admin para vincular memberships de escola
- auditoria de mudancas de status e escola
- trilha de quem alterou o que e quando
- nao incluir cadastro ou operacao de usuario autenticado de escola

Criterios de aceite:

- nao depender de migracao manual para operar acessos no dia a dia

## Sequencia Recomendada de Execucao

1. Implementar Fase 1 com roles globais internos
2. Introduzir membership na Fase 2
3. Consolidar acompanhamento publico por protocolo na Fase 3
4. Fechar operacao administrativa na Fase 4

## Riscos Tecnicos a Considerar

- trocar autenticacao baseada em env por banco exige migracao segura do login
- aplicar UI gating sem policy server-side nao resolve seguranca
- reaproveitar DTO interno diretamente no acompanhamento publico vai vazar dados
  sensiveis
- usar `safOwner` como regra de autorizacao final vai gerar drift de permissao

## Proximo Passo

Com o redirecionamento consolidado, o proximo passo de implementacao deve focar
na Fase 3:

- desativar a superficie de escola autenticada no runtime
- endurecer o acompanhamento publico por protocolo
- alinhar notificacoes e textos ao canal publico oficial
