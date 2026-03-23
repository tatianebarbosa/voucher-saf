import "server-only";

import type { ApiErrorDetails } from "@/types/api";
import type { School, SchoolDraft } from "@/types/school";
import type { SafPermission } from "@/lib/auth/permissions";
import { hasPermissionForRole } from "@/lib/auth/permissions";
import { ADMIN_ONLY_SCHOOL_FIELDS } from "@/lib/auth/school-fields";
import type { UserRole } from "@/lib/auth/roles";

export class AccessPolicyError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetails | Record<string, unknown>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: ApiErrorDetails | Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "AccessPolicyError";
    this.status = options.status ?? 403;
    this.code = options.code ?? "FORBIDDEN";
    this.details = options.details;
  }
}

export function hasPermission(role: UserRole, permission: SafPermission) {
  return hasPermissionForRole(role, permission);
}

export function assertCan(role: UserRole, permission: SafPermission) {
  if (!hasPermission(role, permission)) {
    throw new AccessPolicyError(
      "Você não tem permissão para executar está operação.",
      {
        status: 403,
        code: "FORBIDDEN",
      },
    );
  }
}

function normalizeComparableValue(value: unknown) {
  return value ?? undefined;
}

function buildAdminOnlyFieldError(
  fieldNames: readonly (keyof SchoolDraft)[],
): ApiErrorDetails {
  return {
    fieldErrors: Object.fromEntries(
      fieldNames.map((fieldName) => [
        fieldName,
        ["Somente administradores podem alterar este campo."],
      ]),
    ),
  };
}

function getChangedAdminOnlyFields(
  school: School,
  nextSchoolDraft: SchoolDraft,
) {
  return ADMIN_ONLY_SCHOOL_FIELDS.filter(
    (fieldName) =>
      normalizeComparableValue(school[fieldName]) !==
      normalizeComparableValue(nextSchoolDraft[fieldName]),
  );
}

export function assertCanUpdateSchool(
  role: UserRole,
  school: School,
  nextSchoolDraft: SchoolDraft,
) {
  if (role === "SAF_ADMIN") {
    assertCan(role, "schools.update_admin");
    return;
  }

  if (role !== "SAF_OPERADOR") {
    throw new AccessPolicyError(
      "Você não tem permissão para editar escolas.",
      {
        status: 403,
        code: "FORBIDDEN",
      },
    );
  }

  assertCan(role, "schools.update_operational");

  const changedAdminOnlyFields = getChangedAdminOnlyFields(
    school,
    nextSchoolDraft,
  );

  if (changedAdminOnlyFields.length > 0) {
    throw new AccessPolicyError(
      "Você não tem permissão para alterar os campos administrativos da escola.",
      {
        status: 403,
        code: "FORBIDDEN",
        details: buildAdminOnlyFieldError(changedAdminOnlyFields),
      },
    );
  }
}
