import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { isUserRole } from "@/lib/auth/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { RequestsProvider } from "@/providers/requests-provider";

import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voucher Maple Bear",
  description:
    "Sistema interno para solicitações, operação SAF e gestão da base de escolas do Voucher Maple Bear.",
  icons: {
    icon: "/brand/maple-bear-icon.png",
    shortcut: "/brand/maple-bear-icon.png",
    apple: "/brand/maple-bear-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userRole =
    session?.user && isUserRole(session.user.role) ? session.user.role : null;
  const isActive = session?.user?.isActive === true;

  return (
    <html lang="pt-BR">
      <body
        className={`${montserrat.variable} ${sourceSans.variable} antialiased`}
      >
        <AuthProvider
          isAuthenticated={Boolean(session?.user)}
          isActive={isActive}
          userEmail={session?.user?.email}
          userRole={userRole}
        >
          <RequestsProvider>
            <AppShell>{children}</AppShell>
          </RequestsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
