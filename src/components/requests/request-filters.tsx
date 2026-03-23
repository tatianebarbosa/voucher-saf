"use client";

import { Search, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RequestStatusFilter, RequestTypeFilter } from "@/types/request";

interface RequestFiltersProps {
  schoolQuery: string;
  ticketQuery: string;
  typeFilter: RequestTypeFilter;
  statusFilter: RequestStatusFilter;
  resultCount: number;
  totalCount: number;
  onSchoolQueryChange: (value: string) => void;
  onTicketQueryChange: (value: string) => void;
  onTypeFilterChange: (value: RequestTypeFilter) => void;
  onStatusFilterChange: (value: RequestStatusFilter) => void;
  onClearFilters: () => void;
}

export function RequestFilters({
  schoolQuery,
  ticketQuery,
  typeFilter,
  statusFilter,
  resultCount,
  totalCount,
  onSchoolQueryChange,
  onTicketQueryChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onClearFilters,
}: RequestFiltersProps) {
  const hasActiveFilters =
    schoolQuery.trim() !== "" ||
    ticketQuery.trim() !== "" ||
    typeFilter !== "todos" ||
    statusFilter !== "todos";

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
                Busca e filtros
              </p>
              <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                Operação do painel
              </h2>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Refine a fila por escola, código do atendimento, tipo ou etapa operacional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                {resultCount}
              </span>{" "}
              de {totalCount} solicitações visíveis
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Buscar por escola
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                value={schoolQuery}
                onChange={(event) => onSchoolQueryChange(event.target.value)}
                placeholder="Nome da escola"
                className="pl-11"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Buscar por código do atendimento
            </span>
            <div className="relative">
              <Ticket className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                value={ticketQuery}
                onChange={(event) => onTicketQueryChange(event.target.value)}
                placeholder="Código do atendimento"
                className="pl-11"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Tipo da solicitação
            </span>
            <Select
              value={typeFilter}
              onChange={(event) =>
                onTypeFilterChange(event.target.value as RequestTypeFilter)
              }
            >
              <option value="todos">Todos</option>
              <option value="desconto">Desconto</option>
              <option value="parcelamento">Parcelamento</option>
              <option value="desmembramento">Desmembramento</option>
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Status
            </span>
            <Select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as RequestStatusFilter)
              }
            >
              <option value="todos">Todos</option>
              <option value="Recebida">Recebida</option>
              <option value="Em analise">Em análise</option>
              <option value="Pronta para envio">Pronta para envio</option>
              <option value="Negada">Negada</option>
            </Select>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
