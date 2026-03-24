"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronDown,
  LogOut,
  Search,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";

import { logout } from "@/lib/server/auth-actions";
import { isSafViewerRole, type UserRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  isAuthenticated: boolean;
  userRole?: UserRole | null;
  userRoleLabel?: string | null;
}

type HeaderDropdownKey = "account" | "internal" | "login";

interface HeaderNavigationItem {
  href: string;
  label: string;
  description: string;
  icon?: LucideIcon;
  navLabel?: string;
}

const publicNavigation: HeaderNavigationItem[] = [
  {
    href: "/solicitacao",
    label: "Solicitação da Escola",
    navLabel: "Solicitação",
    description: "Formulário público para registro de casos.",
    icon: Building2,
  },
  {
    href: "/acompanhar",
    label: "Acompanhar Atendimento",
    navLabel: "Acompanhamento",
    description: "Consulta pública por código do atendimento.",
    icon: Search,
  },
];

const loginNavigation: HeaderNavigationItem[] = [
  {
    href: "/login",
    label: "Login SAF",
    description: "Acesso interno para operação e manutenção da base.",
  },
];

const internalNavigation = [
  {
    href: "/painel-saf",
    label: "Painel de vouchers",
    description: "",
    viewerDescription: "",
  },
  {
    href: "/escolas",
    label: "Escolas",
    description: "",
    viewerDescription: "",
  },
];

function HeaderMenuItem({
  href,
  label,
  description,
  icon: Icon,
  isActive,
  onSelect,
}: HeaderNavigationItem & {
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "block w-full rounded-[var(--radius-lg)] px-3.5 transition outline-none focus-visible:ring-4 focus-visible:ring-red-100",
        "py-3.5",
        isActive
          ? "bg-[var(--color-primary)] text-white shadow-[0_20px_38px_-28px_rgba(191,31,41,0.95)]"
          : "hover:bg-[var(--color-surface-muted)]",
      )}
    >
      <span className={cn("flex w-full gap-3", description ? "items-start" : "items-center")}>
        {Icon ? (
          <span
            className={cn(
              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
              isActive
                ? "border-white/20 bg-white/12 text-white"
                : "border-[var(--color-border)] bg-white text-[var(--color-primary)]",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}

        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          {description ? (
            <span
              className={cn(
                "mt-1 block text-sm leading-6",
                isActive ? "text-white/82" : "text-[var(--color-muted-foreground)]",
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({
  isAuthenticated,
  userRole,
  userRoleLabel,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<HeaderDropdownKey | null>(
    null,
  );

  const isInternalArea = internalNavigation.some((item) =>
    pathname.startsWith(item.href),
  );
  const isLoginArea = pathname.startsWith("/login");
  const isViewerUser = userRole ? isSafViewerRole(userRole) : false;
  const internalAreaLabel = isViewerUser ? "Central" : "Operação";
  const navigationItems = internalNavigation.map((item) => ({
    ...item,
    description: isViewerUser ? item.viewerDescription : item.description,
  }));

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest("[data-header-dropdown-root='true']")) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    if (!openDropdown) {
      return;
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown]);

  function isDropdownOpen(dropdown: HeaderDropdownKey) {
    return openDropdown === dropdown;
  }

  function toggleDropdown(dropdown: HeaderDropdownKey) {
    setOpenDropdown((current) => (current === dropdown ? null : dropdown));
  }

  function closeDropdowns() {
    setOpenDropdown(null);
  }

  const triggerClassName =
    "inline-flex h-11 w-full items-center justify-between gap-2 border-0 bg-transparent px-3.5 text-left text-[14px] font-semibold shadow-none transition outline-none appearance-none focus-visible:ring-4 focus-visible:ring-red-100";
  const navTriggerClassName =
    "inline-flex h-11 items-center gap-2 border-0 bg-transparent px-3.5 text-[14px] font-semibold shadow-none transition outline-none appearance-none focus-visible:ring-4 focus-visible:ring-red-100";
  const panelClassName =
    "mt-2 flex flex-col gap-1.5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-2.5 shadow-[0_28px_44px_-32px_rgba(18,32,57,0.28)] lg:absolute lg:right-0 lg:mt-3";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-xl">
      <div className="w-full bg-white px-4 py-2 shadow-[0_18px_36px_-34px_rgba(18,32,57,0.42)] md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8">
          <Link
            href="/solicitacao"
            className="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-lg)] outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            onClick={closeDropdowns}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11 lg:h-12 lg:w-12">
              <Image
                src="/brand/saf-logo.png"
                alt="Logo do SAF"
                width={320}
                height={140}
                className="h-auto w-[30px] object-contain sm:w-[34px] lg:w-[38px]"
                priority
              />
            </span>

            <span className="flex min-h-[40px] items-center">
              <span className="block font-heading text-[0.92rem] font-bold leading-none tracking-tight text-[var(--color-foreground)] sm:text-[0.98rem] lg:text-[1.04rem]">
                <span className="text-[var(--color-primary)]">Voucher Maple Bear</span>
              </span>
            </span>
          </Link>

          <div className="flex flex-col gap-2.5 lg:min-w-0 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-col gap-1 sm:flex-row sm:flex-wrap lg:min-w-0 lg:items-center lg:justify-start lg:gap-2">
              {publicNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDropdowns}
                    className={cn(
                      navTriggerClassName,
                      isActive
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-foreground)] hover:text-[var(--color-primary)]",
                    )}
                  >
                    {item.navLabel ?? item.label}
                  </Link>
                );
              })}

              {isAuthenticated ? (
                <div data-header-dropdown-root="true" className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("internal")}
                    className={cn(
                      navTriggerClassName,
                      isInternalArea || isDropdownOpen("internal")
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-foreground)] hover:text-[var(--color-primary)]",
                    )}
                    aria-expanded={isDropdownOpen("internal")}
                    aria-haspopup="menu"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {internalAreaLabel}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        isDropdownOpen("internal") ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      panelClassName,
                      "lg:w-[190px]",
                      isDropdownOpen("internal") ? "block" : "hidden",
                    )}
                  >
                    {navigationItems.map((item) => (
                      <HeaderMenuItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        description={item.description}
                        isActive={pathname.startsWith(item.href)}
                        onSelect={closeDropdowns}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
              {!isAuthenticated ? (
                <div
                  data-header-dropdown-root="true"
                  className="relative sm:self-start lg:self-auto"
                >
                  <button
                    type="button"
                    onClick={() => toggleDropdown("login")}
                    className={cn(
                      triggerClassName,
                      isLoginArea || isDropdownOpen("login")
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-foreground)] hover:text-[var(--color-primary)]",
                    )}
                    aria-expanded={isDropdownOpen("login")}
                    aria-haspopup="menu"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      Acessar
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        isDropdownOpen("login") ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      panelClassName,
                      "lg:w-[320px]",
                      isDropdownOpen("login") ? "block" : "hidden",
                    )}
                  >
                    {loginNavigation.map((item) => (
                      <HeaderMenuItem
                        key={item.href}
                        {...item}
                        isActive={pathname.startsWith(item.href)}
                        onSelect={closeDropdowns}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  data-header-dropdown-root="true"
                  className="relative sm:self-start lg:self-auto"
                >
                  <button
                    type="button"
                    onClick={() => toggleDropdown("account")}
                    className={cn(
                      triggerClassName,
                      "justify-start",
                      isDropdownOpen("account")
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-foreground)] hover:text-[var(--color-primary)]",
                    )}
                    aria-expanded={isDropdownOpen("account")}
                    aria-haspopup="menu"
                  >
                    <span className="inline-flex min-w-0 flex-1 items-center gap-3">
                      <span className="min-w-0">
                        <span className="block max-w-[180px] truncate text-[13px] text-[var(--color-foreground)]">
                          {userRoleLabel || "Conta ativa"}
                        </span>
                      </span>
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                        <UserCircle2 className="size-4" />
                      </span>
                    </span>
                  </button>

                  <div
                    className={cn(
                      panelClassName,
                      "rounded-[var(--radius-xl)] border-[color:rgba(119,137,166,0.18)] lg:w-[300px]",
                      isDropdownOpen("account") ? "block" : "hidden",
                    )}
                  >
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3.5 py-3">
                      {userRoleLabel ? (
                        <div className="inline-flex rounded-[var(--radius-md)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                          {userRoleLabel}
                        </div>
                      ) : null}
                    </div>

                    <form action={logout}>
                      <input type="hidden" name="redirectTo" value="/login" />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-between rounded-[var(--radius-md)] px-3.5 py-3 text-left text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <LogOut className="size-4" />
                          Sair
                        </span>
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                          Encerrar sessão
                        </span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
