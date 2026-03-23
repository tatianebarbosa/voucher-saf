"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { GeneratedTextsPanel } from "@/components/requests/generated-texts-panel";
import { RequestAuditTimeline } from "@/components/requests/request-audit-timeline";
import { RequestOverviewCard } from "@/components/requests/request-overview-card";
import { RequestQuickActions } from "@/components/requests/request-quick-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import { useAuthSession } from "@/providers/auth-provider";
import { useRequests } from "@/providers/requests-provider";

export default function RequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const { hasPermission, userRoleLabel } = useAuthSession();
  const { error, errorCode, getRequestById, isReady, isRefreshing, refreshRequests } =
    useRequests();
  const request = getRequestById(params.id);
  const canUpdateStatus = hasPermission("requests.update_status");

  if (!isReady) {
    return (
      <StateCard
        tone="loading"
        title="Carregando detalhe da solicitação"
        description="Buscando os dados persistidos, o status atual e os textos gerados automaticamente."
      />
    );
  }

  if (error && !request) {
    return (
      <StateCard
        tone="error"
        title={
          errorCode === "AUTH_REQUIRED"
            ? "Sessão interna expirada"
            : "Falha ao carregar a solicitação"
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
            <Link
              href={errorCode === "AUTH_REQUIRED" ? "/login" : "/painel-saf"}
              className="inline-flex items-center rounded-[8px] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
            >
              {errorCode === "AUTH_REQUIRED" ? "Fazer login novamente" : "Voltar ao painel"}
            </Link>
          </>
        }
      />
    );
  }

  if (!request) {
    return (
      <StateCard
        tone="empty"
        title="Solicitação não encontrada"
        description="Esse registro pode não existir no banco atual, ter sido removido ou não estar disponível neste ambiente."
        action={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshRequests()}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Atualizando..." : "Recarregar lista"}
            </Button>
            <Link
              href="/painel-saf"
              className="inline-flex items-center rounded-[8px] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
            >
              Voltar ao painel
            </Link>
          </>
        }
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
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
            Operação interna do SAF
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
            {canUpdateStatus
              ? "Revise o resumo da solicitação, atualize o status e copie os textos gerados automaticamente para comercial, diretoria, atendimento e Magento."
              : `Revise o resumo da solicitação, consulte o histórico operacional e copie os textos gerados automaticamente. O perfil ${userRoleLabel} não altera status nesta área.`}
          </p>
          {isRefreshing ? (
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Atualizando dados da solicitação...
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/painel-saf"
            className="inline-flex items-center rounded-[8px] border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
          >
            Voltar ao painel
          </Link>
          {canUpdateStatus ? (
            <Link
              href="/solicitacao"
              className="inline-flex items-center rounded-[8px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
            >
              Nova solicitação
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <RequestOverviewCard request={request} />
        <RequestQuickActions request={request} />
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-900">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <GeneratedTextsPanel request={request} />

      <RequestAuditTimeline requestId={request.id} />
    </div>
  );
}
