import { PrismaClient } from "@prisma/client";

import { serverEnv } from "@/lib/server/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Keep DATABASE_URL as the runtime input. When the project migrates from
    // SQLite to Postgres, the Prisma provider and this URL can change without
    // rewriting the application data layer.
    datasources: {
      db: {
        url: serverEnv.DATABASE_URL,
      },
    },
    log: serverEnv.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
