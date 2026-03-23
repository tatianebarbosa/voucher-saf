"use client";

import type {
  SchoolVoucherPagination,
  SchoolVoucherSummaryItem,
} from "@/types/school";

import {
  VoucherStatusBadge,
  VoucherTypeBadge,
} from "@/components/vouchers/voucher-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formatters";

interface SchoolVoucherTableProps {
  vouchers: SchoolVoucherSummaryItem[];
  pagination?: SchoolVoucherPagination;
  isRefreshing?: boolean;
  onPageChange?: (page: number) => void;
}

function formatSentToEmail(value?: string) {
  return value || "Não informado";
}

function formatSentAt(value?: string) {
  return value ? formatDateTime(value) : "Não informado";
}

function formatExpiresAt(value?: string) {
  return value ? formatDate(value) : "Não informada";
}

function buildRemainingLabel(voucher: SchoolVoucherSummaryItem) {
  const remaining = Math.max(voucher.quantityAvailable - voucher.quantitySent, 0);

  return `${remaining} restante(s)`;
}

function buildPaginationSummary(
  vouchers: SchoolVoucherSummaryItem[],
  pagination: SchoolVoucherPagination,
) {
  if (pagination.total === 0 || vouchers.length === 0) {
    return "Nenhum voucher encontrado.";
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = start + vouchers.length - 1;

  return `Mostrando ${start}-${end} de ${pagination.total} vouchers.`;
}

export function SchoolVoucherTable({
  vouchers,
  pagination,
  isRefreshing = false,
  onPageChange,
}: SchoolVoucherTableProps) {
  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Campanha</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Quantidade</th>
                <th className="px-6 py-4 font-semibold">Envio</th>
                <th className="px-6 py-4 font-semibold">Validade</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr
                  key={voucher.id}
                  className="border-t border-[var(--color-border)] align-top text-[var(--color-foreground)]"
                >
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-semibold tracking-[0.04em]">
                        {voucher.voucherCode}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {voucher.quantityAvailable > 0
                          ? "Voucher operacional importado"
                          : "Voucher sem saldo importado"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="max-w-[320px] space-y-2">
                      <p className="font-medium">{voucher.campaignName}</p>
                      {voucher.notesExcerpt ? (
                        <details className="text-xs text-[var(--color-muted-foreground)]">
                          <summary className="cursor-pointer font-semibold text-[var(--color-primary)]">
                            Observações importadas
                          </summary>
                          <p className="mt-2 leading-5">{voucher.notesExcerpt}</p>
                        </details>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <VoucherTypeBadge voucherType={voucher.voucherType} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {voucher.quantityAvailable} disponibilizado(s)
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {voucher.quantitySent} enviado(s) •{" "}
                        {buildRemainingLabel(voucher)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="max-w-[220px] space-y-1">
                      <p className="font-medium">{formatSentToEmail(voucher.sentToEmail)}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatSentAt(voucher.sentAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {formatExpiresAt(voucher.expiresAt)}
                  </td>
                  <td className="px-6 py-5">
                    <VoucherStatusBadge status={voucher.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {buildPaginationSummary(vouchers, pagination)}
            </p>

            {pagination.totalPages > 1 && onPageChange ? (
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
