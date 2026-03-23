import {
  listPendingNotificationEvents,
  markNotificationFailed,
  markNotificationSent,
  markNotificationSuppressed,
} from "@/lib/server/audit-log";
import { readMailRuntimeEnv } from "@/lib/server/mail-env";
import { createMailer } from "@/lib/server/mailer";
import { renderNotificationEmailTemplate } from "@/lib/server/notification-email-templates";

export interface NotificationQueueSummary {
  processed: number;
  sent: number;
  failed: number;
  suppressed: number;
  skipped: number;
  warnings: string[];
}

function buildFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message.slice(0, 500);
  }

  return "Falha desconhecida ao enviar o e-mail.";
}

export async function processPendingNotificationQueue(input?: { take?: number }) {
  const pendingEvents = await listPendingNotificationEvents({
    take: input?.take ?? 25,
  });

  const summary: NotificationQueueSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
    skipped: 0,
    warnings: [],
  };

  if (pendingEvents.length === 0) {
    return summary;
  }

  const mailEnv = readMailRuntimeEnv();
  let mailer: ReturnType<typeof createMailer> | null = null;

  for (const event of pendingEvents) {
    summary.processed += 1;

    if (event.recipientChannel !== "email") {
      await markNotificationSuppressed({
        id: event.id,
        reason: `Canal ${event.recipientChannel} ainda não suportado nesta etapa.`,
      });
      summary.suppressed += 1;
      summary.warnings.push(
        `Evento ${event.id} suprimido: canal ${event.recipientChannel} ainda não suportado.`,
      );
      continue;
    }

    if (!event.recipientEmail) {
      await markNotificationSuppressed({
        id: event.id,
        reason: "Evento sem recipientEmail para envio por e-mail.",
      });
      summary.suppressed += 1;
      summary.warnings.push(
        `Evento ${event.id} suprimido: destinatario de e-mail ausente.`,
      );
      continue;
    }

    const rendered = renderNotificationEmailTemplate(event, {
      appPublicUrl: mailEnv.APP_PUBLIC_URL,
    });

    if ("suppressionReason" in rendered) {
      const suppressionReason =
        rendered.suppressionReason ??
        "Evento sem template de notificacao configurado.";

      await markNotificationSuppressed({
        id: event.id,
        reason: suppressionReason,
      });
      summary.suppressed += 1;
      summary.warnings.push(
        `Evento ${event.id} suprimido: ${suppressionReason}`,
      );
      continue;
    }

    try {
      mailer ??= createMailer();

      const result = await mailer.send({
        to: event.recipientEmail,
        subject: rendered.template.subject,
        text: rendered.template.text,
        html: rendered.template.html,
      });

      await markNotificationSent({
        id: event.id,
        providerMessageId: result.messageId,
      });
      summary.sent += 1;
    } catch (error) {
      const failureMessage = buildFailureMessage(error);

      await markNotificationFailed({
        id: event.id,
        errorMessage: failureMessage,
      });
      summary.failed += 1;
      summary.warnings.push(`Evento ${event.id} falhou: ${failureMessage}`);
    }
  }

  return summary;
}
