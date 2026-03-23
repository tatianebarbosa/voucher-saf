import { z } from "zod";

const mailProviderSchema = z.enum(["disabled", "smtp"]);

const mailRuntimeEnvSchema = z
  .object({
    APP_PUBLIC_URL: z.string().trim().url().optional(),
    MAIL_PROVIDER: mailProviderSchema.default("disabled"),
    MAIL_FROM_NAME: z.string().trim().min(1).default("Voucher Maple Bear"),
    MAIL_FROM_EMAIL: z.string().trim().email().optional(),
    SMTP_HOST: z.string().trim().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_USER: z.string().trim().min(1).optional(),
    SMTP_PASSWORD: z.string().trim().min(1).optional(),
  })
  .superRefine((data, context) => {
    if (data.MAIL_PROVIDER !== "smtp") {
      return;
    }

    if (!data.MAIL_FROM_EMAIL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MAIL_FROM_EMAIL"],
        message: "Defina MAIL_FROM_EMAIL para envio real por e-mail.",
      });
    }

    if (!data.SMTP_HOST) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "Defina SMTP_HOST para envio real por e-mail.",
      });
    }

    if (!data.SMTP_PORT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_PORT"],
        message: "Defina SMTP_PORT para envio real por e-mail.",
      });
    }

    if ((data.SMTP_USER && !data.SMTP_PASSWORD) || (!data.SMTP_USER && data.SMTP_PASSWORD)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_USER"],
        message:
          "Defina SMTP_USER e SMTP_PASSWORD juntos quando o servidor exigir autenticacao.",
      });
    }
  });

export type MailRuntimeEnv = z.infer<typeof mailRuntimeEnvSchema>;

export function readMailRuntimeEnv() {
  return mailRuntimeEnvSchema.parse({
    APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
    MAIL_PROVIDER: process.env.MAIL_PROVIDER ?? "disabled",
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME ?? "Voucher Maple Bear",
    MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE ?? "false",
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  });
}
