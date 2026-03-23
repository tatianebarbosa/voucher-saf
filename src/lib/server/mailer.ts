import nodemailer from "nodemailer";

import {
  readMailRuntimeEnv,
  type MailRuntimeEnv,
} from "@/lib/server/mail-env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailSendResult {
  messageId?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<MailSendResult>;
}

function buildFromField(env: MailRuntimeEnv) {
  if (env.MAIL_FROM_NAME) {
    return `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_EMAIL}>`;
  }

  return env.MAIL_FROM_EMAIL ?? "";
}

export function createMailer(): Mailer {
  const env = readMailRuntimeEnv();

  if (env.MAIL_PROVIDER !== "smtp") {
    throw new Error(
      "Envio de e-mail desabilitado. Configure MAIL_PROVIDER=smtp para processar a fila.",
    );
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  });

  return {
    async send(message) {
      const result = await transport.sendMail({
        from: buildFromField(env),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      return {
        messageId: result.messageId,
      };
    },
  };
}
