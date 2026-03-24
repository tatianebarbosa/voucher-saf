"use client";

import { CopyPlus, RefreshCcw } from "lucide-react";

import { RequestStatusBadge } from "@/components/requests/request-badges";
import { RequestStatusEditor } from "@/components/requests/request-status-editor";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { buildRequestStatusMessage } from "@/lib/generate-request";
import { useAuthSession } from "@/providers/auth-provider";
import { useRequests } from "@/providers/requests-provider";
import type { VoucherRequest } from "@/types/request";

function QuickCopyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

export function RequestQuickActions({ request }: { request: VoucherRequest }) {
  const { updateRequestStatus } = useRequests();
  const { hasPermission } = useAuthSession();
  const canUpdateStatus = hasPermission("requests.update_status");

  async function handleStatusChange(input: {
    status: VoucherRequest["status"];
    decisionReason?: string;
  }) {
    if (!canUpdateStatus) {
      return;
    }

    await updateRequestStatus(request.id, input);
  }

  const statusMessageLabel =
    request.status === "Negada"
      ? "Mensagem de negativa"
      : request.status === "Pronta para envio"
        ? "Mensagem de aprovação"
        : "Mensagem de retorno";

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            {canUpdateStatus ? "Ações rapidas" : "Consulta rápida"}
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            {canUpdateStatus ? "Status e cópia rápida" : "Consulta e cópia rápida"}
          </h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {canUpdateStatus
              ? "Atualize o andamento da solicitação e copie os conteúdos mais usados pelo time SAF."
              : "Seu perfil viewer pode consultar o andamento e copiar os conteúdos gerados, sem alterar o status."}
          </p>
        </div>

        <div>
          {canUpdateStatus ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                <RefreshCcw className="size-4 text-[var(--color-primary)]" />
                Atualizar status
              </div>
              <RequestStatusEditor request={request} onSave={handleStatusChange} />
              <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-muted-foreground)]">
                <p>Recebida em {formatDateTime(request.createdAt)}</p>
                <p>Última atualização em {formatDateTime(request.updatedAt)}</p>
                {request.decisionReason ? (
                  <p>Motivo da decisão: {request.decisionReason}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                <RefreshCcw className="size-4 text-[var(--color-primary)]" />
                Status atual
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <RequestStatusBadge status={request.status} />
              </div>
              <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-muted-foreground)]">
                <p>Recebida em {formatDateTime(request.createdAt)}</p>
                <p>Última atualização em {formatDateTime(request.updatedAt)}</p>
                <p className="font-medium text-[var(--color-foreground)]">
                  Alteracao de status indisponível para o perfil viewer.
                </p>
              </div>
            </div>
          )}

        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <CopyPlus className="size-4 text-[var(--color-primary)]" />
            Itens para copiar
          </div>
          {request.generatedTexts.voucherCode ? (
            <QuickCopyRow
              label="Código do voucher"
              value={request.generatedTexts.voucherCode}
            />
          ) : null}
          <QuickCopyRow
            label="Título do e-mail"
            value={request.generatedTexts.emailTitle}
          />
          <QuickCopyRow
            label="Texto para comercial e diretoria"
            value={request.generatedTexts.emailBody}
          />
          <QuickCopyRow
            label={statusMessageLabel}
            value={buildRequestStatusMessage(request)}
          />
          <QuickCopyRow
            label="Descrição Magento"
            value={request.generatedTexts.magentoDescription}
          />
        </div>
      </CardContent>
    </Card>
  );
}
