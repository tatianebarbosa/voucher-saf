"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ApiResponse } from "@/types/api";
import type { SchoolDetails } from "@/types/school";

import { SchoolRequestHistoryTable } from "@/components/schools/school-request-history-table";
import { SchoolStatusBadge } from "@/components/schools/school-status-badge";
import { SchoolVoucherTable } from "@/components/schools/school-voucher-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import { formatDateTime } from "@/lib/formatters";

interface SchoolDetailsWorkspaceProps {
  schoolId: string;
}

class SchoolDetailsApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "SchoolDetailsApiError";
    this.code = code;
  }
}

async function readApiResponse<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

function buildMessage(status: number, fallback: string, code?: string) {
  if (status === 401 || code === "AUTH_REQUIRED") {
    return "Sua sessão interna expirou ou você não tem acesso a está área. Faça login novamente para continuar.";
  }

  if (status === 403 || code === "FORBIDDEN" || code === "OUT_OF_SCOPE") {
    return "Você não tem permissão para acessar está operação com o perfil atual.";
  }

  if (code === "SCHOOL_NOT_FOUND") {
    return "A escola procurada não foi encontrada no banco atual.";
  }

  return fallback;
}

async function unwrapApiData<T>(response: Response, fallbackMessage: string) {
  const payload = await readApiResponse<T>(response);

  if (response.ok && payload.success) {
    return payload.data;
  }

  const message = payload.success
    ? buildMessage(response.status, fallbackMessage)
    : buildMessage(response.status, payload.error.message, payload.error.code);
  const code = payload.success ? undefined : payload.error.code;

  throw new SchoolDetailsApiError(message, code);
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-[12px] bg-[rgba(247,249,252,0.72)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="text-sm leading-6 text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

export function SchoolDetailsWorkspace({
  schoolId,
}: SchoolDetailsWorkspaceProps) {
  const [details, setDetails] = useState<SchoolDetails | null>(null);
  const [page, setPage] = useState(1);
  const [voucherPage, setVoucherPage] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function refreshDetails(
    targetPage = page,
    targetVoucherPage = voucherPage,
  ) {
    setIsRefreshing(true);
    setError(null);
    setErrorCode(null);

    try {
      const searchParams = new URLSearchParams({
        page: String(targetPage),
        voucherPage: String(targetVoucherPage),
      });
      const response = await fetch(`/api/schools/${schoolId}?${searchParams}`, {
        cache: "no-store",
      });
      const data = await unwrapApiData<SchoolDetails>(
        response,
        "Não foi possível carregar o detalhe da escola.",
      );

      setDetails(data);
      setPage(data.pagination.page);
      setVoucherPage(data.voucherPagination.page);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Não foi possível carregar o detalhe da escola.",
      );
      setErrorCode(
        refreshError instanceof SchoolDetailsApiError
          ? refreshError.code ?? null
          : null,
      );
    } finally {
      setIsReady(true);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setVoucherPage(1);
    setDetails(null);
    setError(null);
    setErrorCode(null);
    setIsReady(false);
    void refreshDetails(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  function handlePageChange(nextPage: number) {
    if (!details) {
      return;
    }

    if (
      nextPage < 1 ||
      nextPage > details.pagination.totalPages ||
      nextPage === details.pagination.page
    ) {
      return;
    }

    void refreshDetails(nextPage, voucherPage);
  }

  function handleVoucherPageChange(nextPage: number) {
    if (!details) {
      return;
    }

    if (
      nextPage < 1 ||
      nextPage > details.voucherPagination.totalPages ||
      nextPage === details.voucherPagination.page
    ) {
      return;
    }

    void refreshDetails(page, nextPage);
  }

  if (!isReady) {
    return (
      <StateCard
        tone="loading"
        title="Carregando detalhe da escola"
        description="Buscando os dados principais da unidade, o histórico de solicitações e os vouchers/campanhas vinculados."
      />
    );
  }

  if (error && !details) {
    return (
      <StateCard
        tone={errorCode === "SCHOOL_NOT_FOUND" ? "empty" : "error"}
        title={
          errorCode === "SCHOOL_NOT_FOUND"
            ? "Escola não encontrada"
            : errorCode === "AUTH_REQUIRED"
              ? "Sessão interna expirada"
              : "Falha ao carregar detalhe da escola"
        }
        description={error}
        action={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshDetails()}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Atualizando..." : "Tentar novamente"}
            </Button>
            <Link
              href={errorCode === "AUTH_REQUIRED" ? "/login" : "/escolas"}
              className="inline-flex items-center rounded-[8px] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
            >
              {errorCode === "AUTH_REQUIRED"
                ? "Fazer login novamente"
                : "Voltar para escolas"}
            </Link>
          </>
        }
      />
    );
  }

  if (!details) {
    return null;
  }

  const { school, requests, pagination, vouchers, voucherPagination } = details;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            Detalhe da escola
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            {school.schoolName}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
            Resumo da unidade, histórico de exceções e vouchers/campanhas
            vinculados a está escola.
          </p>
          {isRefreshing ? (
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Atualizando dados da escola...
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/escolas"
            className="inline-flex items-center rounded-[8px] border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
          >
            Voltar para escolas
          </Link>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refreshDetails()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-red-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {errorCode === "AUTH_REQUIRED"
                  ? "Sessão interna expirada durante a atualização"
                  : "Falha ao atualizar os dados da escola"}
              </p>
              <p className="max-w-3xl text-sm leading-6 text-red-900/80">
                {error}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshDetails()}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Atualizando..." : "Tentar novamente"}
              </Button>
              <Link
                href={errorCode === "AUTH_REQUIRED" ? "/login" : "/escolas"}
                className="inline-flex items-center rounded-[8px] border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-red-100"
              >
                {errorCode === "AUTH_REQUIRED"
                  ? "Fazer login novamente"
                  : "Voltar para escolas"}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="border-[rgba(119,137,166,0.14)] bg-white/80 shadow-[0_20px_48px_-42px_rgba(22,39,68,0.2)]">
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
                Resumo da unidade
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                Dados principais
              </h2>
            </div>

            <SchoolStatusBadge status={school.schoolStatus} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryItem label="Escola" value={school.schoolName} />
            <SummaryItem
              label="ID externo"
              value={school.externalSchoolId || "Não informado"}
            />
            <SummaryItem
              label="E-mail"
              value={school.schoolEmail || "Não informado"}
            />
            <SummaryItem
              label="Status"
              value={school.schoolStatus || "Não informado"}
            />
            <SummaryItem
              label="Cluster"
              value={school.cluster || "Não informado"}
            />
            <SummaryItem
              label="Carteira SAF"
              value={school.safOwner || "Não informado"}
            />
            <SummaryItem label="Cidade" value={school.city || "Não informado"} />
            <SummaryItem label="Estado" value={school.state || "Não informado"} />
            <SummaryItem label="CNPJ" value={school.cnpj || "Não informado"} />
          </div>

          <div className="grid gap-4 rounded-[12px] bg-[rgba(247,249,252,0.72)] p-3 md:grid-cols-2">
            <SummaryItem label="Criada em" value={formatDateTime(school.createdAt)} />
            <SummaryItem
              label="Última atualização"
              value={formatDateTime(school.updatedAt)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            Histórico
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Solicitações vinculadas a unidade
          </h2>
          <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
            Lista paginada de vouchers de exceção e liberações registradas para
            está escola. Total atual: {pagination.total}.
          </p>
        </div>

        {requests.length === 0 ? (
          <StateCard
            tone="empty"
            title="Nenhuma solicitação vinculada"
            description="Está unidade ainda não possui solicitações de voucher de exceção registradas no banco atual."
          />
        ) : (
          <SchoolRequestHistoryTable
            requests={requests}
            pagination={pagination}
            isRefreshing={isRefreshing}
            onPageChange={handlePageChange}
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
            Vouchers
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Vouchers e Campanhas da Unidade
          </h2>
          <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
            Vouchers operacionais e campanhas vinculados a está escola. Total
            atual: {voucherPagination.total}.
          </p>
        </div>

        {vouchers.length === 0 ? (
          <StateCard
            tone="empty"
            title="Nenhum voucher vinculado"
            description="Está unidade ainda não possui vouchers ou campanhas vinculados no banco atual."
          />
        ) : (
          <SchoolVoucherTable
            vouchers={vouchers}
            pagination={voucherPagination}
            isRefreshing={isRefreshing}
            onPageChange={handleVoucherPageChange}
          />
        )}
      </section>
    </div>
  );
}
