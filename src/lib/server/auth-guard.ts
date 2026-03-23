import type { Session } from "next-auth";

import type { SafPermission } from "@/lib/auth/permissions";
import { auth } from "@/auth";
import { isSafRole, isUserRole, type UserRole } from "@/lib/auth/roles";
import { apiError } from "@/lib/server/api-response";
import {
  resolveSafSchoolScope,
  type SafSchoolScope,
} from "@/lib/server/access-scope";
import { assertCan } from "@/lib/server/policy";

type SafSessionUser = NonNullable<Session["user"]> & {
  id: string;
  role: UserRole;
  isActive: true;
};

export type SafSession = Session & {
  user: SafSessionUser;
};

interface RequireSafSessionResult {
  session: SafSession | null;
  scope: SafSchoolScope | null;
  response: ReturnType<typeof apiError> | null;
}

function buildAuthRequiredResponse() {
  return apiError(
    "Sua sessão expirou ou você não tem acesso a esta operação. Faça login novamente.",
    {
      status: 401,
      code: "AUTH_REQUIRED",
    },
  );
}

function buildForbiddenResponse(message: string, code = "FORBIDDEN") {
  return apiError(message, {
    status: 403,
    code,
  });
}

export async function requireSafSession(permission?: SafPermission) {
  const session = await auth();

  if (!session?.user || typeof session.user.id !== "string") {
    return {
      session: null,
      scope: null,
      response: buildAuthRequiredResponse(),
    } satisfies RequireSafSessionResult;
  }

  if (
    !session.user.isActive ||
    !isUserRole(session.user.role) ||
    !isSafRole(session.user.role)
  ) {
    return {
      session: null,
      scope: null,
      response: buildForbiddenResponse(
        "Sua conta interna não está habilitada para acessar esta operação.",
      ),
    } satisfies RequireSafSessionResult;
  }

  if (permission) {
    try {
      assertCan(session.user.role, permission);
    } catch (error) {
      if (error instanceof Error) {
        return {
          session: null,
          scope: null,
          response: buildForbiddenResponse(error.message),
        } satisfies RequireSafSessionResult;
      }

      return {
        session: null,
        scope: null,
        response: buildForbiddenResponse(
          "Você não tem permissão para executar esta operação.",
        ),
      } satisfies RequireSafSessionResult;
    }
  }

  const safSession = session as SafSession;
  const scope = await resolveSafSchoolScope({
    userId: safSession.user.id,
    role: safSession.user.role,
  });

  return {
    session: safSession,
    scope,
    response: null,
  } satisfies RequireSafSessionResult;
}
