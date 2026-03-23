"use client";

import Link from "next/link";

import {
  RequestStatusBadge,
  RequestTypeBadge,
} from "@/components/requests/request-badges";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatCondition,
  formatDateTime,
  formatRequesterSummaryLabel,
} from "@/lib/formatters";
import type { VoucherRequest } from "@/types/request";

interface RequestTableProps {
  requests: VoucherRequest[];
  canUpdateStatus?: boolean;
  emptyMessage?: string;
}

export function RequestTable({
  requests,
  canUpdateStatus = true,
  emptyMessage = "Nenhuma solicitação encontrada com os filtros atuais.",
}: RequestTableProps) {
  function renderConditionCell(request: VoucherRequest) {
    if (request.requestType === "desmembramento") {
      return (
        <div className="space-y-1">
          <p className="font-medium text-[var(--color-foreground)]">
            {request.campaignVoucherCode
              ? `Voucher ${request.campaignVoucherCode}`
              : formatCondition(request)}
          </p>
          <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
            Como deseja desmembrar: {request.splitInstruction || "Não informado"}
          </p>
        </div>
      );
    }

    return (
      <p className="text-[var(--color-foreground)]">{formatCondition(request)}</p>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Escola</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Condição / voucher</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Datas</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}

              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-[var(--color-border)] align-top text-[var(--color-foreground)]"
                >
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-semibold">{request.schoolName}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Código do atendimento {request.ticketNumber}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Origem: {request.origin}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatRequesterSummaryLabel(request.requesterType)}:{" "}
                        {request.requesterName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <RequestTypeBadge requestType={request.requestType} />
                  </td>
                  <td className="px-6 py-5">{renderConditionCell(request)}</td>
                  <td className="px-6 py-5">
                    <div className="space-y-3">
                      <RequestStatusBadge status={request.status} />
                      {request.decisionReason ? (
                        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                          Motivo da decisão: {request.decisionReason}
                        </p>
                      ) : null}
                      {canUpdateStatus ? (
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Atualize o status na tela de detalhe.
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Perfil viewer: consulta do status somente no detalhe.
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    <div className="space-y-1">
                      <p>Recebida: {formatDateTime(request.createdAt)}</p>
                      <p>Atualizada: {formatDateTime(request.updatedAt)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-3">
                      <Link
                        href={`/solicitacoes/${request.id}`}
                        className="inline-flex items-center rounded-[8px] border border-[var(--color-border-strong)] px-4 py-2 font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
                      >
                        Abrir detalhe
                      </Link>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Último ajuste operacional e blocos de cópia ficam na tela
                        de detalhe.
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
