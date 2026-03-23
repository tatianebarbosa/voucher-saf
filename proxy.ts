import NextAuth from "next-auth";

import authConfig from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/painel-saf/:path*", "/escolas/:path*", "/solicitacoes/:path*", "/login"],
};
