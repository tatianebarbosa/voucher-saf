"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  Building2,
  KeyRound,
  LibraryBig,
  ShieldCheck,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { authenticate } from "@/lib/server/auth-actions";

interface LoginHighlight {
  icon: typeof ShieldCheck;
  label: string;
  description: string;
}

const highlights: LoginHighlight[] = [
  {
    icon: ShieldCheck,
    label: "Painel interno",
    description:
      "Acompanhe a fila interna conforme as permissoes do seu perfil.",
  },
  {
    icon: LibraryBig,
    label: "Base de escolas",
      description: "Consulte escolas, detalhe da unidade e históricos vinculados.",
  },
  {
    icon: Building2,
    label: "Viewer Central",
    description:
      "Consultores e comercial podem navegar sem criar, editar ou alterar status.",
  },
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-[0_20px_34px_-24px_rgba(191,31,41,0.72)] transition hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <KeyRound className="size-4" />
          Autenticando...
        </>
      ) : (
        <>
          Entrar na área interna
          <ArrowRight className="size-4" />
        </>
      )}
    </button>
  );
}

export function LoginForm({
  callbackUrl,
  noticeMessage,
}: {
  callbackUrl: string;
  noticeMessage?: string;
}) {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <section className="relative overflow-hidden rounded-[10px] border border-white/70 bg-[linear-gradient(180deg,#fcfcfd_0%,#f4f6fb_100%)] px-5 py-6 shadow-[0_30px_64px_-54px_rgba(22,39,68,0.34)] md:px-8 md:py-8 xl:px-10 xl:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(191,31,41,0.1),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-16 bottom-8 size-56 rounded-full bg-[radial-gradient(circle,rgba(22,39,68,0.08),transparent_68%)]" />
      <div className="pointer-events-none absolute right-0 top-12 size-72 rounded-full bg-[radial-gradient(circle,rgba(217,176,121,0.16),transparent_64%)]" />

      <div className="relative grid gap-8 xl:min-h-[62vh] xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
        <section className="space-y-6 xl:pr-6">
          <div className="space-y-3">
            <Image
              src="/brand/saf-logo.png"
              alt="SAF"
              width={280}
              height={112}
              className="h-12 w-auto object-contain md:h-14"
              priority
            />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--color-primary)]">
              Acesso interno
            </p>
          </div>

          <div className="max-w-4xl space-y-3">
            <h1 className="font-heading text-4xl font-bold leading-[0.95] tracking-tight text-[var(--color-foreground)] md:text-5xl xl:text-6xl">
              Painel interno do SAF e da Central
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--color-foreground)]/84 md:text-lg md:leading-8">
              Ferramenta interna para operação do SAF e consulta das áreas da
              Central. O perfil viewer acompanha escolas, solicitações, vouchers
              e históricos sem edição.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[8px] border border-white/80 bg-white/72 px-3.5 py-3.5 shadow-[0_18px_34px_-28px_rgba(22,39,68,0.26)] backdrop-blur"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-foreground)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/solicitacao"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-white px-4 py-2.5 font-semibold text-[var(--color-foreground)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Abrir solicitação pública
            </Link>
            <p className="text-[var(--color-muted-foreground)]">
              Admins e operadores editam dados. O perfil viewer faz consulta
              ampla sem alterações.
            </p>
          </div>
        </section>

        <section className="xl:justify-self-end xl:w-full xl:max-w-[640px]">
          <div className="rounded-[8px] border border-[rgba(22,39,68,0.14)] bg-white/94 p-5 shadow-[0_34px_64px_-46px_rgba(22,39,68,0.32)] backdrop-blur md:p-6">
            <div className="space-y-3">
              <p className="text-base font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
                Acesso interno
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)] md:text-[2rem]">
                Entrar na área interna
              </h2>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Digite o e-mail e a senha do seu acesso interno para abrir o
                painel correspondente ao seu perfil.
              </p>
            </div>

            {noticeMessage ? (
              <div className="mt-4 rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {noticeMessage}
              </div>
            ) : null}

            <form action={formAction} className="mt-6 space-y-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />

              <label className="block space-y-2.5">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  E-mail
                </span>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-12 rounded-[12px] border-[rgba(22,39,68,0.22)] bg-[#fbfbfc] px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] focus:border-[var(--color-primary)]"
                  placeholder="Digite o e-mail interno"
                />
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  Senha
                </span>
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-12 rounded-[12px] border-[rgba(22,39,68,0.22)] bg-[#fbfbfc] px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] focus:border-[var(--color-primary)]"
                  placeholder="Digite a senha de acesso"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-[var(--color-primary)]">
                  {errorMessage}
                </div>
              ) : null}

              <SubmitButton />
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--color-surface-muted)] px-3 py-2">
                <ShieldCheck className="size-4 text-[var(--color-primary)]" />
                Sessao protegida
              </span>
              <span>
                Acesso restrito ao time SAF e aos perfis internos autorizados.
              </span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
