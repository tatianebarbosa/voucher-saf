"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import { formatAuditEventType, formatDateTime } from "@/lib/formatters";
import type { ApiResponse } from "@/types/api";
import type { AuditEvent } from "@/types/audit";

interface RequestAuditTimelineProps {
  requestId: string;
}

interface AuditEventsPayload {
  events: AuditEvent[];
}

async function readApiResponse<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

export function RequestAuditTimeline({
  requestId,
}: RequestAuditTimelineProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadEvents() {
      setIsReady(false);
      setError(null);

      try {
        const response = await fetch(`/api/requests/${requestId}/audit-events`, {
          cache: "no-store",
        });
        const payload = await readApiResponse<AuditEventsPayload>(response);

        if (response.ok && payload.success) {
          if (!isCancelled) {
            setEvents(payload.data.events);
            setError(null);
          }
          return;
        }

        if (!isCancelled) {
          setEvents([]);
          setError(
            payload.success
              ? "Não foi possível carregar o histórico operacional."
              : payload.error.message,
          );
        }
      } catch {
        if (!isCancelled) {
          setEvents([]);
          setError("Não foi possível carregar o histórico operacional.");
        }
      } finally {
        if (!isCancelled) {
          setIsReady(true);
        }
      }
    }

    void loadEvents();

    return () => {
      isCancelled = true;
    };
  }, [requestId]);

  if (!isReady) {
    return (
      <StateCard
        tone="loading"
        title="Carregando histórico operacional"
        description="Buscando a trilha de auditoria desta solicitação."
      />
    );
  }

  if (error) {
    return (
      <StateCard
        tone="error"
        title="Falha ao carregar histórico"
        description={error}
      />
    );
  }

  if (events.length === 0) {
    return (
      <StateCard
        tone="empty"
        title="Nenhum evento registrado"
        description="Ainda não existem eventos operacionais registrados para está solicitação."
      />
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            Auditoria
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Histórico operacional
          </h2>
          <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
            Trilha resumida das ações relevantes registradas para está solicitação.
          </p>
        </div>

        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {formatAuditEventType(event.eventType)}
                  </p>
                  <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {event.summary}
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                    {event.actorLabel}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
