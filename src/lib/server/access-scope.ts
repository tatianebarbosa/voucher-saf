import "server-only";

import type { Prisma } from "@prisma/client";

import type { UserRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/server/db";
import { AccessPolicyError } from "@/lib/server/policy";

const EMPTY_SCOPE_SENTINEL = "__NO_SCHOOL_SCOPE__";

export interface SafSchoolScope {
  userId: string;
  role: UserRole;
  isGlobal: boolean;
  schoolIds: string[];
}

interface ScopeAssertionOptions {
  action: string;
  entity: string;
  entityId?: string;
}

function getScopeSchoolIds(scope: SafSchoolScope) {
  return scope.schoolIds.length > 0
    ? scope.schoolIds
    : [EMPTY_SCOPE_SENTINEL];
}

function logAccessEvent(
  level: "info" | "warn",
  event: string,
  payload: Record<string, unknown>,
) {
  const logger = level === "warn" ? console.warn : console.info;

  logger(
    `[access] ${JSON.stringify({
      event,
      ...payload,
    })}`,
  );
}

export async function resolveSafSchoolScope(input: {
  userId: string;
  role: UserRole;
}): Promise<SafSchoolScope> {
  if (input.role === "SAF_ADMIN") {
    return {
      userId: input.userId,
      role: input.role,
      isGlobal: true,
      schoolIds: [],
    };
  }

  const memberships = await prisma.schoolMembership.findMany({
    where: {
      userId: input.userId,
    },
    select: {
      schoolId: true,
    },
    orderBy: {
      schoolId: "asc",
    },
  });

  return {
    userId: input.userId,
    role: input.role,
    isGlobal: false,
    schoolIds: memberships.map((membership) => membership.schoolId),
  };
}

export function canAccessSchool(scope: SafSchoolScope, schoolId?: string | null) {
  if (scope.isGlobal) {
    return true;
  }

  if (!schoolId) {
    return false;
  }

  return scope.schoolIds.includes(schoolId);
}

export function assertSchoolInScope(
  scope: SafSchoolScope,
  schoolId: string | null | undefined,
  options: ScopeAssertionOptions,
) {
  if (canAccessSchool(scope, schoolId)) {
    return;
  }

  logAccessEvent("warn", "scope_denied", {
    userId: scope.userId,
    role: scope.role,
    action: options.action,
    entity: options.entity,
    entityId: options.entityId,
    schoolId: schoolId ?? null,
  });

  throw new AccessPolicyError(
    "O recurso solicitado está fora do conjunto de escolas vinculado ao seu usuario.",
    {
      status: 403,
      code: "OUT_OF_SCOPE",
    },
  );
}

export function assertRequestedSchoolInScope(
  scope: SafSchoolScope,
  schoolId: string,
  options: Omit<ScopeAssertionOptions, "entityId">,
) {
  assertSchoolInScope(scope, schoolId, {
    ...options,
    entityId: schoolId,
  });
}

export function buildSchoolScopeWhere(
  scope: SafSchoolScope,
): Prisma.SchoolWhereInput | undefined {
  if (scope.isGlobal) {
    return undefined;
  }

  return {
    id: {
      in: getScopeSchoolIds(scope),
    },
  };
}

export function buildRequestScopeWhere(
  scope: SafSchoolScope,
): Prisma.VoucherRequestWhereInput | undefined {
  if (scope.isGlobal) {
    return undefined;
  }

  return {
    schoolId: {
      in: getScopeSchoolIds(scope),
    },
  };
}

export function buildVoucherScopeWhere(
  scope: SafSchoolScope,
): Prisma.SchoolVoucherWhereInput | undefined {
  if (scope.isGlobal) {
    return undefined;
  }

  return {
    schoolId: {
      in: getScopeSchoolIds(scope),
    },
  };
}

export function logScopedMutation(input: {
  scope: SafSchoolScope;
  action: string;
  entity: string;
  entityId: string;
  schoolId?: string | null;
}) {
  logAccessEvent("info", "mutation_allowed", {
    userId: input.scope.userId,
    role: input.scope.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    schoolId: input.schoolId ?? null,
    scopeType: input.scope.isGlobal ? "global" : "membership",
  });
}
