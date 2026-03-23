import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  RequestStatusBadge,
  RequestTypeBadge,
} from "@/components/requests/request-badges";
import { Card, CardContent } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  formatDate,
  formatRequestStatus,
  formatRequesterType,
  formatRequestType,
} from "@/lib/formatters";
import { getPublicRequestTrackingByTicketNumber } from "@/lib/server/requests";
import type { PublicRequestTracking as PublicRequestTrackingData } from "@/types/request";

interface PublicRequestTrackingDetailsProps {
  ticketNumber: string;
}

function SummaryItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "space-y-2 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-4"
          : "space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="text-sm leading-7 text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

function buildValidityDisplay(tracking: PublicRequestTrackingData) {
  if (tracking.validityLabel) {
    return tracking.validityLabel;
  }

  if (tracking.status === "Negada") {
    return "Não se aplica";
  }

  return "Disponível após a conclusão";
}

function buildBackLink(label: string) {
  return (
    <Link
      href="/acompanhar"
      className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
    >
      {label}
    </Link>
  );
}

export async function PublicRequestTrackingDetails({
  ticketNumber,
}: PublicRequestTrackingDetailsProps) {
  noStore();

  const normalizedTicketNumber = ticketNumber.trim();

  if (normalizedTicketNumber.length < 3) {
    return (
      <StateCard
        tone="search"
        title="Código de atendimento inválido"
        description="Informe um código de atendimento válido para consultar os detalhes da solicitação."
        action={buildBackLink("Voltar para consulta")}
      />
    );
  }

  let tracking: PublicRequestTrackingData | undefined;
  let failedToLoad = false;

  try {
    tracking = await getPublicRequestTrackingByTicketNumber(
      normalizedTicketNumber,
    );
  } catch {
    failedToLoad = true;
  }

  if (failedToLoad) {
    return (
      <StateCard
        tone="error"
        title="Falha ao consultar a solicitação"
        description="Não foi possível carregar os detalhes agora. Tente novamente em instantes."
        action={buildBackLink("Voltar para consulta")}
      />
    );
  }

  if (!tracking) {
    return (
      <StateCard
        tone="search"
        title="Código de atendimento não encontrado"
        description="Não encontramos uma solicitação com esse código de atendimento. Revise o protocolo informado e tente novamente."
        action={buildBackLink("Buscar outro código")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            Detalhe da solicitação
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Código do atendimento {tracking.ticketNumber}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
            Consulta pública do status atual da solicitação pelo número de
            atendimento informado na abertura do chamado.
          </p>
        </div>

        <Link
          href="/acompanhar"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
        >
          Buscar outro código
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
                Resultado encontrado
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)] md:text-3xl">
                {tracking.schoolName}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
                Código de atendimento {tracking.ticketNumber} localizado com
                sucesso. Aqui você acompanha o retorno liberado para essa
                solicitação sem expor dados internos da operação SAF.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <RequestTypeBadge requestType={tracking.requestType} />
              <RequestStatusBadge status={tracking.status} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryItem label="Escola" value={tracking.schoolName} highlight />
            <SummaryItem
              label="Código do atendimento"
              value={tracking.ticketNumber}
              highlight
            />
            <SummaryItem
              label="Data da solicitação"
              value={formatDate(tracking.createdAt)}
              highlight
            />
            <SummaryItem
              label="Resultado atual"
              value={tracking.outcomeLabel}
              highlight
            />
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Atualização do atendimento
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-foreground)]">
              {tracking.schoolFacingMessage}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryItem
              label="Tipo da solicitação"
              value={formatRequestType(tracking.requestType)}
            />
            <SummaryItem
              label="Tipo de solicitante"
              value={formatRequesterType(tracking.requesterType)}
            />
            <SummaryItem
              label="Status"
              value={formatRequestStatus(tracking.status)}
            />
            <SummaryItem
              label={
                tracking.status === "Pronta para envio"
                  ? "Condição aprovada"
                  : tracking.status === "Negada"
                    ? "Condição analisada"
                    : "Condição solicitada"
              }
              value={tracking.conditionLabel}
            />
            <SummaryItem
              label="Validade"
              value={buildValidityDisplay(tracking)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
