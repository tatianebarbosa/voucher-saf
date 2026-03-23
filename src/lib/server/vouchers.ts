import "server-only";

import {
  VoucherStatus as PrismaVoucherStatus,
  VoucherType as PrismaVoucherType,
  type Prisma,
  type School as PrismaSchool,
  type SchoolVoucher as PrismaSchoolVoucher,
} from "@prisma/client";

import { normalizeVoucherDraft } from "@/lib/voucher-schema";
import type { SafSchoolScope } from "@/lib/server/access-scope";
import {
  assertRequestedSchoolInScope,
  assertSchoolInScope,
  buildVoucherScopeWhere,
  logScopedMutation,
} from "@/lib/server/access-scope";
import {
  buildSystemAuditActor,
  recordOperationalEvent,
} from "@/lib/server/audit-log";
import { AccessPolicyError } from "@/lib/server/policy";
import { prisma } from "@/lib/server/db";
import { buildVoucherNotifications } from "@/lib/server/notifications";
import type { AuditActorInput } from "@/types/audit";
import type {
  SchoolVoucher,
  VoucherDraft,
  VoucherListFilters,
  VoucherStatus,
  VoucherType,
  VoucherUpdateDraft,
} from "@/types/voucher";

export class VoucherSchoolNotFoundError extends Error {
  constructor() {
    super(
      "A escola informada para o voucher não foi encontrada na base atual.",
    );
    this.name = "VoucherSchoolNotFoundError";
  }
}

const voucherTypeToDb: Record<VoucherType, PrismaVoucherType> = {
  campanha: PrismaVoucherType.CAMPANHA,
  outro: PrismaVoucherType.OUTRO,
};

const voucherTypeFromDb: Record<PrismaVoucherType, VoucherType> = {
  CAMPANHA: "campanha",
  OUTRO: "outro",
};

const voucherStatusToDb: Record<VoucherStatus, PrismaVoucherStatus> = {
  rascunho: PrismaVoucherStatus.RASCUNHO,
  ativo: PrismaVoucherStatus.ATIVO,
  enviado: PrismaVoucherStatus.ENVIADO,
  esgotado: PrismaVoucherStatus.ESGOTADO,
  expirado: PrismaVoucherStatus.EXPIRADO,
  cancelado: PrismaVoucherStatus.CANCELADO,
};

const voucherStatusFromDb: Record<PrismaVoucherStatus, VoucherStatus> = {
  RASCUNHO: "rascunho",
  ATIVO: "ativo",
  ENVIADO: "enviado",
  ESGOTADO: "esgotado",
  EXPIRADO: "expirado",
  CANCELADO: "cancelado",
};

type VoucherSchoolReference = Pick<
  PrismaSchool,
  "id" | "externalSchoolId" | "schoolName"
>;

function mapDbVoucher(record: PrismaSchoolVoucher): SchoolVoucher {
  return {
    id: record.id,
    schoolId: record.schoolId ?? undefined,
    schoolExternalId: record.schoolExternalId ?? undefined,
    schoolName: record.schoolName,
    voucherType: voucherTypeFromDb[record.voucherType],
    campaignName: record.campaignName,
    voucherCode: record.voucherCode,
    quantityAvailable: record.quantityAvailable,
    quantitySent: record.quantitySent,
    sentToEmail: record.sentToEmail ?? undefined,
    sentAt: record.sentAt?.toISOString(),
    expiresAt: record.expiresAt?.toISOString(),
    status: voucherStatusFromDb[record.status],
    sourceFile: record.sourceFile ?? undefined,
    sourceSheet: record.sourceSheet ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function buildVoucherWhere(
  filters: VoucherListFilters,
  scope?: SafSchoolScope,
): Prisma.SchoolVoucherWhereInput {
  const filtersList: Prisma.SchoolVoucherWhereInput[] = [];
  const normalizedQuery = filters.query?.trim();

  if (scope) {
    const scopeWhere = buildVoucherScopeWhere(scope);

    if (scopeWhere) {
      filtersList.push(scopeWhere);
    }
  }

  if (normalizedQuery) {
    filtersList.push({
      OR: [
        {
          schoolName: {
            contains: normalizedQuery,
          },
        },
        {
          schoolExternalId: {
            contains: normalizedQuery,
          },
        },
        {
          campaignName: {
            contains: normalizedQuery,
          },
        },
        {
          voucherCode: {
            contains: normalizedQuery,
          },
        },
      ],
    });
  }

  if (filters.schoolId) {
    if (scope) {
      assertRequestedSchoolInScope(scope, filters.schoolId, {
        action: "vouchers.read",
        entity: "School",
      });
    }

    filtersList.push({
      schoolId: filters.schoolId,
    });
  }

  if (filters.campaignName) {
    filtersList.push({
      campaignName: {
        contains: filters.campaignName,
      },
    });
  }

  if (filters.voucherType) {
    filtersList.push({
      voucherType: voucherTypeToDb[filters.voucherType],
    });
  }

  if (filters.status) {
    filtersList.push({
      status: voucherStatusToDb[filters.status],
    });
  }

  if (filtersList.length === 0) {
    return {};
  }

  return {
    AND: filtersList,
  };
}

async function resolveVoucherSchoolReference(data: {
  schoolId?: string;
  schoolExternalId?: string;
}) {
  if (data.schoolId) {
    const school = await prisma.school.findUnique({
      where: {
        id: data.schoolId,
      },
      select: {
        id: true,
        externalSchoolId: true,
        schoolName: true,
      },
    });

    if (!school) {
      throw new VoucherSchoolNotFoundError();
    }

    return school satisfies VoucherSchoolReference;
  }

  if (!data.schoolExternalId) {
    return null;
  }

  const school = await prisma.school.findUnique({
    where: {
      externalSchoolId: data.schoolExternalId,
    },
    select: {
      id: true,
      externalSchoolId: true,
      schoolName: true,
    },
  });

  return school satisfies VoucherSchoolReference | null;
}

function assertVoucherScopeForSchoolReference(
  scope: SafSchoolScope | undefined,
  schoolReference: VoucherSchoolReference | null,
  action: "vouchers.create" | "vouchers.update",
) {
  if (!scope) {
    return;
  }

  if (!schoolReference?.id) {
    throw new AccessPolicyError(
      "Vincule o voucher a uma escola do seu escopo para continuar.",
      {
        status: 403,
        code: "OUT_OF_SCOPE",
      },
    );
  }

  assertSchoolInScope(scope, schoolReference.id, {
    action,
    entity: "SchoolVoucher",
    entityId: schoolReference.id,
  });
}

function buildVoucherPersistenceData(
  data: VoucherDraft,
  schoolReference: VoucherSchoolReference | null,
) {
  return {
    schoolId: schoolReference?.id ?? null,
    schoolExternalId:
      schoolReference?.externalSchoolId ?? data.schoolExternalId ?? null,
    schoolName: schoolReference?.schoolName ?? data.schoolName,
    voucherType: voucherTypeToDb[data.voucherType],
    campaignName: data.campaignName,
    voucherCode: data.voucherCode,
    quantityAvailable: data.quantityAvailable,
    quantitySent: data.quantitySent,
    sentToEmail: data.sentToEmail ?? null,
    sentAt: data.sentAt ? new Date(data.sentAt) : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    status: voucherStatusToDb[data.status],
    sourceFile: data.sourceFile ?? null,
    sourceSheet: data.sourceSheet ?? null,
    notes: data.notes ?? null,
  };
}

function buildVoucherSummary(input: {
  schoolName: string;
  campaignName: string;
  voucherCode: string;
}) {
  return `${input.campaignName} / ${input.voucherCode} / ${input.schoolName}`;
}

function mapVoucherRecordToDraft(record: PrismaSchoolVoucher): VoucherDraft {
  return {
    schoolId: record.schoolId ?? undefined,
    schoolExternalId: record.schoolExternalId ?? undefined,
    schoolName: record.schoolName,
    voucherType: voucherTypeFromDb[record.voucherType],
    campaignName: record.campaignName,
    voucherCode: record.voucherCode,
    quantityAvailable: record.quantityAvailable,
    quantitySent: record.quantitySent,
    sentToEmail: record.sentToEmail ?? undefined,
    sentAt: record.sentAt?.toISOString(),
    expiresAt: record.expiresAt?.toISOString(),
    status: voucherStatusFromDb[record.status],
    sourceFile: record.sourceFile ?? undefined,
    sourceSheet: record.sourceSheet ?? undefined,
    notes: record.notes ?? undefined,
  };
}

function pickPatchedValue<K extends keyof VoucherUpdateDraft>(
  patch: VoucherUpdateDraft,
  key: K,
  fallback: VoucherDraft[K],
): VoucherDraft[K] {
  return (
    Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : fallback
  ) as VoucherDraft[K];
}

function mergeVoucherDraft(
  existing: PrismaSchoolVoucher,
  patch: VoucherUpdateDraft,
): VoucherDraft {
  const currentDraft = mapVoucherRecordToDraft(existing);

  return normalizeVoucherDraft({
    schoolId: pickPatchedValue(patch, "schoolId", currentDraft.schoolId),
    schoolExternalId: pickPatchedValue(
      patch,
      "schoolExternalId",
      currentDraft.schoolExternalId,
    ),
    schoolName: pickPatchedValue(patch, "schoolName", currentDraft.schoolName),
    voucherType: pickPatchedValue(
      patch,
      "voucherType",
      currentDraft.voucherType,
    ),
    campaignName: pickPatchedValue(
      patch,
      "campaignName",
      currentDraft.campaignName,
    ),
    voucherCode: pickPatchedValue(patch, "voucherCode", currentDraft.voucherCode),
    quantityAvailable: pickPatchedValue(
      patch,
      "quantityAvailable",
      currentDraft.quantityAvailable,
    ),
    quantitySent: pickPatchedValue(
      patch,
      "quantitySent",
      currentDraft.quantitySent,
    ),
    sentToEmail: pickPatchedValue(
      patch,
      "sentToEmail",
      currentDraft.sentToEmail,
    ),
    sentAt: pickPatchedValue(patch, "sentAt", currentDraft.sentAt),
    expiresAt: pickPatchedValue(
      patch,
      "expiresAt",
      currentDraft.expiresAt,
    ),
    status: pickPatchedValue(patch, "status", currentDraft.status),
    sourceFile: pickPatchedValue(
      patch,
      "sourceFile",
      currentDraft.sourceFile,
    ),
    sourceSheet: pickPatchedValue(
      patch,
      "sourceSheet",
      currentDraft.sourceSheet,
    ),
    notes: pickPatchedValue(patch, "notes", currentDraft.notes),
  });
}

export async function listVouchers(
  filters: VoucherListFilters = {},
  scope?: SafSchoolScope,
) {
  const vouchers = await prisma.schoolVoucher.findMany({
    where: buildVoucherWhere(filters, scope),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    vouchers: vouchers.map(mapDbVoucher),
    total: vouchers.length,
  };
}

async function getScopedVoucherRecord(
  id: string,
  scope?: SafSchoolScope,
  action = "vouchers.read",
) {
  const voucher = await prisma.schoolVoucher.findUnique({
    where: { id },
  });

  if (!voucher) {
    return undefined;
  }

  if (scope) {
    assertSchoolInScope(scope, voucher.schoolId, {
      action,
      entity: "SchoolVoucher",
      entityId: voucher.id,
    });
  }

  return voucher;
}

export async function getVoucherById(id: string, scope?: SafSchoolScope) {
  const voucher = await getScopedVoucherRecord(id, scope);

  if (!voucher) {
    return undefined;
  }

  return mapDbVoucher(voucher);
}

export async function listVouchersBySchool(
  schoolId: string,
  scope?: SafSchoolScope,
) {
  const result = await listVouchers({ schoolId }, scope);

  return result.vouchers;
}

export async function listVouchersByCampaign(
  campaignName: string,
  scope?: SafSchoolScope,
) {
  const result = await listVouchers({ campaignName }, scope);

  return result.vouchers;
}

export async function createVoucher(
  data: VoucherDraft,
  scope?: SafSchoolScope,
  actor: AuditActorInput = buildSystemAuditActor("Cadastro interno de voucher"),
) {
  const schoolReference = await resolveVoucherSchoolReference(data);
  assertVoucherScopeForSchoolReference(scope, schoolReference, "vouchers.create");

  const voucher = await prisma.$transaction(async (tx) => {
    const createdVoucher = await tx.schoolVoucher.create({
      data: buildVoucherPersistenceData(data, schoolReference),
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "voucher_created",
        entityType: "voucher",
        entityId: createdVoucher.id,
        schoolId: createdVoucher.schoolId ?? undefined,
        actor,
        summary: `Voucher criado: ${buildVoucherSummary(createdVoucher)}.`,
        metadata: {
          voucherType: voucherTypeFromDb[createdVoucher.voucherType],
          status: voucherStatusFromDb[createdVoucher.status],
          quantityAvailable: createdVoucher.quantityAvailable,
          quantitySent: createdVoucher.quantitySent,
        },
      },
      notifications: buildVoucherNotifications({
        voucher: {
          id: createdVoucher.id,
          schoolId: createdVoucher.schoolId,
          schoolName: createdVoucher.schoolName,
          voucherType: voucherTypeFromDb[createdVoucher.voucherType],
          campaignName: createdVoucher.campaignName,
          voucherCode: createdVoucher.voucherCode,
          sentToEmail: createdVoucher.sentToEmail,
          status: voucherStatusFromDb[createdVoucher.status],
          quantityAvailable: createdVoucher.quantityAvailable,
          quantitySent: createdVoucher.quantitySent,
          expiresAt: createdVoucher.expiresAt?.toISOString(),
        },
      }),
    });

    return createdVoucher;
  });

  if (scope) {
    logScopedMutation({
      scope,
      action: "vouchers.create",
      entity: "SchoolVoucher",
      entityId: voucher.id,
      schoolId: voucher.schoolId,
    });
  }

  return mapDbVoucher(voucher);
}

export async function updateVoucher(
  id: string,
  patch: VoucherUpdateDraft,
  scope?: SafSchoolScope,
  actor: AuditActorInput = buildSystemAuditActor("Atualização interna de voucher"),
) {
  const existingVoucher = await getScopedVoucherRecord(
    id,
    scope,
    "vouchers.update",
  );

  if (!existingVoucher) {
    return undefined;
  }

  const mergedVoucher = mergeVoucherDraft(existingVoucher, patch);
  const schoolReference = await resolveVoucherSchoolReference(mergedVoucher);
  assertVoucherScopeForSchoolReference(scope, schoolReference, "vouchers.update");

  const previousStatus = voucherStatusFromDb[existingVoucher.status];
  const updatedVoucher = await prisma.$transaction(async (tx) => {
    const nextVoucher = await tx.schoolVoucher.update({
      where: { id },
      data: buildVoucherPersistenceData(mergedVoucher, schoolReference),
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "voucher_updated",
        entityType: "voucher",
        entityId: nextVoucher.id,
        schoolId: nextVoucher.schoolId ?? undefined,
        actor,
        summary: `Voucher atualizado: ${buildVoucherSummary(nextVoucher)}.`,
        metadata: {
          previousStatus,
          nextStatus: voucherStatusFromDb[nextVoucher.status],
          quantityAvailable: nextVoucher.quantityAvailable,
          quantitySent: nextVoucher.quantitySent,
        },
      },
      notifications: buildVoucherNotifications({
        voucher: {
          id: nextVoucher.id,
          schoolId: nextVoucher.schoolId,
          schoolName: nextVoucher.schoolName,
          voucherType: voucherTypeFromDb[nextVoucher.voucherType],
          campaignName: nextVoucher.campaignName,
          voucherCode: nextVoucher.voucherCode,
          sentToEmail: nextVoucher.sentToEmail,
          status: voucherStatusFromDb[nextVoucher.status],
          quantityAvailable: nextVoucher.quantityAvailable,
          quantitySent: nextVoucher.quantitySent,
          expiresAt: nextVoucher.expiresAt?.toISOString(),
        },
        previousStatus,
      }),
    });

    return nextVoucher;
  });

  if (scope) {
    logScopedMutation({
      scope,
      action: "vouchers.update",
      entity: "SchoolVoucher",
      entityId: updatedVoucher.id,
      schoolId: updatedVoucher.schoolId,
    });
  }

  return mapDbVoucher(updatedVoucher);
}
