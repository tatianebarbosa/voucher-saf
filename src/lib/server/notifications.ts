import type { RequestStatus, RequestType } from "@/types/request";
import type { VoucherStatus, VoucherType } from "@/types/voucher";
import type { NotificationEventDraft } from "@/types/audit";
import {
  formatCampaignVoucherCondition,
  formatInstallmentPlan,
} from "@/lib/formatters";

function isVoucherAvailableStatus(status: VoucherStatus) {
  return status === "ativo" || status === "enviado";
}

export function buildRequestNotifications(input: {
  request: {
    id: string;
    schoolId?: string | null;
    schoolName: string;
    schoolEmail?: string | null;
    ticketNumber: string;
    status: RequestStatus;
    decisionReason?: string | null;
    requestType: RequestType;
    requesterName: string;
    requesterType: "responsavel" | "escola";
    discountPercentage?: number | null;
    installmentCount?: number | null;
    campaignVoucherCode?: string | null;
    splitInstruction?: string | null;
  };
  previousStatus?: RequestStatus;
}) {
  const notifications: NotificationEventDraft[] = [];
  const conditionLabel =
    input.request.requestType === "desconto"
      ? input.request.discountPercentage !== null &&
          input.request.discountPercentage !== undefined
        ? `${input.request.discountPercentage}% de desconto`
        : "Desconto"
      : input.request.requestType === "desmembramento"
        ? formatCampaignVoucherCondition(input.request.campaignVoucherCode)
      : input.request.installmentCount !== null &&
          input.request.installmentCount !== undefined
        ? formatInstallmentPlan(input.request.installmentCount)
        : "Parcelamento sem juros";

  if (
    input.request.status === "Pronta para envio" &&
    input.previousStatus !== "Pronta para envio"
  ) {
    notifications.push({
      notificationType: "request_approved",
      entityType: "request",
      entityId: input.request.id,
      schoolId: input.request.schoolId ?? undefined,
      recipientEmail: input.request.schoolEmail ?? undefined,
      summary: `Solicitação ${input.request.ticketNumber} pronta para envio para ${input.request.schoolName}.`,
      payload: {
        schoolName: input.request.schoolName,
        ticketNumber: input.request.ticketNumber,
        requestType: input.request.requestType,
        status: input.request.status,
        requesterName: input.request.requesterName,
        requesterType: input.request.requesterType,
        conditionLabel,
        decisionReason: input.request.decisionReason ?? undefined,
        discountPercentage: input.request.discountPercentage ?? undefined,
        installmentCount: input.request.installmentCount ?? undefined,
        campaignVoucherCode: input.request.campaignVoucherCode ?? undefined,
        splitInstruction: input.request.splitInstruction ?? undefined,
      },
    });
  }

  if (
    input.request.status === "Negada" &&
    input.previousStatus !== "Negada"
  ) {
    notifications.push({
      notificationType: "request_rejected",
      entityType: "request",
      entityId: input.request.id,
      schoolId: input.request.schoolId ?? undefined,
      recipientEmail: input.request.schoolEmail ?? undefined,
      summary: `Solicitação ${input.request.ticketNumber} negada para ${input.request.schoolName}.`,
      payload: {
        schoolName: input.request.schoolName,
        ticketNumber: input.request.ticketNumber,
        requestType: input.request.requestType,
        status: input.request.status,
        requesterName: input.request.requesterName,
        requesterType: input.request.requesterType,
        conditionLabel,
        decisionReason: input.request.decisionReason ?? undefined,
        discountPercentage: input.request.discountPercentage ?? undefined,
        installmentCount: input.request.installmentCount ?? undefined,
        campaignVoucherCode: input.request.campaignVoucherCode ?? undefined,
        splitInstruction: input.request.splitInstruction ?? undefined,
      },
    });
  }

  return notifications;
}

export function buildVoucherNotifications(input: {
  voucher: {
    id: string;
    schoolId?: string | null;
    schoolName: string;
    voucherType: VoucherType;
    campaignName: string;
    voucherCode: string;
    sentToEmail?: string | null;
    status: VoucherStatus;
    quantityAvailable: number;
    quantitySent: number;
    expiresAt?: string | null;
  };
  previousStatus?: VoucherStatus;
}) {
  const notifications: NotificationEventDraft[] = [];

  if (
    isVoucherAvailableStatus(input.voucher.status) &&
    input.previousStatus !== input.voucher.status
  ) {
    const notificationType =
      input.voucher.voucherType === "campanha"
        ? "campaign_available"
        : "voucher_available";

    notifications.push({
      notificationType,
      entityType: "voucher",
      entityId: input.voucher.id,
      schoolId: input.voucher.schoolId ?? undefined,
      recipientEmail: input.voucher.sentToEmail ?? undefined,
      summary:
        input.voucher.voucherType === "campanha"
          ? `Campanha ${input.voucher.campaignName} disponibilizada para ${input.voucher.schoolName}.`
          : `Voucher ${input.voucher.voucherCode} disponibilizado para ${input.voucher.schoolName}.`,
      payload: {
        schoolName: input.voucher.schoolName,
        campaignName: input.voucher.campaignName,
        voucherCode: input.voucher.voucherCode,
        status: input.voucher.status,
        voucherType: input.voucher.voucherType,
        quantityAvailable: input.voucher.quantityAvailable,
        quantitySent: input.voucher.quantitySent,
        expiresAt: input.voucher.expiresAt ?? undefined,
        sentToEmail: input.voucher.sentToEmail ?? undefined,
      },
    });
  }

  return notifications;
}
