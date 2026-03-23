"use client";

import { useMemo, useState } from "react";

import { RequestStatusSelect } from "@/components/requests/request-status-select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RequestStatus, VoucherRequest } from "@/types/request";

function requiresDecisionReason(status: RequestStatus) {
  return status === "Pronta para envio" || status === "Negada";
}

interface RequestStatusEditorProps {
  request: Pick<VoucherRequest, "status" | "decisionReason">;
  onSave: (input: {
    status: RequestStatus;
    decisionReason?: string;
  }) => Promise<unknown> | void;
  compact?: boolean;
  disabled?: boolean;
}

function RequestStatusEditorForm({
  request,
  onSave,
  compact = false,
  disabled = false,
}: RequestStatusEditorProps) {
  const [draftStatus, setDraftStatus] = useState<RequestStatus>(request.status);
  const [draftDecisionReason, setDraftDecisionReason] = useState(
    request.decisionReason ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldRequireDecisionReason = requiresDecisionReason(draftStatus);
  const normalizedCurrentReason = (request.decisionReason ?? "").trim();
  const normalizedDraftReason = draftDecisionReason.trim();
  const hasChanges = useMemo(
    () =>
      draftStatus !== request.status ||
      normalizedDraftReason !== normalizedCurrentReason,
    [draftStatus, normalizedCurrentReason, normalizedDraftReason, request.status],
  );

  async function handleSave() {
    if (disabled || isSaving || !hasChanges) {
      return;
    }

    if (shouldRequireDecisionReason && normalizedDraftReason.length < 10) {
      setError(
        draftStatus === "Pronta para envio"
          ? "Informe o motivo da aprovação."
          : "Informe o motivo da negativa.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await onSave({
        status: draftStatus,
        decisionReason: shouldRequireDecisionReason
          ? normalizedDraftReason
          : undefined,
      });

      if (!result) {
        setError("Não foi possível atualizar o status.");
        setIsSaving(false);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível atualizar o status.",
      );
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraftStatus(request.status);
    setDraftDecisionReason(request.decisionReason ?? "");
    setError(null);
  }

  return (
    <div className="space-y-3">
      <RequestStatusSelect
        value={draftStatus}
        disabled={disabled || isSaving}
        compact={compact}
        onChange={(status) => {
          setDraftStatus(status);
          setError(null);

          if (!requiresDecisionReason(status)) {
            setDraftDecisionReason("");
            return;
          }

          if (status !== request.status) {
            setDraftDecisionReason("");
            return;
          }

          setDraftDecisionReason(request.decisionReason ?? "");
        }}
      />

      {shouldRequireDecisionReason ? (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {draftStatus === "Pronta para envio"
              ? "Motivo da aprovação"
              : "Motivo da negativa"}
          </label>
          <Textarea
            value={draftDecisionReason}
            disabled={disabled || isSaving}
            onChange={(event) => {
              setDraftDecisionReason(event.target.value);
              setError(null);
            }}
            rows={compact ? 3 : 4}
            className={cn(compact ? "text-xs leading-5" : "")}
            placeholder={
              draftStatus === "Pronta para envio"
                ? "Explique por que a solicitação foi aprovada."
                : "Explique por que a solicitação foi negada."
            }
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-[var(--color-primary)]">{error}</p>
      ) : null}

      {hasChanges ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={disabled || isSaving}
            className={compact ? "h-9 px-3 text-xs" : ""}
          >
            {isSaving ? "Salvando..." : "Salvar status"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={disabled || isSaving}
            className={compact ? "h-9 px-3 text-xs" : ""}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RequestStatusEditor(props: RequestStatusEditorProps) {
  return (
    <RequestStatusEditorForm
      key={`${props.request.status}:${props.request.decisionReason ?? ""}`}
      {...props}
    />
  );
}
