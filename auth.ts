import { UserRole as PrismaUserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import authConfig from "@/auth.config";
import type { UserRole } from "@/lib/auth/roles";
import { isSafRole, isUserRole } from "@/lib/auth/roles";
import { verifyPassword, hashPassword } from "@/lib/security/password";
import { prisma } from "@/lib/server/db";
import { serverEnv } from "@/lib/server/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function mapDbRoleToAuthRole(role: PrismaUserRole): UserRole {
  if (!isUserRole(role) || !isSafRole(role)) {
    throw new Error(`Role de usuario nao suportada: ${role}`);
  }

  return role;
}

async function getBootstrapAdmin(email: string, password: string) {
  if (
    email !== serverEnv.SAF_ADMIN_EMAIL ||
    password !== serverEnv.SAF_ADMIN_PASSWORD
  ) {
    return null;
  }

  const passwordHash = await hashPassword(serverEnv.SAF_ADMIN_PASSWORD);

  return prisma.user.upsert({
    where: {
      email: serverEnv.SAF_ADMIN_EMAIL,
    },
    update: {
      name: "SAF Admin",
      passwordHash,
      role: PrismaUserRole.SAF_ADMIN,
      isActive: true,
    },
    create: {
      email: serverEnv.SAF_ADMIN_EMAIL,
      name: "SAF Admin",
      passwordHash,
      role: PrismaUserRole.SAF_ADMIN,
      isActive: true,
    },
  });
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: serverEnv.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
      }

      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string" &&
        isUserRole(token.role)
      ) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.isActive = token.isActive === true;
      }

      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "E-mail",
          type: "email",
        },
        password: {
          label: "Senha",
          type: "password",
        },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user =
          (await prisma.user.findUnique({
            where: {
              email,
            },
          })) ?? (await getBootstrapAdmin(email, password));

        if (!user || !user.isActive) {
          return null;
        }

        if (!isUserRole(user.role) || !isSafRole(user.role)) {
          return null;
        }

        const isPasswordValid = await verifyPassword(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: mapDbRoleToAuthRole(user.role),
          isActive: user.isActive,
        };
      },
    }),
  ],
});
