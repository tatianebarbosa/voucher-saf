# Impacto do Recentramento para Fluxo Publico + SAF Interno

## Decisao

O produto deixa de seguir com autenticacao de escola e portal autenticado da
unidade.

O baseline passa a ter apenas dois blocos:

- acesso publico para abrir solicitacao
- acesso publico para acompanhar solicitacao por numero de atendimento /
  protocolo
- acesso interno SAF para operacao e tratamento

## O que deve ser mantido

### 1. Jornada publica de abertura

Manter como superficie principal para a escola:

- `/solicitacao`
- `POST /api/requests`
- `GET /api/public/schools`

Esses pontos ja representam o canal correto de entrada da demanda.

### 2. Jornada publica de acompanhamento por protocolo

Manter e promover para fluxo oficial school-facing:

- `/acompanhar`
- `/acompanhar/detalhes`
- `GET /api/public/request-tracking`
- `getPublicRequestTrackingByTicketNumber()` em
  `src/lib/server/requests.ts`
- `PublicRequestTracking` em
  `src/components/requests/public-request-tracking.tsx`
- `PublicRequestTrackingDetails` em
  `src/components/requests/public-request-tracking-details.tsx`

Esse conjunto ja existe e e o melhor candidato para substituir o portal da
escola.

### 3. Bloco interno SAF

Manter integralmente:

- login interno
- roles internos `SAF_ADMIN`, `SAF_OPERADOR`, `SAF_LEITURA`
- membership `usuario <-> escola` para escopo interno
- policy central nas APIs internas
- painel, escolas, solicitacoes e vouchers para operacao SAF

O recorte de escola autenticada nao altera a decisao de RBAC interno nem a
Fase 1/Fase 2 ja implementadas.

### 4. Infra de notificacao

Manter:

- `NotificationEvent`
- fila de notificacoes
- mailer / SMTP
- templates de aprovacao e negativa que ja apontam para
  `/acompanhar/detalhes?ticket=...`

Essa infraestrutura continua valida e passa a servir o fluxo publico como canal
principal de retorno.

## O que deve ser removido ou desativado

### 1. Superficie de autenticacao da escola

Desativar e depois remover:

- `/login/escola`
- `/login/escola/primeiro-acesso`
- `/login/escola/ativar`
- `/login/escola/esqueci-senha`
- `/login/escola/redefinir-senha`
- `/minha-escola`
- `/minha-escola/solicitacoes/[id]`

Arquivos diretamente impactados:

- `src/app/login/escola/**`
- `src/app/minha-escola/**`
- `src/components/auth/school-access-shell.tsx`
- `src/components/auth/school-email-access-form.tsx`
- `src/components/auth/school-password-access-form.tsx`
- partes da variante `school` em `src/components/auth/login-form.tsx`
- itens de navegacao da escola em `src/components/layout/site-header.tsx`

### 2. APIs e servicos do portal autenticado

Desativar e depois remover:

- `/api/school-portal/overview`
- `/api/school-portal/requests/[id]`
- `src/lib/server/school-portal.ts`
- `requireSchoolSession()` em `src/lib/server/auth-guard.ts`
- tipos em `src/types/school-portal.ts`
- componentes em `src/components/school-portal/**`

### 3. Modelo e fluxo de acesso da escola

Descontinuar:

- role `SCHOOL`
- `SchoolAccessToken`
- `src/lib/server/school-access.ts`
- `src/lib/server/school-access-actions.ts`
- `scripts/create-school-user.ts`
- templates `school_access_invitation` e `school_password_reset`
- eventos de auditoria e notificacao exclusivos dessa jornada

Impacto no Prisma e no dominio:

- `UserRole.SCHOOL` deixa de ser role de produto
- `SchoolAccessToken` deixa de ser entidade necessaria
- enums de auditoria/notificacao ligados a convite/reset da escola deixam de ter
  uso

Observacao:

- como isso ja foi migrado no banco, a recomendacao e fazer em duas etapas:
  1. desativar uso em runtime
  2. remover schema/migrations em cleanup controlado

### 4. Documentacao e comunicacao antigas

Atualizar ou arquivar referencias a portal autenticado em:

- `docs/access-backlog.md`
- `docs/access-matrix.md`
- `docs/school-access-flow.md`
- `README.md`

## O que pode ser reaproveitado no fluxo publico por protocolo

### 1. Projecao school-facing segura

O trabalho feito para o portal autenticado nao deve ser mantido como portal,
mas pode ser reaproveitado como criterio de exposicao publica.

Reaproveitar conceitos de `src/lib/server/school-portal.ts`:

- `schoolFacingMessage`
- `outcomeLabel`
- `conditionLabel`
- `validityLabel`
- regra de nao expor payload interno bruto

Diretriz:

- o acompanhamento publico deve usar um DTO publico dedicado, nao o DTO interno
  e nao o DTO do antigo portal

### 2. Templates de notificacao baseados em protocolo

Ja estao aderentes ao novo direcionamento:

- `request_approved`
- `request_rejected`

Eles podem continuar apontando para a consulta publica com protocolo
preenchido.

### 3. Infra de piloto operacional

O trabalho de validacao de SMTP, fila e processamento controlado continua
util.

Ele nao depende de autenticacao da escola e pode ser reutilizado para:

- e-mail de confirmacao com protocolo
- e-mails de atualizacao de status
- comunicacoes futuras do SAF para a escola

## Impacto no backlog

### Fase 1 e Fase 2

Permanecem validas:

- Fase 1: roles internos + policies
- Fase 2: escopo interno por membership

Nao precisam ser revertidas.

### Fase 3

Deve deixar de ser `Escola Autenticada` e passar a ser
`Acompanhamento Publico por Protocolo`.

Novo foco:

- consolidar `ticketNumber` como protocolo school-facing
- endurecer o payload publico de acompanhamento
- garantir experiencia simples de busca por protocolo
- reforcar notificacoes com link publico
- remover pontos expostos de login/portal da escola

### Fase 4

Pode seguir como operacao e administracao interna.

Nao deve mais incluir gestao de usuarios de escola.

## Ajustes prioritarios no codigo antes da limpeza

### 1. Corrigir a rota publica de acompanhamento

Hoje existem sinais de bug de encoding nos redirecionamentos e links:

- `src/app/acompanhar/page.tsx`
- `src/components/requests/public-request-tracking.tsx`

O path deve ficar padronizado como:

- `/acompanhar/detalhes?ticket=...`

### 2. Revisar exposicao do detalhe publico

`src/components/requests/public-request-tracking-details.tsx` ainda exibe
campos que precisam ser reavaliados agora que esse sera o canal oficial
school-facing, especialmente:

- `voucherCode`
- `campaignVoucherCode`
- `decisionReason`
- dados especificos demais de operacao

### 3. Desligar affordances de escola autenticada na navegacao

Remover do header e da experiencia publica:

- CTA para `/login/escola`
- textos que vendem "portal da escola"
- redirecionamentos por role `SCHOOL`

## Sequencia recomendada

1. Atualizar backlog e matriz para o novo baseline
2. Desativar navegacao e rotas de escola autenticada no runtime
3. Endurecer o acompanhamento publico por protocolo
4. Migrar notificacoes e textos para o novo canal oficial
5. Remover schema e codigo residual de autenticacao da escola em cleanup
   dedicado
