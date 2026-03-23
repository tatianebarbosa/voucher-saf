import type { UserRole } from "@/lib/auth/roles";

export const AUDIT_ENTITY_TYPE_VALUES = [
  "request",
  "school",
  "voucher",
  "import",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE_VALUES)[number];

export const AUDIT_ACTOR_TYPE_VALUES = [
  "user",
  "public",
  "system",
  "script",
] as const;

export type AuditActorType = (typeof AUDIT_ACTOR_TYPE_VALUES)[number];

export const AUDIT_EVENT_TYPE_VALUES = [
  "request_created",
  "request_status_changed",
  "school_created",
  "school_updated",
  "school_access_invited",
  "school_access_activated",
  "school_password_reset_requested",
  "school_password_reset_completed",
  "voucher_created",
  "voucher_updated",
  "voucher_available",
  "campaign_available",
  "import_executed",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPE_VALUES)[number];

export const NOTIFICATION_EVENT_TYPE_VALUES = [
  "request_approved",
  "request_rejected",
  "voucher_available",
  "campaign_available",
  "school_access_invitation",
  "school_password_reset",
] as const;

export type NotificationEventType =
  (typeof NOTIFICATION_EVENT_TYPE_VALUES)[number];

export const NOTIFICATION_CHANNEL_VALUES = [
  "email",
  "whatsapp",
  "in_app",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number];

export const NOTIFICATION_DELIVERY_STATUS_VALUES = [
  "pending",
  "sent",
  "failed",
  "suppressed",
] as const;

export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUS_VALUES)[number];

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId?: string;
  schoolId?: string;
  actorType: AuditActorType;
  actorUserId?: string;
  actorRole?: UserRole;
  actorLabel: string;
  summary: string;
  createdAt: string;
}

export interface AuditActorInput {
  actorType: AuditActorType;
  actorUserId?: string;
  actorRole?: UserRole;
  actorLabel: string;
}

export interface AuditEventDraft {
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId?: string;
  schoolId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  actor: AuditActorInput;
}

export interface NotificationEvent {
  id: string;
  notificationType: NotificationEventType;
  entityType: AuditEntityType;
  entityId?: string;
  schoolId?: string;
  recipientChannel: NotificationChannel;
  recipientEmail?: string;
  status: NotificationDeliveryStatus;
  summary: string;
  attemptCount: number;
  lastError?: string;
  providerMessageId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface QueuedNotificationEvent extends NotificationEvent {
  payload?: Record<string, unknown>;
}

export interface NotificationEventDraft {
  notificationType: NotificationEventType;
  entityType: AuditEntityType;
  entityId?: string;
  schoolId?: string;
  recipientChannel?: NotificationChannel;
  recipientEmail?: string;
  status?: NotificationDeliveryStatus;
  summary: string;
  payload?: Record<string, unknown>;
}
