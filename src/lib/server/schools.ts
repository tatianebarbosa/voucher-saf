import "server-only";

import {
  RequestStatus as PrismaRequestStatus,
  RequestType as PrismaRequestType,
  RequesterType as PrismaRequesterType,
  VoucherStatus as PrismaVoucherStatus,
  VoucherType as PrismaVoucherType,
  type Prisma,
  type School as PrismaSchool,
} from "@prisma/client";

import {
  buildVoucherCode,
  formatCampaignVoucherCondition,
  formatInstallmentPlan,
} from "@/lib/formatters";
import type { SafSchoolScope } from "@/lib/server/access-scope";
import {
  assertSchoolInScope,
  buildSchoolScopeWhere,
  logScopedMutation,
} from "@/lib/server/access-scope";
import {
  buildSystemAuditActor,
  recordOperationalEvent,
} from "@/lib/server/audit-log";
import { prisma } from "@/lib/server/db";
import type { AuditActorInput } from "@/types/audit";
import type {
  PublicSchoolOption,
  School,
  SchoolDetails,
  SchoolDraft,
  SchoolRequestHistoryItem,
  SchoolVoucherSummaryItem,
} from "@/types/school";
import type { RequesterType, RequestStatus, RequestType } from "@/types/request";
import type { VoucherStatus, VoucherType } from "@/types/voucher";

export class SchoolConflictError extends Error {
  field: keyof SchoolDraft;

  constructor(field: keyof SchoolDraft, message: string) {
    super(message);
    this.name = "SchoolConflictError";
    this.field = field;
  }
}

const statusFromDb: Record<PrismaRequestStatus, RequestStatus> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em analise",
  PRONTA_PARA_ENVIO: "Pronta para envio",
  NEGADA: "Negada",
};

const typeFromDb: Record<PrismaRequestType, RequestType> = {
  DESCONTO: "desconto",
  PARCELAMENTO: "parcelamento",
  DESMEMBRAMENTO: "desmembramento",
};

const requesterTypeFromDb: Record<PrismaRequesterType, RequesterType> = {
  RESPONSAVEL: "responsavel",
  ESCOLA: "escola",
};

const voucherTypeFromDb: Record<PrismaVoucherType, VoucherType> = {
  CAMPANHA: "campanha",
  OUTRO: "outro",
};

const voucherStatusFromDb: Record<PrismaVoucherStatus, VoucherStatus> = {
  RASCUNHO: "rascunho",
  ATIVO: "ativo",
  ENVIADO: "enviado",
  ESGOTADO: "esgotado",
  EXPIRADO: "expirado",
  CANCELADO: "cancelado",
};

const SCHOOL_HISTORY_PAGE_SIZE = 10;
const SCHOOL_VOUCHER_PAGE_SIZE = 10;

const schoolHistorySelect = {
  id: true,
  schoolName: true,
  ticketNumber: true,
  requesterType: true,
  requesterName: true,
  requestType: true,
  status: true,
  origin: true,
  createdAt: true,
  discountPercentage: true,
  installmentCount: true,
  campaignVoucherCode: true,
} satisfies Prisma.VoucherRequestSelect;

type SchoolHistoryRecord = Prisma.VoucherRequestGetPayload<{
  select: typeof schoolHistorySelect;
}>;

const schoolVoucherSelect = {
  id: true,
  voucherType: true,
  campaignName: true,
  voucherCode: true,
  quantityAvailable: true,
  quantitySent: true,
  sentToEmail: true,
  sentAt: true,
  expiresAt: true,
  status: true,
  notes: true,
} satisfies Prisma.SchoolVoucherSelect;

type SchoolVoucherRecord = Prisma.SchoolVoucherGetPayload<{
  select: typeof schoolVoucherSelect;
}>;

function mapDbSchool(record: PrismaSchool): School {
  return {
    id: record.id,
    externalSchoolId: record.externalSchoolId ?? undefined,
    schoolName: record.schoolName,
    schoolEmail: record.schoolEmail ?? undefined,
    schoolStatus: record.schoolStatus ?? undefined,
    cluster: record.cluster ?? undefined,
    safOwner: record.safOwner ?? undefined,
    city: record.city ?? undefined,
    state: record.state ?? undefined,
    cnpj: record.cnpj ?? undefined,
    tradeName: record.tradeName ?? undefined,
    region: record.region ?? undefined,
    contactPhone: record.contactPhone ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function buildConditionLabel(record: SchoolHistoryRecord) {
  if (record.requestType === PrismaRequestType.DESCONTO) {
    return record.discountPercentage !== null
      ? `${record.discountPercentage}% de desconto`
      : "Desconto";
  }

  if (record.requestType === PrismaRequestType.DESMEMBRAMENTO) {
    return formatCampaignVoucherCondition(record.campaignVoucherCode);
  }

  return record.installmentCount !== null
    ? formatInstallmentPlan(record.installmentCount)
    : "Parcelamento sem juros";
}

function buildHistoryVoucherCode(record: SchoolHistoryRecord) {
  if (
    record.requestType !== PrismaRequestType.DESCONTO ||
    record.discountPercentage === null
  ) {
    return undefined;
  }

  return buildVoucherCode(
    record.schoolName,
    record.discountPercentage,
    record.requesterName,
  );
}

function mapDbRequestHistory(record: SchoolHistoryRecord): SchoolRequestHistoryItem {
  return {
    id: record.id,
    ticketNumber: record.ticketNumber,
    requestType: typeFromDb[record.requestType],
    requesterType: requesterTypeFromDb[record.requesterType],
    requesterName: record.requesterName,
    status: statusFromDb[record.status],
    createdAt: record.createdAt.toISOString(),
    conditionLabel: buildConditionLabel(record),
    voucherCode: buildHistoryVoucherCode(record),
    origin: record.origin,
  };
}

function buildNotesExcerpt(notes: string | null) {
  if (!notes) {
    return undefined;
  }

  const normalizedNotes = notes.replace(/\s+/g, " ").trim();

  if (normalizedNotes.length <= 180) {
    return normalizedNotes;
  }

  return `${normalizedNotes.slice(0, 177).trimEnd()}...`;
}

function mapDbSchoolVoucher(record: SchoolVoucherRecord): SchoolVoucherSummaryItem {
  return {
    id: record.id,
    voucherType: voucherTypeFromDb[record.voucherType],
    campaignName: record.campaignName,
    voucherCode: record.voucherCode,
    quantityAvailable: record.quantityAvailable,
    quantitySent: record.quantitySent,
    sentToEmail: record.sentToEmail ?? undefined,
    sentAt: record.sentAt?.toISOString(),
    expiresAt: record.expiresAt?.toISOString(),
    status: voucherStatusFromDb[record.status],
    notesExcerpt: buildNotesExcerpt(record.notes),
  };
}

function normalizeHistoryPage(page?: number) {
  if (!page || Number.isNaN(page) || !Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.floor(page));
}

function buildPagination(total: number, page: number, pageSize: number) {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const currentPage = Math.min(normalizeHistoryPage(page), totalPages);

  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
  };
}

function normalizeSchoolName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function buildSchoolCreateData(data: SchoolDraft): Prisma.SchoolUncheckedCreateInput {
  return {
    externalSchoolId: data.externalSchoolId ?? null,
    schoolName: data.schoolName,
    schoolEmail: data.schoolEmail ?? null,
    schoolStatus: data.schoolStatus ?? null,
    cluster: data.cluster ?? null,
    safOwner: data.safOwner ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    cnpj: data.cnpj ?? null,
    tradeName: data.tradeName ?? null,
    region: data.region ?? null,
    contactPhone: data.contactPhone ?? null,
  };
}

function buildSchoolUpdateData(
  existingSchool: PrismaSchool,
  data: SchoolDraft,
): Prisma.SchoolUncheckedUpdateInput {
  return {
    externalSchoolId: data.externalSchoolId ?? null,
    schoolName: data.schoolName,
    schoolEmail: data.schoolEmail ?? null,
    schoolStatus: data.schoolStatus ?? null,
    cluster: data.cluster ?? null,
    safOwner: data.safOwner ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    cnpj: data.cnpj ?? null,
    tradeName: data.tradeName ?? existingSchool.tradeName ?? null,
    region: data.region ?? existingSchool.region ?? null,
    contactPhone: data.contactPhone ?? existingSchool.contactPhone ?? null,
  };
}

async function assertNoSchoolConflicts(
  data: SchoolDraft,
  options: { excludeId?: string } = {},
) {
  const { excludeId } = options;

  if (data.externalSchoolId) {
    const schoolWithSameExternalId = await prisma.school.findUnique({
      where: { externalSchoolId: data.externalSchoolId },
    });

    if (
      schoolWithSameExternalId &&
      schoolWithSameExternalId.id !== excludeId
    ) {
      throw new SchoolConflictError(
        "externalSchoolId",
        "Já existe uma escola com este ID externo.",
      );
    }
  }

  if (data.cnpj) {
    const schoolWithSameCnpj = await prisma.school.findFirst({
      where: {
        cnpj: data.cnpj,
        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
      },
    });

    if (schoolWithSameCnpj) {
      throw new SchoolConflictError(
        "cnpj",
        "Já existe uma escola com este CNPJ.",
      );
    }
  }

  const schoolsWithSameName = await prisma.school.findMany({
    where: excludeId
      ? {
          NOT: {
            id: excludeId,
          },
        }
      : undefined,
    select: {
      id: true,
      schoolName: true,
    },
  });

  const normalizedTargetName = normalizeSchoolName(data.schoolName);
  const schoolWithSameName = schoolsWithSameName.find(
    (school) => normalizeSchoolName(school.schoolName) === normalizedTargetName,
  );

  if (schoolWithSameName) {
    throw new SchoolConflictError(
      "schoolName",
      "Já existe uma escola cadastrada com este nome.",
    );
  }
}

function buildSchoolListWhere(
  options: { query?: string },
  scope?: SafSchoolScope,
): Prisma.SchoolWhereInput | undefined {
  const normalizedQuery = options.query?.trim().toLocaleLowerCase("pt-BR");
  const filters: Prisma.SchoolWhereInput[] = [];

  if (scope) {
    const scopeWhere = buildSchoolScopeWhere(scope);

    if (scopeWhere) {
      filters.push(scopeWhere);
    }
  }

  if (normalizedQuery && normalizedQuery !== "") {
    filters.push({
      OR: [
        {
          schoolName: {
            contains: normalizedQuery,
          },
        },
        {
          externalSchoolId: {
            contains: normalizedQuery,
          },
        },
      ],
    });
  }

  if (filters.length === 0) {
    return undefined;
  }

  return {
    AND: filters,
  };
}

async function getScopedSchoolRecord(
  id: string,
  scope?: SafSchoolScope,
  action = "schools.read",
) {
  const schoolRecord = await prisma.school.findUnique({
    where: { id },
  });

  if (!schoolRecord) {
    return undefined;
  }

  if (scope) {
    assertSchoolInScope(scope, schoolRecord.id, {
      action,
      entity: "School",
      entityId: schoolRecord.id,
    });
  }

  return schoolRecord;
}

export async function listSchools(
  options: { query?: string } = {},
  scope?: SafSchoolScope,
) {
  const schools = await prisma.school.findMany({
    where: buildSchoolListWhere(options, scope),
    orderBy: [{ schoolName: "asc" }, { createdAt: "asc" }],
  });

  return {
    schools: schools.map(mapDbSchool),
    total: schools.length,
  };
}

export async function getSchoolDetailsById(
  id: string,
  options: { page?: number; voucherPage?: number } = {},
  scope?: SafSchoolScope,
): Promise<SchoolDetails | undefined> {
  const schoolRecord = await getScopedSchoolRecord(id, scope);

  if (!schoolRecord) {
    return undefined;
  }

  const [requestTotal, voucherTotal] = await Promise.all([
    prisma.voucherRequest.count({
      where: {
        schoolId: id,
      },
    }),
    prisma.schoolVoucher.count({
      where: {
        schoolId: id,
      },
    }),
  ]);

  const requestPagination = buildPagination(
    requestTotal,
    options.page ?? 1,
    SCHOOL_HISTORY_PAGE_SIZE,
  );
  const voucherPagination = buildPagination(
    voucherTotal,
    options.voucherPage ?? 1,
    SCHOOL_VOUCHER_PAGE_SIZE,
  );

  const [voucherRequests, schoolVouchers] = await Promise.all([
    prisma.voucherRequest.findMany({
      where: {
        schoolId: id,
      },
      select: schoolHistorySelect,
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      skip: (requestPagination.page - 1) * requestPagination.pageSize,
      take: requestPagination.pageSize,
    }),
    prisma.schoolVoucher.findMany({
      where: {
        schoolId: id,
      },
      select: schoolVoucherSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (voucherPagination.page - 1) * voucherPagination.pageSize,
      take: voucherPagination.pageSize,
    }),
  ]);

  return {
    school: mapDbSchool(schoolRecord),
    requests: voucherRequests.map(mapDbRequestHistory),
    pagination: requestPagination,
    vouchers: schoolVouchers.map(mapDbSchoolVoucher),
    voucherPagination,
  };
}

export async function getSchoolById(id: string, scope?: SafSchoolScope) {
  const schoolRecord = await getScopedSchoolRecord(id, scope);

  if (!schoolRecord) {
    return undefined;
  }

  return mapDbSchool(schoolRecord);
}

export async function searchPublicSchoolOptions(query: string) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [] satisfies PublicSchoolOption[];
  }

  const schools = await prisma.school.findMany({
    where: {
      schoolName: {
        contains: normalizedQuery,
      },
    },
    select: {
      id: true,
      schoolName: true,
      schoolEmail: true,
      city: true,
      state: true,
    },
    orderBy: [{ schoolName: "asc" }, { createdAt: "asc" }],
    take: 8,
  });

  return schools.map(
    (school): PublicSchoolOption => ({
      id: school.id,
      schoolName: school.schoolName,
      schoolEmail: school.schoolEmail ?? undefined,
      city: school.city ?? undefined,
      state: school.state ?? undefined,
    }),
  );
}

export async function createSchool(
  data: SchoolDraft,
  actor: AuditActorInput = buildSystemAuditActor("Cadastro interno de escola"),
) {
  await assertNoSchoolConflicts(data);

  const createdSchool = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: buildSchoolCreateData(data),
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "school_created",
        entityType: "school",
        entityId: school.id,
        schoolId: school.id,
        actor,
        summary: `Escola cadastrada: ${school.schoolName}.`,
        metadata: {
          externalSchoolId: school.externalSchoolId,
          schoolStatus: school.schoolStatus,
          cluster: school.cluster,
          safOwner: school.safOwner,
        },
      },
    });

    return school;
  });

  return mapDbSchool(createdSchool);
}

export async function updateSchool(
  id: string,
  data: SchoolDraft,
  scope?: SafSchoolScope,
  actor: AuditActorInput = buildSystemAuditActor("Atualização interna de escola"),
) {
  const existingSchool = await getScopedSchoolRecord(
    id,
    scope,
    "schools.update_operational",
  );

  if (!existingSchool) {
    return undefined;
  }

  await assertNoSchoolConflicts(data, { excludeId: id });

  const updatedSchool = await prisma.$transaction(async (tx) => {
    const school = await tx.school.update({
      where: { id },
      data: buildSchoolUpdateData(existingSchool, data),
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "school_updated",
        entityType: "school",
        entityId: school.id,
        schoolId: school.id,
        actor,
        summary: `Escola atualizada: ${school.schoolName}.`,
        metadata: {
          externalSchoolId: school.externalSchoolId,
          schoolStatus: school.schoolStatus,
          cluster: school.cluster,
          safOwner: school.safOwner,
        },
      },
    });

    return school;
  });

  if (scope) {
    logScopedMutation({
      scope,
      action:
        scope.role === "SAF_ADMIN"
          ? "schools.update_admin"
          : "schools.update_operational",
      entity: "School",
      entityId: updatedSchool.id,
      schoolId: updatedSchool.id,
    });
  }

  return mapDbSchool(updatedSchool);
}
