import {
  RequestStatus as PrismaRequestStatus,
  RequestType as PrismaRequestType,
  RequesterType as PrismaRequesterType,
  type Prisma,
  type VoucherRequest as PrismaVoucherRequest,
} from "@prisma/client";

import { attachGeneratedTexts } from "@/lib/generate-request";
import {
  formatCampaignVoucherCondition,
  formatInstallmentPlan,
} from "@/lib/formatters";
import {
  parseRequestFamilyGroups,
  serializeRequestFamilyGroups,
} from "@/lib/request-family-groups";
import {
  buildPublicAuditActor,
  buildSystemAuditActor,
  recordOperationalEvent,
} from "@/lib/server/audit-log";
import type { SafSchoolScope } from "@/lib/server/access-scope";
import {
  assertSchoolInScope,
  buildRequestScopeWhere,
  logScopedMutation,
} from "@/lib/server/access-scope";
import { prisma } from "@/lib/server/db";
import { buildRequestNotifications } from "@/lib/server/notifications";
import type { AuditActorInput } from "@/types/audit";
import type {
  RequestDraft,
  PublicRequestTracking,
  RequesterType,
  RequestStatus,
  RequestType,
  StoredVoucherRequest,
  VoucherRequest,
} from "@/types/request";

export class RequestSchoolNotFoundError extends Error {
  constructor() {
    super(
      "A escola selecionada não está disponível na base atual. Escolha uma escola válida para continuar.",
    );
    this.name = "RequestSchoolNotFoundError";
  }
}

const statusToDb: Record<RequestStatus, PrismaRequestStatus> = {
  Recebida: PrismaRequestStatus.RECEBIDA,
  "Em analise": PrismaRequestStatus.EM_ANALISE,
  "Pronta para envio": PrismaRequestStatus.PRONTA_PARA_ENVIO,
  Negada: PrismaRequestStatus.NEGADA,
};

const statusFromDb: Record<PrismaRequestStatus, RequestStatus> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em analise",
  PRONTA_PARA_ENVIO: "Pronta para envio",
  NEGADA: "Negada",
};

const typeToDb: Record<RequestType, PrismaRequestType> = {
  desconto: PrismaRequestType.DESCONTO,
  parcelamento: PrismaRequestType.PARCELAMENTO,
  desmembramento: PrismaRequestType.DESMEMBRAMENTO,
};

const typeFromDb: Record<PrismaRequestType, RequestType> = {
  DESCONTO: "desconto",
  PARCELAMENTO: "parcelamento",
  DESMEMBRAMENTO: "desmembramento",
};

const requesterTypeToDb: Record<RequesterType, PrismaRequesterType> = {
  responsavel: PrismaRequesterType.RESPONSAVEL,
  escola: PrismaRequesterType.ESCOLA,
};

const requesterTypeFromDb: Record<PrismaRequesterType, RequesterType> = {
  RESPONSAVEL: "responsavel",
  ESCOLA: "escola",
};

async function generateNextRequestTicketNumber(tx: Prisma.TransactionClient) {
  const existingTickets = await tx.voucherRequest.findMany({
    select: {
      ticketNumber: true,
    },
  });

  const nextSequence =
    existingTickets.reduce((highestValue, request) => {
      const match = /^TK-(\d+)$/i.exec(request.ticketNumber.trim());

      if (!match) {
        return highestValue;
      }

      const parsedValue = Number(match[1]);

      if (Number.isNaN(parsedValue)) {
        return highestValue;
      }

      return Math.max(highestValue, parsedValue);
    }, 0) + 1;

  return `TK-${String(nextSequence).padStart(5, "0")}`;
}

const publicTrackingSelect = {
  schoolName: true,
  ticketNumber: true,
  createdAt: true,
  status: true,
  decisionReason: true,
  requestType: true,
  requesterType: true,
  discountPercentage: true,
  installmentCount: true,
} satisfies Prisma.VoucherRequestSelect;

type PublicTrackingRecord = Prisma.VoucherRequestGetPayload<{
  select: typeof publicTrackingSelect;
}>;

function mapDbRequest(record: PrismaVoucherRequest): VoucherRequest {
  const familyGroups = parseRequestFamilyGroups(record.familyGroupsJson);
  const storedRequest: StoredVoucherRequest = {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    status: statusFromDb[record.status],
    decisionReason: record.decisionReason ?? undefined,
    schoolId: record.schoolId ?? undefined,
    schoolName: record.schoolName,
    schoolExternalId: record.schoolExternalId ?? undefined,
    schoolEmail: record.schoolEmail ?? undefined,
    ticketNumber: record.ticketNumber,
    requesterType: requesterTypeFromDb[record.requesterType],
    requesterName: record.requesterName,
    origin: record.origin,
    justification: record.justification,
    familyGroups,
    studentNames: record.studentNames ?? "",
    studentClassName: record.studentClassName ?? "",
    requestType: typeFromDb[record.requestType],
    responsible1Name: record.responsible1Name,
    responsible1Cpf: record.responsible1Cpf,
    responsible2Name: record.responsible2Name,
    responsible2Cpf: record.responsible2Cpf,
    discountPercentage: record.discountPercentage ?? undefined,
    installmentCount: record.installmentCount ?? undefined,
    campaignVoucherCode: record.campaignVoucherCode ?? undefined,
    splitInstruction: record.splitInstruction ?? undefined,
  };

  return attachGeneratedTexts(storedRequest);
}

function buildScopedRequestWhere(
  scope?: SafSchoolScope,
): Prisma.VoucherRequestWhereInput | undefined {
  return scope ? buildRequestScopeWhere(scope) : undefined;
}

function buildRequestConditionSummary(data: {
  requestType: RequestType;
  discountPercentage?: number;
  installmentCount?: number;
  campaignVoucherCode?: string;
}) {
  if (data.requestType === "desconto") {
    return data.discountPercentage !== undefined
      ? `${data.discountPercentage}% de desconto`
      : "desconto";
  }

  if (data.requestType === "desmembramento") {
    return formatCampaignVoucherCondition(data.campaignVoucherCode);
  }

  return data.installmentCount !== undefined
    ? formatInstallmentPlan(data.installmentCount)
    : "Parcelamento sem juros";
}

function buildPublicConditionLabel(record: PublicTrackingRecord) {
  if (record.requestType === PrismaRequestType.DESCONTO) {
    return record.discountPercentage !== null
      ? `${record.discountPercentage}% de desconto`
      : "Desconto em definicao";
  }

  if (record.requestType === PrismaRequestType.DESMEMBRAMENTO) {
    return record.status === PrismaRequestStatus.PRONTA_PARA_ENVIO
      ? "Desmembramento aprovado"
      : "Desmembramento solicitado";
  }

  return record.installmentCount !== null
    ? formatInstallmentPlan(record.installmentCount)
    : "Parcelamento sem juros";
}

function buildPublicOutcomeLabel(record: PublicTrackingRecord) {
  if (record.status === PrismaRequestStatus.PRONTA_PARA_ENVIO) {
    return "Solicitação aprovada";
  }

  if (record.status === PrismaRequestStatus.NEGADA) {
    return "Solicitação negada";
  }

  if (record.status === PrismaRequestStatus.EM_ANALISE) {
    return "Solicitação em análise";
  }

  return "Solicitação recebida";
}

function buildPublicValidityLabel(record: PublicTrackingRecord) {
  if (record.status === PrismaRequestStatus.NEGADA) {
    return "Não se aplica";
  }

  if (record.status !== PrismaRequestStatus.PRONTA_PARA_ENVIO) {
    return undefined;
  }

  return record.requestType === PrismaRequestType.DESCONTO
    ? "15 dias corridos após a aprovação"
    : record.requestType === PrismaRequestType.DESMEMBRAMENTO
      ? "Conforme orientacao do SAF para o voucher de origem"
      : "10 dias corridos após a aprovação";
}

function buildPublicSchoolFacingMessage(record: PublicTrackingRecord) {
  if (record.status === PrismaRequestStatus.PRONTA_PARA_ENVIO) {
    if (record.requestType === PrismaRequestType.DESMEMBRAMENTO) {
      return "Sua solicitação foi aprovada. O desmembramento solicitado pode ser acompanhado por este protocolo.";
    }

    return "Sua solicitação foi aprovada. A condição liberada para este atendimento já está disponível abaixo.";
  }

  if (record.status === PrismaRequestStatus.NEGADA) {
    const decisionReason = record.decisionReason?.trim();

    if (decisionReason) {
      return `Sua solicitação foi negada. Motivo informado pelo SAF: ${decisionReason}`;
    }

    return "Sua solicitação foi negada pelo time SAF.";
  }

  if (record.status === PrismaRequestStatus.EM_ANALISE) {
    return "Sua solicitação está em análise pelo time SAF. Assim que houver atualização, este acompanhamento público será atualizado.";
  }

  return "Sua solicitação foi recebida com sucesso e entrou na fila de análise do SAF.";
}

function mapDbPublicTracking(
  record: PublicTrackingRecord,
): PublicRequestTracking {
  return {
    schoolName: record.schoolName,
    ticketNumber: record.ticketNumber,
    createdAt: record.createdAt.toISOString(),
    requestType: typeFromDb[record.requestType],
    requesterType: requesterTypeFromDb[record.requesterType],
    status: statusFromDb[record.status],
    outcomeLabel: buildPublicOutcomeLabel(record),
    conditionLabel: buildPublicConditionLabel(record),
    schoolFacingMessage: buildPublicSchoolFacingMessage(record),
    validityLabel: buildPublicValidityLabel(record),
  };
}

async function getScopedRequestRecord(
  id: string,
  scope?: SafSchoolScope,
  action = "requests.read",
) {
  const request = await prisma.voucherRequest.findUnique({
    where: { id },
  });

  if (!request) {
    return undefined;
  }

  if (scope) {
    assertSchoolInScope(scope, request.schoolId, {
      action,
      entity: "VoucherRequest",
      entityId: request.id,
    });
  }

  return request;
}

export async function listRequests(scope?: SafSchoolScope) {
  const requests = await prisma.voucherRequest.findMany({
    where: buildScopedRequestWhere(scope),
    orderBy: {
      updatedAt: "desc",
    },
  });

  return requests.map(mapDbRequest);
}

export async function getRequestById(id: string, scope?: SafSchoolScope) {
  const request = await getScopedRequestRecord(id, scope);

  if (!request) {
    return undefined;
  }

  return mapDbRequest(request);
}

export async function getPublicRequestTrackingByTicketNumber(
  ticketNumber: string,
) {
  const normalizedTicketNumber = ticketNumber.trim();
  const ticketCandidates = Array.from(
    new Set([
      normalizedTicketNumber,
      normalizedTicketNumber.toUpperCase(),
      normalizedTicketNumber.toLowerCase(),
    ]),
  );

  const request = await prisma.voucherRequest.findFirst({
    where: {
      OR: ticketCandidates.map((candidate) => ({
        ticketNumber: candidate,
      })),
    },
    select: publicTrackingSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!request) {
    return undefined;
  }

  return mapDbPublicTracking(request);
}

export async function createRequest(
  data: RequestDraft,
  actor: AuditActorInput = buildPublicAuditActor("Formulário público da escola"),
) {
  if (!data.schoolId) {
    throw new RequestSchoolNotFoundError();
  }

  const school = await prisma.school.findUnique({
    where: { id: data.schoolId },
    select: {
      id: true,
      schoolName: true,
      externalSchoolId: true,
      schoolEmail: true,
    },
  });

  if (!school) {
    throw new RequestSchoolNotFoundError();
  }

  const request = await prisma.$transaction(async (tx) => {
    const nextTicketNumber =
      data.ticketNumber?.trim() || (await generateNextRequestTicketNumber(tx));

    const createdRequest = await tx.voucherRequest.create({
      data: {
        status: PrismaRequestStatus.RECEBIDA,
        schoolId: school.id,
        schoolName: school.schoolName,
        schoolExternalId: school.externalSchoolId,
        schoolEmail: school.schoolEmail,
        ticketNumber: nextTicketNumber,
        requesterType: requesterTypeToDb[data.requesterType],
        requesterName: data.requesterName,
        origin: data.origin,
        justification: data.justification,
        familyGroupsJson: serializeRequestFamilyGroups(data.familyGroups),
        studentNames: data.studentNames,
        studentClassName: data.studentClassName,
        requestType: typeToDb[data.requestType],
        responsible1Name: data.responsible1Name,
        responsible1Cpf: data.responsible1Cpf,
        responsible2Name: data.responsible2Name,
        responsible2Cpf: data.responsible2Cpf,
        discountPercentage: data.discountPercentage,
        installmentCount: data.installmentCount,
        campaignVoucherCode: data.campaignVoucherCode,
        splitInstruction: data.splitInstruction,
      },
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "request_created",
        entityType: "request",
        entityId: createdRequest.id,
        schoolId: createdRequest.schoolId ?? undefined,
        actor,
        summary: `Solicitação ${createdRequest.ticketNumber} criada para ${createdRequest.schoolName} com ${buildRequestConditionSummary(data)}.`,
        metadata: {
          ticketNumber: createdRequest.ticketNumber,
          requestType: data.requestType,
          requesterType: data.requesterType,
          requesterName: data.requesterName,
          origin: data.origin,
          status: "Recebida",
          campaignVoucherCode: data.campaignVoucherCode,
        },
      },
    });

    return createdRequest;
  });

  return mapDbRequest(request);
}

export async function updateRequestStatus(
  id: string,
  input: {
    status: RequestStatus;
    decisionReason?: string;
  },
  scope?: SafSchoolScope,
  actor: AuditActorInput = buildSystemAuditActor("Atualização interna de status"),
) {
  const normalizedDecisionReason = input.decisionReason?.trim() || undefined;
  const currentRequest = await getScopedRequestRecord(
    id,
    scope,
    "requests.update_status",
  );

  if (!currentRequest) {
    return undefined;
  }

  const nextStatus = input.status;
  const nextDecisionReason =
    nextStatus === "Pronta para envio" || nextStatus === "Negada"
      ? normalizedDecisionReason
      : undefined;
  const isDecisionReasonOnlyUpdate =
    currentRequest.status === statusToDb[nextStatus] &&
    (currentRequest.decisionReason ?? undefined) !== nextDecisionReason;

  if (
    currentRequest.status === statusToDb[nextStatus] &&
    (currentRequest.decisionReason ?? undefined) === nextDecisionReason
  ) {
    return mapDbRequest(currentRequest);
  }

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const nextRequest = await tx.voucherRequest.update({
      where: { id },
      data: {
        status: statusToDb[nextStatus],
        decisionReason: nextDecisionReason ?? null,
      },
    });

    await recordOperationalEvent(tx, {
      audit: {
        eventType: "request_status_changed",
        entityType: "request",
        entityId: nextRequest.id,
        schoolId: nextRequest.schoolId ?? undefined,
        actor,
        summary: isDecisionReasonOnlyUpdate
          ? `Motivo da decisão da solicitação ${nextRequest.ticketNumber} atualizado.${nextDecisionReason ? ` Motivo: ${nextDecisionReason}` : ""}`
          : `Status da solicitação ${nextRequest.ticketNumber} alterado de ${statusFromDb[currentRequest.status]} para ${nextStatus}.${nextDecisionReason ? ` Motivo: ${nextDecisionReason}` : ""}`,
        metadata: {
          ticketNumber: nextRequest.ticketNumber,
          previousStatus: statusFromDb[currentRequest.status],
          nextStatus,
          decisionReason: nextDecisionReason,
          requestType: typeFromDb[nextRequest.requestType],
        },
      },
      notifications: buildRequestNotifications({
        request: {
          id: nextRequest.id,
          schoolId: nextRequest.schoolId,
          schoolName: nextRequest.schoolName,
          schoolEmail: nextRequest.schoolEmail,
          ticketNumber: nextRequest.ticketNumber,
          status: nextStatus,
          decisionReason: nextDecisionReason,
          requestType: typeFromDb[nextRequest.requestType],
          requesterName: nextRequest.requesterName,
          requesterType: requesterTypeFromDb[nextRequest.requesterType],
          discountPercentage: nextRequest.discountPercentage,
          installmentCount: nextRequest.installmentCount,
          campaignVoucherCode: nextRequest.campaignVoucherCode,
          splitInstruction: nextRequest.splitInstruction,
        },
        previousStatus: statusFromDb[currentRequest.status],
      }),
    });

    return nextRequest;
  });

  if (scope) {
    logScopedMutation({
      scope,
      action: "requests.update_status",
      entity: "VoucherRequest",
      entityId: updatedRequest.id,
      schoolId: updatedRequest.schoolId,
    });
  }

  return mapDbRequest(updatedRequest);
}

