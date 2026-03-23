"use client";

import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { useAuthSession } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, userEmail, userRole, userRoleLabel } =
    useAuthSession();
  const isLoginRoute = pathname.startsWith("/login");
  const contentWrapperClassName = cn(
    "[--page-gutter:1.5rem] sm:[--page-gutter:2rem] md:[--page-gutter:4rem] lg:[--page-gutter:6rem] xl:[--page-gutter:8rem] 2xl:[--page-gutter:10rem] px-[var(--page-gutter)]",
    isLoginRoute ? "py-4 md:py-6" : "py-5",
  );

  return (
    <div className="min-h-screen">
      {!isLoginRoute ? (
        <SiteHeader
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          userRole={userRole}
          userRoleLabel={userRoleLabel}
        />
      ) : null}

      <div className={contentWrapperClassName}>
        <main
          className={cn(
            "mx-auto max-w-[1320px]",
            isLoginRoute ? "min-h-screen" : "min-h-[calc(100vh-96px)]",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
