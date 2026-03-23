import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "Defina DATABASE_URL."),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres."),
  SAF_ADMIN_EMAIL: z
    .string()
    .email("SAF_ADMIN_EMAIL deve ser um e-mail válido."),
  SAF_ADMIN_PASSWORD: z
    .string()
    .min(8, "SAF_ADMIN_PASSWORD deve ter pelo menos 8 caracteres."),
});

const parsedServerEnv = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SAF_ADMIN_EMAIL: process.env.SAF_ADMIN_EMAIL,
  SAF_ADMIN_PASSWORD: process.env.SAF_ADMIN_PASSWORD,
});

if (!parsedServerEnv.success) {
  console.error(
    "Configuracao de ambiente invalida:",
    parsedServerEnv.error.flatten().fieldErrors,
  );

  throw new Error(
    "Falha ao carregar variaveis de ambiente obrigatorias do servidor.",
  );
}

export const serverEnv = parsedServerEnv.data;
