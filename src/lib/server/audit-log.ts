import {
  AuditActorType as PrismaAuditActorType,
  AuditEntityType as PrismaAuditEntityType,
  AuditEventType as PrismaAuditEventType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationDeliveryStatus as PrismaNotificationDeliveryStatus,
  NotificationEventType as PrismaNotificationEventType,
  UserRole as PrismaUserRole,
  type PrismaClient,
  type AuditLog as PrismaAuditLog,
  type NotificationEvent as PrismaNotificationEventRecord,
} from "@prisma/client";

import type { SafSchoolScope } from "@/lib/server/access-scope";
import { prisma } from "@/lib/server/db";
import type { UserRole } from "@/lib/auth/roles";
import type {
  AuditActorInput,
  AuditEvent,
  AuditEventDraft,
  AuditEntityType,
  AuditEventType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEvent,
  NotificationEventDraft,
  NotificationEventType,
  QueuedNotificationEvent,
} from "@/types/audit";

type EventStoreClient = Pick<PrismaClient, "auditLog" | "notificationEvent">;

const auditActorTypeToDb: Record<
  AuditActorInput["actorType"],
  PrismaAuditActorType
> = {
  user: PrismaAuditActorType.USER,
  public: PrismaAuditActorType.PUBLIC,
  system: PrismaAuditActorType.SYSTEM,
  script: PrismaAuditActorType.SCRIPT,
};

const auditActorTypeFromDb: Record<
  PrismaAuditActorType,
  AuditActorInput["actorType"]
> = {
  USER: "user",
  PUBLIC: "public",
  SYSTEM: "system",
  SCRIPT: "script",
};

const auditEntityTypeToDb: Record<AuditEntityType, PrismaAuditEntityType> = {
  request: PrismaAuditEntityType.REQUEST,
  school: PrismaAuditEntityType.SCHOOL,
  voucher: PrismaAuditEntityType.VOUCHER,
  import: PrismaAuditEntityType.IMPORT,
};

const auditEntityTypeFromDb: Record<PrismaAuditEntityType, AuditEntityType> = {
  REQUEST: "request",
  SCHOOL: "school",
  VOUCHER: "voucher",
  IMPORT: "import",
};

const auditEventTypeToDb: Record<AuditEventType, PrismaAuditEventType> = {
  request_created: PrismaAuditEventType.REQUEST_CREATED,
  request_status_changed: PrismaAuditEventType.REQUEST_STATUS_CHANGED,
  school_created: PrismaAuditEventType.SCHOOL_CREATED,
  school_updated: PrismaAuditEventType.SCHOOL_UPDATED,
  school_access_invited: PrismaAuditEventType.SCHOOL_ACCESS_INVITED,
  school_access_activated: PrismaAuditEventType.SCHOOL_ACCESS_ACTIVATED,
  school_password_reset_requested:
    PrismaAuditEventType.SCHOOL_PASSWORD_RESET_REQUESTED,
  school_password_reset_completed:
    PrismaAuditEventType.SCHOOL_PASSWORD_RESET_COMPLETED,
  voucher_created: PrismaAuditEventType.VOUCHER_CREATED,
  voucher_updated: PrismaAuditEventType.VOUCHER_UPDATED,
  voucher_available: PrismaAuditEventType.VOUCHER_AVAILABLE,
  campaign_available: PrismaAuditEventType.CAMPAIGN_AVAILABLE,
  import_executed: PrismaAuditEventType.IMPORT_EXECUTED,
};

const auditEventTypeFromDb: Record<PrismaAuditEventType, AuditEventType> = {
  REQUEST_CREATED: "request_created",
  REQUEST_STATUS_CHANGED: "request_status_changed",
  SCHOOL_CREATED: "school_created",
  SCHOOL_UPDATED: "school_updated",
  SCHOOL_ACCESS_INVITED: "school_access_invited",
  SCHOOL_ACCESS_ACTIVATED: "school_access_activated",
  SCHOOL_PASSWORD_RESET_REQUESTED: "school_password_reset_requested",
  SCHOOL_PASSWORD_RESET_COMPLETED: "school_password_reset_completed",
  VOUCHER_CREATED: "voucher_created",
  VOUCHER_UPDATED: "voucher_updated",
  VOUCHER_AVAILABLE: "voucher_available",
  CAMPAIGN_AVAILABLE: "campaign_available",
  IMPORT_EXECUTED: "import_executed",
};

const userRoleToDb: Record<UserRole, PrismaUserRole> = {
  SAF_ADMIN: PrismaUserRole.SAF_ADMIN,
  SAF_OPERADOR: PrismaUserRole.SAF_OPERADOR,
  SAF_LEITURA: PrismaUserRole.SAF_LEITURA,
};

function mapDbUserRole(role: PrismaUserRole | null): UserRole | undefined {
  switch (role) {
    case PrismaUserRole.SAF_ADMIN:
      return "SAF_ADMIN";
    case PrismaUserRole.SAF_OPERADOR:
      return "SAF_OPERADOR";
    case PrismaUserRole.SAF_LEITURA:
      return "SAF_LEITURA";
    default:
      return undefined;
  }
}

const notificationTypeToDb: Record<
  NotificationEventType,
  PrismaNotificationEventType
> = {
  request_approved: PrismaNotificationEventType.REQUEST_APPROVED,
  request_rejected: PrismaNotificationEventType.REQUEST_REJECTED,
  voucher_available: PrismaNotificationEventType.VOUCHER_AVAILABLE,
  campaign_available: PrismaNotificationEventType.CAMPAIGN_AVAILABLE,
  school_access_invitation:
    PrismaNotificationEventType.SCHOOL_ACCESS_INVITATION,
  school_password_reset: PrismaNotificationEventType.SCHOOL_PASSWORD_RESET,
};

const notificationTypeFromDb: Record<
  PrismaNotificationEventType,
  NotificationEventType
> = {
  REQUEST_APPROVED: "request_approved",
  REQUEST_REJECTED: "request_rejected",
  VOUCHER_AVAILABLE: "voucher_available",
  CAMPAIGN_AVAILABLE: "campaign_available",
  SCHOOL_ACCESS_INVITATION: "school_access_invitation",
  SCHOOL_PASSWORD_RESET: "school_password_reset",
};

const notificationChannelToDb: Record<
  NotificationChannel,
  PrismaNotificationChannel
> = {
  email: PrismaNotificationChannel.EMAIL,
  whatsapp: PrismaNotificationChannel.WHATSAPP,
  in_app: PrismaNotificationChannel.IN_APP,
};

const notificationChannelFromDb: Record<
  PrismaNotificationChannel,
  NotificationChannel
> = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  IN_APP: "in_app",
};

const notificationStatusToDb: Record<
  NotificationDeliveryStatus,
  PrismaNotificationDeliveryStatus
> = {
  pending: PrismaNotificationDeliveryStatus.PENDING,
  sent: PrismaNotificationDeliveryStatus.SENT,
  failed: PrismaNotificationDeliveryStatus.FAILED,
  suppressed: PrismaNotificationDeliveryStatus.SUPPRESSED,
};

const notificationStatusFromDb: Record<
  PrismaNotificationDeliveryStatus,
  NotificationDeliveryStatus
> = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  SUPPRESSED: "suppressed",
};

function serializePayload(payload?: Record<string, unknown>) {
  if (!payload || Object.keys(payload).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({
      serializationError: true,
    });
  }
}

function parsePayload(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {
      parseError: true,
      raw: value,
    } satisfies Record<string, unknown>;
  }
}

function mapDbAuditLog(record: PrismaAuditLog): AuditEvent {
  return {
    id: record.id,
    eventType: auditEventTypeFromDb[record.eventType],
    entityType: auditEntityTypeFromDb[record.entityType],
    entityId: record.entityId ?? undefined,
    schoolId: record.schoolId ?? undefined,
    actorType: auditActorTypeFromDb[record.actorType],
    actorUserId: record.actorUserId ?? undefined,
    actorRole: mapDbUserRole(record.actorRole),
    actorLabel: record.actorLabel,
    summary: record.summary,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapDbNotification(
  record: PrismaNotificationEventRecord,
): NotificationEvent {
  return {
    id: record.id,
    notificationType: notificationTypeFromDb[record.notificationType],
    entityType: auditEntityTypeFromDb[record.entityType],
    entityId: record.entityId ?? undefined,
    schoolId: record.schoolId ?? undefined,
    recipientChannel: notificationChannelFromDb[record.recipientChannel],
    recipientEmail: record.recipientEmail ?? undefined,
    status: notificationStatusFromDb[record.status],
    summary: record.summary,
    attemptCount: record.attemptCount,
    lastError: record.lastError ?? undefined,
    providerMessageId: record.providerMessageId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    processedAt: record.processedAt?.toISOString(),
  };
}

function mapDbQueuedNotification(
  record: PrismaNotificationEventRecord,
): QueuedNotificationEvent {
  return {
    ...mapDbNotification(record),
    payload: parsePayload(record.payloadJson),
  };
}

export function buildUserAuditActor(input: {
  userId: string;
  role: UserRole;
  email?: string | null;
  name?: string | null;
}): AuditActorInput {
  return {
    actorType: "user",
    actorUserId: input.userId,
    actorRole: input.role,
    actorLabel: input.email || input.name || input.userId,
  };
}

export function buildPublicAuditActor(label: string): AuditActorInput {
  return {
    actorType: "public",
    actorLabel: label,
  };
}

export function buildScriptAuditActor(label: string): AuditActorInput {
  return {
    actorType: "script",
    actorLabel: label,
  };
}

export function buildSystemAuditActor(label: string): AuditActorInput {
  return {
    actorType: "system",
    actorLabel: label,
  };
}

export async function createAuditLog(
  client: EventStoreClient,
  input: AuditEventDraft,
) {
  const record = await client.auditLog.create({
    data: {
      eventType: auditEventTypeToDb[input.eventType],
      entityType: auditEntityTypeToDb[input.entityType],
      entityId: input.entityId ?? null,
      schoolId: input.schoolId ?? null,
      actorType: auditActorTypeToDb[input.actor.actorType],
      actorUserId: input.actor.actorUserId ?? null,
      actorRole: input.actor.actorRole
        ? userRoleToDb[input.actor.actorRole]
        : null,
      actorLabel: input.actor.actorLabel,
      summary: input.summary,
      metadataJson: serializePayload(input.metadata),
    },
  });

  return mapDbAuditLog(record);
}

export async function queueNotificationEvent(
  client: EventStoreClient,
  input: NotificationEventDraft,
) {
  const record = await client.notificationEvent.create({
    data: {
      notificationType: notificationTypeToDb[input.notificationType],
      entityType: auditEntityTypeToDb[input.entityType],
      entityId: input.entityId ?? null,
      schoolId: input.schoolId ?? null,
      recipientChannel: notificationChannelToDb[input.recipientChannel ?? "email"],
      recipientEmail: input.recipientEmail ?? null,
      status: notificationStatusToDb[input.status ?? "pending"],
      summary: input.summary,
      payloadJson: serializePayload(input.payload),
    },
  });

  return mapDbNotification(record);
}

export async function recordOperationalEvent(
  client: EventStoreClient,
  input: {
    audit: AuditEventDraft;
    notifications?: NotificationEventDraft[];
  },
) {
  const audit = await createAuditLog(client, input.audit);

  if (input.notifications?.length) {
    for (const notification of input.notifications) {
      await queueNotificationEvent(client, notification);
    }
  }

  return audit;
}

export async function listAuditEventsByEntity(
  input: {
    entityType: AuditEntityType;
    entityId: string;
    take?: number;
  },
  scope?: SafSchoolScope,
) {
  const events = await prisma.auditLog.findMany({
    where: {
      entityType: auditEntityTypeToDb[input.entityType],
      entityId: input.entityId,
      ...(scope && !scope.isGlobal
        ? {
            schoolId: {
              in: scope.schoolIds.length > 0 ? scope.schoolIds : ["__NO_SCOPE__"],
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.take ?? 25,
  });

  return events.map(mapDbAuditLog);
}

export async function listPendingNotificationEvents(input?: { take?: number }) {
  const notifications = await prisma.notificationEvent.findMany({
    where: {
      status: PrismaNotificationDeliveryStatus.PENDING,
      recipientChannel: PrismaNotificationChannel.EMAIL,
    },
    orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }],
    take: input?.take ?? 25,
  });

  return notifications.map(mapDbQueuedNotification);
}

export async function markNotificationSent(input: {
  id: string;
  providerMessageId?: string;
}) {
  const record = await prisma.notificationEvent.update({
    where: { id: input.id },
    data: {
      status: PrismaNotificationDeliveryStatus.SENT,
      processedAt: new Date(),
      attemptCount: {
        increment: 1,
      },
      lastError: null,
      providerMessageId: input.providerMessageId ?? null,
    },
  });

  return mapDbNotification(record);
}

export async function markNotificationSuppressed(input: {
  id: string;
  reason: string;
}) {
  const record = await prisma.notificationEvent.update({
    where: { id: input.id },
    data: {
      status: PrismaNotificationDeliveryStatus.SUPPRESSED,
      processedAt: new Date(),
      attemptCount: {
        increment: 1,
      },
      lastError: input.reason,
      providerMessageId: null,
    },
  });

  return mapDbNotification(record);
}

export async function markNotificationFailed(input: {
  id: string;
  errorMessage: string;
}) {
  const record = await prisma.notificationEvent.update({
    where: { id: input.id },
    data: {
      status: PrismaNotificationDeliveryStatus.FAILED,
      processedAt: new Date(),
      attemptCount: {
        increment: 1,
      },
      lastError: input.errorMessage,
      providerMessageId: null,
    },
  });

  return mapDbNotification(record);
}

export async function recordImportExecution(
  client: EventStoreClient,
  input: {
    sourceLabel: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  return createAuditLog(client, {
    eventType: "import_executed",
    entityType: "import",
    entityId: input.sourceLabel,
    summary: input.summary,
    metadata: input.metadata,
    actor: buildScriptAuditActor(input.sourceLabel),
  });
}
