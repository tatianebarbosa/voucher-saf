"use client";

import Link from "next/link";

import type {
  SchoolHistoryPagination,
  SchoolRequestHistoryItem,
} from "@/types/school";

import {
  RequestStatusBadge,
  RequestTypeBadge,
} from "@/components/requests/request-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatRequesterType } from "@/lib/formatters";

interface SchoolRequestHistoryTableProps {
  requests: SchoolRequestHistoryItem[];
  pagination: SchoolHistoryPagination;
  isRefreshing?: boolean;
  onPageChange: (page: number) => void;
}

function buildPaginationSummary(
  requests: SchoolRequestHistoryItem[],
  pagination: SchoolHistoryPagination,
) {
  if (pagination.total === 0 || requests.length === 0) {
    return "Nenhuma solicitação encontrada.";
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = start + requests.length - 1;

  return `Mostrando ${start}-${end} de ${pagination.total} solicitações.`;
}

export function SchoolRequestHistoryTable({
  requests,
  pagination,
  isRefreshing = false,
  onPageChange,
}: SchoolRequestHistoryTableProps) {
  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Código do atendimento</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Solicitante</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Criada em</th>
                <th className="px-6 py-4 font-semibold">Condição</th>
                <th className="px-6 py-4 font-semibold">Voucher</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-[var(--color-border)] align-top text-[var(--color-foreground)]"
                >
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-semibold">{request.ticketNumber}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {request.origin}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <RequestTypeBadge requestType={request.requestType} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {formatRequesterType(request.requesterType)}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {request.requesterName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <RequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {formatDateTime(request.createdAt)}
                  </td>
                  <td className="px-6 py-5">{request.conditionLabel}</td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {request.voucherCode || "Não se aplica"}
                  </td>
                  <td className="px-6 py-5">
                    <Link
                      href={`/solicitacoes/${request.id}`}
                      className="inline-flex items-center rounded-[8px] border border-[var(--color-border-strong)] px-4 py-2 font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
                    >
                      Abrir solicitação
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {buildPaginationSummary(requests, pagination)}
            </p>

            {pagination.totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isRefreshing}
                >
                  Anterior
                </Button>
                <p className="min-w-24 text-center text-sm text-[var(--color-muted-foreground)]">
                  Pagina {pagination.page} de {pagination.totalPages}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >= pagination.totalPages || isRefreshing
                  }
                >
                  Próxima
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
