# Fluxo de Acesso da Escola

## Status

Documento descontinuado.

Em 19 de marco de 2026, o produto deixou de seguir com autenticacao de escola
e portal autenticado da unidade. A jornada externa passou a ser:

- abertura publica da solicitacao
- acompanhamento publico por numero de atendimento / protocolo

Este documento fica apenas como registro historico de uma frente que nao deve
seguir para novas implementacoes. O direcionamento vigente esta em:

- `docs/access-backlog.md`
- `docs/access-matrix.md`
- `docs/public-tracking-recenter-impact.md`

## Objetivo

Definir a jornada de ativacao, definicao de senha e recuperacao de acesso para
usuarios com role `SCHOOL`, mantendo a criacao de contas `inativas` por padrao
 e liberando o portal apenas apos uma jornada segura e auditavel.

## Baseline Recomendado

- Reutilizar a tabela `User` com role `SCHOOL`.
- Manter vinculo de escopo em `SchoolMembership`.
- Criar contas de escola com `isActive = false` por padrao.
- Tratar ativacao e reset com `token` de uso unico enviado por e-mail.
- Nunca armazenar token bruto no banco; salvar apenas `tokenHash`.
- Nunca ativar conta no momento do cadastro administrativo.

## Estados da Conta

| Estado | `isActive` | Senha valida | Acesso ao portal |
| --- | --- | --- | --- |
| Conta criada | `false` | irrelevante | nao |
| Convite enviado | `false` | irrelevante | nao |
| Conta ativada | `true` | sim | sim |
| Reset em andamento | `true` | sim | sim, ate troca de senha |
| Conta desativada | `false` | sim ou nao | nao |

## Modelo Recomendado

Criar uma entidade dedicada para tokens de acesso, separada de
`NotificationEvent`.

### Entidade sugerida

`SchoolAccessToken`

Campos:

- `id`
- `userId`
- `tokenHash`
- `tokenType`
  - `ACTIVATION`
  - `PASSWORD_RESET`
- `expiresAt`
- `consumedAt`
- `revokedAt`
- `createdAt`
- `updatedAt`
- `requestedByUserId` opcional
- `recipientEmail` snapshot opcional

Regras:

- indexar por `userId`, `tokenType`, `expiresAt`
- permitir no maximo `1` token ativo por `userId + tokenType`
- invalidar tokens anteriores do mesmo tipo quando um novo for emitido

## Fluxo 1: Criacao da Conta

Origem:

- script admin
- futura tela admin

Passos:

1. criar ou atualizar `User` com role `SCHOOL`
2. vincular exatamente `1` escola em `SchoolMembership`
3. manter `isActive = false`
4. gerar senha aleatoria tecnica apenas para preenchimento de `passwordHash`
5. opcionalmente disparar convite de ativacao

Validacoes:

- o e-mail nao pode conflitar com usuario SAF
- o usuario da escola deve terminar com exatamente `1` membership
- se houver `0` ou `>1` memberships, o convite nao deve ser enviado

## Fluxo 2: Ativacao / Primeiro Acesso

Entrada:

- conta `SCHOOL` inativa
- convite enviado por e-mail

Passos:

1. sistema gera token `ACTIVATION` com validade de `48 horas`
2. sistema envia e-mail com link para definicao de senha
3. usuario abre o link
4. backend valida:
   - token existe
   - token nao expirou
   - token nao foi consumido
   - usuario ainda e `SCHOOL`
   - usuario tem exatamente `1` escola vinculada
5. usuario define a senha
6. sistema:
   - grava novo `passwordHash`
   - marca `isActive = true`
   - marca token como consumido
   - revoga tokens ativos anteriores de ativacao e reset
   - registra auditoria
7. usuario e redirecionado para `/login/escola`

Mensagens:

- sucesso: "Acesso ativado com sucesso. Entre com seu e-mail e a senha cadastrada."
- token expirado ou invalido: "Este link de ativacao nao e mais valido. Solicite um novo link."

## Fluxo 3: Reenvio de Ativacao

Entrada:

- usuario `SCHOOL` ainda inativo

Passos:

1. usuario informa e-mail em tela publica "Primeiro acesso"
2. resposta da API deve ser sempre generica
3. se existir conta de escola inativa elegivel:
   - revogar token `ACTIVATION` anterior
   - gerar novo token
   - enfileirar e-mail de ativacao
4. se nao existir conta elegivel:
   - nao revelar isso na resposta

Resposta publica:

- "Se existir um acesso pendente para este e-mail, enviaremos um novo link."

## Fluxo 4: Esqueci Minha Senha

Entrada:

- usuario `SCHOOL` ativo

Passos:

1. usuario informa o e-mail em `/login/escola/esqueci-senha`
2. resposta da API deve ser sempre generica
3. se existir conta ativa elegivel:
   - gerar token `PASSWORD_RESET` com validade de `30 minutos`
   - revogar token anterior do mesmo tipo
   - enfileirar e-mail de redefinicao
4. usuario abre o link
5. backend valida token e apresenta formulario de nova senha
6. ao confirmar:
   - grava novo `passwordHash`
   - consome token
   - revoga outros tokens ativos de reset
   - opcionalmente invalida sessoes abertas
   - registra auditoria

Resposta publica:

- "Se existir um acesso ativo para este e-mail, enviaremos um link de redefinicao."

## Rotas Recomendadas

Paginas:

- `/login/escola`
- `/login/escola/ativar`
- `/login/escola/primeiro-acesso`
- `/login/escola/esqueci-senha`
- `/login/escola/redefinir-senha`

APIs ou server actions:

- `POST /api/school-access/invitations`
- `POST /api/school-access/activation/resend`
- `POST /api/school-access/activation/confirm`
- `POST /api/school-access/password/forgot`
- `POST /api/school-access/password/reset`

Observacao:

- a confirmacao tambem pode ser feita por server action, mas o contrato deve
  continuar claro e separado por jornada

## Templates de E-mail

Adicionar dois templates novos na fila de notificacao:

- `school_access_invitation`
- `school_password_reset`

Conteudo minimo:

- nome da unidade
- orientacao clara sobre o objetivo do link
- validade do link
- CTA unico

Conteudo que nao deve entrar:

- senha provisoria
- codigo operacional de voucher
- qualquer dado de solicitacao

## Regras de Seguranca

- tokens com `crypto.randomBytes`, no minimo `32 bytes`
- persistir apenas hash do token
- comparar em tempo constante
- token de uso unico
- expiracao curta
- revogacao explicita ao reenviar
- nao revelar existencia de conta nas telas publicas
- aplicar rate limit por e-mail e por IP

Limites iniciais sugeridos:

- ativacao: maximo `3` reenvios por `24h`
- reset: maximo `5` solicitacoes por `24h`
- cooldown minimo de `15 minutos` entre envios para o mesmo e-mail

## Auditoria e Observabilidade

Registrar pelo menos:

- convite enviado
- convite reenviado
- ativacao concluida
- reset solicitado
- reset concluido
- token expirado consumido por tentativa invalida

Campos minimos:

- `userId`
- `schoolId`
- `actorType`
- `actorUserId` quando houver operador/admin
- `recipientEmail`
- `tokenType`

## Dependencias de Ambiente

Ja existentes e reaproveitaveis:

- `APP_PUBLIC_URL`
- `MAIL_PROVIDER`
- `MAIL_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`

Nao ha necessidade de variavel de ambiente nova para o MVP se TTL e limites
forem codificados inicialmente.

## Criterios de Aceite

- conta de escola nasce inativa
- nenhuma escola entra no portal sem definir a propria senha
- nao existe envio de senha por e-mail
- ativacao e reset usam token de uso unico e expiracao
- resposta publica nao revela se o e-mail existe
- fluxo falha quando o usuario `SCHOOL` nao tiver exatamente `1` membership
- auditoria registra as transicoes de acesso

## Sequencia Recomendada de Implementacao

1. modelar `SchoolAccessToken` no Prisma
2. criar helpers de emissao, validacao, consumo e revogacao de token
3. adicionar templates de convite e reset na fila de notificacao
4. criar paginas e server actions publicas de ativacao e reset
5. ajustar operacao admin/script para disparar convite sem ativar conta
6. testar cenarios de sucesso, expiracao, reenvio e uso invalido

## Decisoes Fechadas

- conta de escola continua sendo `User` com role `SCHOOL`
- conta nasce `inativa`
- ativacao acontece por link de uso unico
- redefinicao de senha usa fluxo proprio, tambem por link de uso unico
- o portal da escola so deve ser liberado apos ativacao bem-sucedida
