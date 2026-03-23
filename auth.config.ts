import type { NextAuthConfig } from "next-auth";

import { getDefaultHomeForRole, isSafRole, isUserRole } from "@/lib/auth/roles";

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const userRole = auth?.user?.role;
      const hasActiveKnownRole =
        !!auth?.user && auth.user.isActive && isUserRole(userRole);
      const isSafRoute =
        nextUrl.pathname.startsWith("/painel-saf") ||
        nextUrl.pathname.startsWith("/escolas") ||
        nextUrl.pathname.startsWith("/solicitacoes");
      const isSafLoginRoute = nextUrl.pathname === "/login";

      if (isSafRoute) {
        if (hasActiveKnownRole && isSafRole(userRole)) {
          return true;
        }

        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set(
          "callbackUrl",
          `${nextUrl.pathname}${nextUrl.search}`,
        );

        return Response.redirect(loginUrl);
      }

      if (hasActiveKnownRole && userRole && isSafLoginRoute) {
        return Response.redirect(
          new URL(getDefaultHomeForRole(userRole), nextUrl),
        );
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
