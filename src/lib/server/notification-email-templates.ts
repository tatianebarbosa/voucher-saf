import type { RequesterType } from "@/types/request";
import type { QueuedNotificationEvent } from "@/types/audit";
import type { VoucherType } from "@/types/voucher";

export interface NotificationEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

interface NotificationTemplateContext {
  appPublicUrl?: string;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildTrackingUrl(appPublicUrl: string | undefined, ticketNumber?: string) {
  if (!appPublicUrl || !ticketNumber) {
    return undefined;
  }

  return `${appPublicUrl}/acompanhar/detalhes?ticket=${encodeURIComponent(ticketNumber)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlDocument(
  title: string,
  paragraphs: string[],
  action?: { label: string; href: string },
) {
  const renderedParagraphs = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#21314f;line-height:1.7;font-size:15px;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const renderedAction = action
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#bf1f29;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">${escapeHtml(action.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e9f2;border-radius:14px;overflow:hidden;">
      <div style="padding:24px 28px;background:linear-gradient(90deg,#162744 0%,#bf1f29 100%);color:#ffffff;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.84;">Voucher Maple Bear</p>
        <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:28px;">
        ${renderedParagraphs}
        ${renderedAction}
      </div>
    </div>
  </body>
</html>`;
}

function formatRequesterType(value?: string) {
  if (value === "escola") {
    return "Escola";
  }

  return value === "responsavel" ? "Responsável" : undefined;
}

function formatRequestType(value?: string) {
  if (value === "parcelamento") {
    return "Parcelamento";
  }

  if (value === "desmembramento") {
    return "Desmembramento de voucher";
  }

  return value === "desconto" ? "Desconto" : undefined;
}

function formatVoucherType(value?: string) {
  if (value === "outro") {
    return "Voucher";
  }

  return value === "campanha" ? "Campanha" : undefined;
}

function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function renderRequestApprovedEmail(
  event: QueuedNotificationEvent,
  context: NotificationTemplateContext,
) {
  const payload = event.payload ?? {};
  const schoolName = asString(payload.schoolName) ?? "sua escola";
  const ticketNumber = asString(payload.ticketNumber);
  const requestType = formatRequestType(asString(payload.requestType));
  const requesterName = asString(payload.requesterName);
  const requesterType = formatRequesterType(
    asString(payload.requesterType) as RequesterType | undefined,
  );
  const conditionLabel = asString(payload.conditionLabel) ?? "Condição aprovada";
  const trackingUrl = buildTrackingUrl(context.appPublicUrl, ticketNumber);
  const subject = ticketNumber
    ? `Voucher Maple Bear | Código do atendimento ${ticketNumber} aprovado`
    : "Voucher Maple Bear | Solicitação aprovada";
  const paragraphs = [
    `A solicitação ${ticketNumber ? `de código do atendimento ${ticketNumber} ` : ""}da unidade ${schoolName} foi aprovada no fluxo do Voucher Maple Bear.`,
    `${requestType ? `${requestType} aprovado` : "Retorno aprovado"}: ${conditionLabel}.`,
    requesterName && requesterType
      ? `Solicitante: ${requesterName} (${requesterType}).`
      : "O retorno já está disponível para consulta da escola.",
    trackingUrl
      ? "Use o link abaixo para acompanhar a solicitação com o código do atendimento já preenchido."
      : "A escola pode acompanhar a solicitação na área pública usando o código do atendimento.",
  ];

  return {
    subject,
    text: `${subject}\n\n${paragraphs.join("\n\n")}${trackingUrl ? `\n\nConsultar código do atendimento: ${trackingUrl}` : ""}`,
    html: buildHtmlDocument(
      subject,
      paragraphs,
      trackingUrl
        ? {
            label: "Consultar código do atendimento",
            href: trackingUrl,
          }
        : undefined,
    ),
  } satisfies NotificationEmailTemplate;
}

function renderRequestRejectedEmail(
  event: QueuedNotificationEvent,
  context: NotificationTemplateContext,
) {
  const payload = event.payload ?? {};
  const schoolName = asString(payload.schoolName) ?? "sua escola";
  const ticketNumber = asString(payload.ticketNumber);
  const requestType = formatRequestType(asString(payload.requestType));
  const requesterName = asString(payload.requesterName);
  const requesterType = formatRequesterType(
    asString(payload.requesterType) as RequesterType | undefined,
  );
  const conditionLabel = asString(payload.conditionLabel) ?? "Condição analisada";
  const decisionReason = asString(payload.decisionReason) ?? "Motivo não informado.";
  const trackingUrl = buildTrackingUrl(context.appPublicUrl, ticketNumber);
  const subject = ticketNumber
    ? `Voucher Maple Bear | Código do atendimento ${ticketNumber} negado`
    : "Voucher Maple Bear | Solicitação negada";
  const paragraphs = [
    `A solicitação ${ticketNumber ? `de código do atendimento ${ticketNumber} ` : ""}da unidade ${schoolName} foi negada no fluxo do Voucher Maple Bear.`,
    `${requestType ? `${requestType} analisado` : "Retorno analisado"}: ${conditionLabel}.`,
    requesterName && requesterType
      ? `Solicitante: ${requesterName} (${requesterType}).`
      : "O retorno já está disponível para consulta da escola.",
    `Motivo informado pelo SAF: ${decisionReason}`,
    trackingUrl
      ? "Use o link abaixo para acompanhar a solicitação com o código do atendimento já preenchido."
      : "A escola pode acompanhar a solicitação na área pública usando o código do atendimento.",
  ];

  return {
    subject,
    text: `${subject}\n\n${paragraphs.join("\n\n")}${trackingUrl ? `\n\nConsultar código do atendimento: ${trackingUrl}` : ""}`,
    html: buildHtmlDocument(
      subject,
      paragraphs,
      trackingUrl
        ? {
            label: "Consultar código do atendimento",
            href: trackingUrl,
          }
        : undefined,
    ),
  } satisfies NotificationEmailTemplate;
}

function renderVoucherAvailabilityEmail(
  event: QueuedNotificationEvent,
  context: NotificationTemplateContext,
) {
  void context;
  const payload = event.payload ?? {};
  const schoolName = asString(payload.schoolName) ?? "sua escola";
  const campaignName = asString(payload.campaignName) ?? "Campanha";
  const voucherType =
    formatVoucherType(asString(payload.voucherType) as VoucherType | undefined) ??
    "Voucher";
  const quantityAvailable = asNumber(payload.quantityAvailable);
  const quantitySent = asNumber(payload.quantitySent);
  const expiresAt = formatDate(asString(payload.expiresAt));
  const isCampaign = event.notificationType === "campaign_available";
  const subject = isCampaign
    ? `Voucher Maple Bear | Campanha disponibilizada para ${schoolName}`
    : `Voucher Maple Bear | Voucher disponibilizado para ${schoolName}`;
  const quantitySummary =
    quantityAvailable !== undefined
      ? `${quantityAvailable} disponibilizado(s)${
          quantitySent !== undefined ? ` e ${quantitySent} enviado(s)` : ""
        }.`
      : "Quantidade disponível registrada na base interna.";
  const paragraphs = [
    `${voucherType} ${isCampaign ? "da campanha" : ""} ${campaignName} está disponível para a unidade ${schoolName}.`,
    quantitySummary,
    expiresAt
      ? `Validade registrada: ${expiresAt}.`
      : "A validade pode ser confirmada diretamente com o time SAF.",
    "Caso precise de orientacoes adicionais sobre uso ou distribuicao, entre em contato com o time SAF.",
  ];

  return {
    subject,
    text: `${subject}\n\n${paragraphs.join("\n\n")}`,
    html: buildHtmlDocument(subject, paragraphs),
  } satisfies NotificationEmailTemplate;
}

export function renderNotificationEmailTemplate(
  event: QueuedNotificationEvent,
  context: NotificationTemplateContext,
) {
  switch (event.notificationType) {
    case "request_approved":
      return {
        template: renderRequestApprovedEmail(event, context),
      } as const;
    case "request_rejected":
      return {
        template: renderRequestRejectedEmail(event, context),
      } as const;
    case "voucher_available":
    case "campaign_available":
      return {
        template: renderVoucherAvailabilityEmail(event, context),
      } as const;
    case "school_access_invitation":
    case "school_password_reset":
      return {
        suppressionReason:
          "Fluxo de autenticacao da escola descontinuado. Notificacao suprimida.",
      } as const;
    default:
      return {
        suppressionReason: "Tipo de notificacao sem template de e-mail configurado.",
      } as const;
  }
}
