"use client";

import Link from "next/link";
import { useState } from "react";

import { RequestFilters } from "@/components/requests/request-filters";
import { RequestStats } from "@/components/requests/request-stats";
import { RequestTable } from "@/components/requests/request-table";
import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { useAuthSession } from "@/providers/auth-provider";
import { useRequests } from "@/providers/requests-provider";
import type { RequestStatusFilter, RequestTypeFilter } from "@/types/request";

export default function SafPanelPage() {
  const { hasPermission, userRoleLabel } = useAuthSession();
  const {
    error,
    errorCode,
    isReady,
    isRefreshing,
    refreshRequests,
    requests,
  } = useRequests();
  const [schoolQuery, setSchoolQuery] = useState("");
  const [ticketQuery, setTicketQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("todos");
  const [statusFilter, setStatusFilter] =
    useState<RequestStatusFilter>("todos");
  const canUpdateStatus = hasPermission("requests.update_status");

  const normalizedSchoolQuery = schoolQuery.trim().toLowerCase();
  const normalizedTicketQuery = ticketQuery.trim().toLowerCase();
  const hasActiveFilters =
    normalizedSchoolQuery !== "" ||
    normalizedTicketQuery !== "" ||
    typeFilter !== "todos" ||
    statusFilter !== "todos";

  const filteredRequests = [...requests]
    .filter((request) => {
      if (
        normalizedSchoolQuery &&
        !request.schoolName.toLowerCase().includes(normalizedSchoolQuery)
      ) {
        return false;
      }

      if (
        normalizedTicketQuery &&
        !request.ticketNumber.toLowerCase().includes(normalizedTicketQuery)
      ) {
        return false;
      }

      if (typeFilter !== "todos" && request.requestType !== typeFilter) {
        return false;
      }

      if (statusFilter !== "todos" && request.status !== statusFilter) {
        return false;
      }

      return true;
    })
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

  function handleClearFilters() {
    setSchoolQuery("");
    setTicketQuery("");
    setTypeFilter("todos");
    setStatusFilter("todos");
  }

  if (!isReady) {
    return (
      <StateCard
        tone="loading"
        title="Carregando painel SAF"
        description="Buscando as solicitações salvas, atualizando os cards e validando sua sessão interna."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5 pt-4">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--color-primary)]">
            Assistente operacional
          </p>

          <div className="space-y-3">
            <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[0.96] tracking-tight text-[var(--color-foreground)] md:text-6xl">
              Painel SAF
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--color-foreground)]/88">
              Visualize a fila recebida, refine o que precisa ser tratado e
              acompanhe a operação com atualização imediata de status.
            </p>
          </div>

          {isRefreshing ? (
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Atualizando dados do painel
            </p>
          ) : null}
          {!canUpdateStatus ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Perfil atual: {userRoleLabel}. A consulta e cópia continuam
              disponíveis, mas a alteracao de status fica desabilitada.
            </p>
          ) : null}
        </div>
      </section>

      {error ? (
        <StateCard
          tone="error"
          title={
            errorCode === "AUTH_REQUIRED"
              ? "Sessão interna expirada"
              : "Falha ao carregar o painel"
          }
          description={error}
          action={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshRequests()}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Atualizando..." : "Tentar novamente"}
              </Button>
              {errorCode === "AUTH_REQUIRED" ? (
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-[8px] bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
                >
                  Fazer login novamente
                </Link>
              ) : null}
            </>
          }
        />
      ) : null}

      <RequestStats requests={requests} />

      <RequestFilters
        schoolQuery={schoolQuery}
        ticketQuery={ticketQuery}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        resultCount={filteredRequests.length}
        totalCount={requests.length}
        onSchoolQueryChange={setSchoolQuery}
        onTicketQueryChange={setTicketQuery}
        onTypeFilterChange={setTypeFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={handleClearFilters}
      />

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Solicitações recebidas
          </h2>
          <p className="text-base leading-7 text-[var(--color-muted-foreground)]">
            Resultado filtrado com acesso ao detalhe operacional para revisar e
            atualizar o status.
          </p>
        </div>

        <RequestTable
          canUpdateStatus={canUpdateStatus}
          requests={filteredRequests}
          emptyMessage={
            requests.length === 0
              ? "Ainda não ha solicitações registradas no banco atual."
              : hasActiveFilters
                ? "Nenhuma solicitação corresponde aos filtros atuais."
              : "Nenhuma solicitação disponível para exibicao."
          }
        />
      </section>
    </div>
  );
}
