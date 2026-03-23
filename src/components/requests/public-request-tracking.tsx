"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function buildTrackingDetailsPath(ticketNumber: string) {
  const normalizedTicketNumber = ticketNumber.trim();

  if (!normalizedTicketNumber) {
    return "/acompanhar";
  }

  const params = new URLSearchParams();
  params.set("ticket", normalizedTicketNumber);

  return `/acompanhar/detalhes?${params.toString()}`;
}

export function PublicRequestTracking() {
  const router = useRouter();
  const [ticketNumber, setTicketNumber] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTicketNumber = ticketNumber.trim();

    setTicketNumber(normalizedTicketNumber);

    if (normalizedTicketNumber.length < 3) {
      setFieldError("Informe um código de atendimento válido.");
      return;
    }

    setFieldError(null);

    startTransition(() => {
      router.push(buildTrackingDetailsPath(normalizedTicketNumber));
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-210px)] items-center justify-center px-4 py-6 md:py-10">
      <Card className="w-full max-w-[540px] rounded-[var(--radius-xl)] shadow-none">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Consulta pública
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)] md:text-3xl">
              Buscar por código de atendimento
            </h1>
            <p className="mx-auto max-w-[420px] text-sm leading-7 text-[var(--color-muted-foreground)]">
              Informe o número de atendimento para acompanhar o status atual da
              solicitação e o retorno liberado para esse protocolo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="public-ticket-number"
                className="text-sm font-semibold text-[var(--color-foreground)]"
              >
                Código do atendimento
              </label>
              <Input
                id="public-ticket-number"
                value={ticketNumber}
                onChange={(event) => {
                  setTicketNumber(event.target.value);
                  setFieldError(null);
                }}
                placeholder="Ex.: TK-10452"
                autoComplete="off"
                aria-invalid={Boolean(fieldError)}
              />
              <p
                className={
                  fieldError
                    ? "text-sm text-red-700"
                    : "text-sm text-[var(--color-muted-foreground)]"
                }
              >
                {fieldError ||
                  "Use o código informado no momento da abertura da solicitação."}
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isPending}
              >
                {isPending ? "Buscando..." : "Buscar solicitação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
