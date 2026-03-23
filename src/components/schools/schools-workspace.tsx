"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, RefreshCcw, Search, ShieldCheck } from "lucide-react";

import type { ApiErrorDetails, ApiResponse } from "@/types/api";
import type { School } from "@/types/school";

import {
  schoolFormDefaultValues,
  type SchoolFormInput,
  type SchoolPayload,
} from "@/lib/school-schema";
import { SchoolForm } from "@/components/schools/school-form";
import { SchoolTable } from "@/components/schools/school-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StateCard } from "@/components/ui/state-card";
import { useAuthSession } from "@/providers/auth-provider";

interface SchoolsListData {
  schools: School[];
  total: number;
}

interface SchoolData {
  school: School;
}

type FormMode = "create" | "edit" | null;

class SchoolsApiError extends Error {
  code?: string;
  details?: Record<string, unknown> | ApiErrorDetails;

  constructor(
    message: string,
    options: {
      code?: string;
      details?: Record<string, unknown> | ApiErrorDetails;
    } = {},
  ) {
    super(message);
    this.name = "SchoolsApiError";
    this.code = options.code;
    this.details = options.details;
  }
}

const PAGE_SIZE = 25;

function sortSchools(schools: School[]) {
  return [...schools].sort((left, right) => {
    const byName = left.schoolName.localeCompare(right.schoolName, "pt-BR");

    if (byName !== 0) {
      return byName;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

async function readApiResponse<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

function buildMessage(
  status: number,
  fallback: string,
  code?: string,
) {
  if (status === 401 || code === "AUTH_REQUIRED") {
    return "Sua sessão interna expirou ou você não tem acesso a está área. Faça login novamente para continuar.";
  }

  if (status === 403 || code === "FORBIDDEN" || code === "OUT_OF_SCOPE") {
    return "Você não tem permissão para executar está operação com o perfil atual.";
  }

  if (code === "SCHOOL_NOT_FOUND") {
    return "A escola procurada não foi encontrada no banco atual.";
  }

  return fallback;
}

async function unwrapApiData<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = await readApiResponse<T>(response);

  if (response.ok && payload.success) {
    return payload.data;
  }

  if (!payload.success) {
    throw new SchoolsApiError(
      buildMessage(response.status, payload.error.message, payload.error.code),
      {
        code: payload.error.code,
        details:
          payload.error.details &&
          typeof payload.error.details === "object"
            ? payload.error.details
            : undefined,
      },
    );
  }

  throw new SchoolsApiError(buildMessage(response.status, fallbackMessage));
}

function toSchoolFormValues(school?: School): SchoolFormInput {
  if (!school) {
    return schoolFormDefaultValues;
  }

  return {
    externalSchoolId: school.externalSchoolId ?? "",
    schoolName: school.schoolName,
    schoolEmail: school.schoolEmail ?? "",
    schoolStatus: school.schoolStatus ?? "",
    cluster: school.cluster ?? "",
    safOwner: school.safOwner ?? "",
    city: school.city ?? "",
    state: school.state ?? "",
    cnpj: school.cnpj ?? "",
    tradeName: school.tradeName ?? "",
    region: school.region ?? "",
    contactPhone: school.contactPhone ?? "",
  };
}

export function SchoolsWorkspace() {
  const { hasPermission, userRoleLabel } = useAuthSession();
  const [schools, setSchools] = useState<School[]>([]);
  const [totalSchools, setTotalSchools] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [externalIdQuery, setExternalIdQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const canCreateSchool = hasPermission("schools.create");
  const canEditSchool =
    hasPermission("schools.update_operational") ||
    hasPermission("schools.update_admin");
  const canEditAdminFields = hasPermission("schools.update_admin");

  const selectedSchool =
    selectedSchoolId !== null
      ? schools.find((school) => school.id === selectedSchoolId)
      : undefined;

  async function fetchSchools() {
    const response = await fetch("/api/schools", {
      cache: "no-store",
    });
    const data = await unwrapApiData<SchoolsListData>(
      response,
      "Não foi possível carregar a base de escolas.",
    );

    return data;
  }

  async function refreshSchools() {
    setIsRefreshing(true);

    try {
      const data = await fetchSchools();
      setSchools(sortSchools(data.schools));
      setTotalSchools(data.total);
      setError(null);
      setErrorCode(null);
    } catch (refreshError) {
      setSchools([]);
      setTotalSchools(0);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Não foi possível carregar as escolas.",
      );
      setErrorCode(
        refreshError instanceof SchoolsApiError
          ? refreshError.code ?? null
          : null,
      );
    } finally {
      setIsReady(true);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    // Initial load for the internal schools area.
    void refreshSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameQuery, externalIdQuery]);

  useEffect(() => {
    if (
      selectedSchoolId &&
      !schools.some((school) => school.id === selectedSchoolId)
    ) {
      setSelectedSchoolId(null);
      setFormMode("create");
    }
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    if (formMode === "create" && !canCreateSchool) {
      setFormMode(null);
    }

    if (formMode === "edit" && !canEditSchool) {
      setFormMode(null);
      setSelectedSchoolId(null);
    }
  }, [canCreateSchool, canEditSchool, formMode]);

  const normalizedNameQuery = nameQuery.trim().toLocaleLowerCase("pt-BR");
  const normalizedExternalIdQuery = externalIdQuery
    .trim()
    .toLocaleLowerCase("pt-BR");
  const hasActiveFilters =
    normalizedNameQuery !== "" || normalizedExternalIdQuery !== "";
  const filteredSchools = schools.filter((school) => {
    const matchesName =
      normalizedNameQuery === "" ||
      school.schoolName.toLocaleLowerCase("pt-BR").includes(normalizedNameQuery);
    const matchesExternalId =
      normalizedExternalIdQuery === "" ||
      (school.externalSchoolId ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedExternalIdQuery);

    return matchesName && matchesExternalId;
  });
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSchools = filteredSchools.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const schoolsWithExternalId = schools.filter(
    (school) => school.externalSchoolId,
  ).length;

  async function createSchool(values: SchoolPayload) {
    if (!canCreateSchool) {
      return;
    }

    const response = await fetch("/api/schools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    const data = await unwrapApiData<SchoolData>(
      response,
      "Não foi possível cadastrar a escola.",
    );

    setSchools((currentSchools) =>
      sortSchools([data.school, ...currentSchools]),
    );
    setTotalSchools((currentTotal) => currentTotal + 1);
    setFeedbackMessage("Escola cadastrada com sucesso.");
    setNameQuery("");
    setExternalIdQuery("");
    setCurrentPage(1);
    setFormMode("create");
    setSelectedSchoolId(null);
  }

  async function editSchool(values: SchoolPayload) {
    if (!selectedSchool || !canEditSchool) {
      return;
    }

    const response = await fetch(`/api/schools/${selectedSchool.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    const data = await unwrapApiData<SchoolData>(
      response,
      "Não foi possível atualizar a escola.",
    );

    setSchools((currentSchools) =>
      sortSchools(
        currentSchools.map((school) =>
          school.id === data.school.id ? data.school : school,
        ),
      ),
    );
    setFeedbackMessage("Dados da escola atualizados com sucesso.");
    setFormMode("edit");
    setSelectedSchoolId(data.school.id);
  }

  async function handleSubmitSchool(values: SchoolPayload) {
    setFeedbackMessage(null);

    if (formMode === "edit") {
      await editSchool(values);
      return;
    }

    await createSchool(values);
  }

  function handleOpenCreateForm() {
    if (!canCreateSchool) {
      return;
    }

    setFeedbackMessage(null);
    setFormMode("create");
    setSelectedSchoolId(null);
  }

  function handleOpenEditForm(school: School) {
    if (!canEditSchool) {
      return;
    }

    setFeedbackMessage(null);
    setFormMode("edit");
    setSelectedSchoolId(school.id);
  }

  function handleCloseForm() {
    setFormMode(null);
    setSelectedSchoolId(null);
    setFeedbackMessage(null);
  }

  function handleClearFilters() {
    setNameQuery("");
    setExternalIdQuery("");
    setCurrentPage(1);
  }

  if (!isReady) {
    return (
      <StateCard
        tone="loading"
        title="Carregando base de escolas"
        description="Buscando as franquias cadastradas, validando sua sessão interna e preparando a área de consulta."
      />
    );
  }

  if (error && schools.length === 0) {
    return (
      <StateCard
        tone="error"
        title={
          errorCode === "AUTH_REQUIRED"
            ? "Sessão interna expirada"
            : "Falha ao carregar escolas"
        }
        description={error}
        action={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshSchools()}
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
    );
  }

  return (
    <div className="space-y-7">
      <section className="space-y-5 pt-4">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--color-primary)]">
            Voucher Maple Bear
          </p>

          <div className="space-y-3">
            <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[0.96] tracking-tight text-[var(--color-foreground)] md:text-6xl">
              Base interna de escolas
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--color-foreground)]/88">
              Consulte a base importada, localize franquias com rapidez e
              mantenha o cadastro interno pronto para os proximos módulos.
            </p>
          </div>

          {isRefreshing ? (
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Atualizando base de escolas
            </p>
          ) : null}
          {!canCreateSchool || !canEditSchool ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Perfil atual: {userRoleLabel}.{" "}
              {canEditSchool
                ? "Edição operacional permitida, sem cadastro de novas escolas."
                : "Consulta liberada, sem criar ou editar escolas."}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Escolas cadastradas
            </p>
            <p className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {totalSchools}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Base interna pronta para uso pelos proximos módulos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Com ID externo
            </p>
            <p className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {schoolsWithExternalId}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Registros prontos para integrações futuras por identificador.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Resultado atual
            </p>
            <p className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {filteredSchools.length}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Escolas visíveis com os filtros aplicados nesta tela.
            </p>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-red-900">
            <span>{error}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshSchools()}
              disabled={isRefreshing}
            >
              <RefreshCcw className="size-4" />
              {isRefreshing ? "Atualizando..." : "Recarregar"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
                    Consulta interna
                  </p>
                  <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                    Buscar e navegar pela base
                  </h2>
                  <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
                    Use nome da escola ou ID externo para localizar rapidamente
                    o cadastro certo.
                  </p>
                </div>

                {canCreateSchool ? (
                  <Button type="button" onClick={handleOpenCreateForm}>
                    <Building2 className="size-4" />
                    Adicionar nova escola
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_280px]">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Buscar por nome
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                    <Input
                      className="pl-11"
                      placeholder="Ex.: Maple Bear Pindamonhangaba"
                      value={nameQuery}
                      onChange={(event) => setNameQuery(event.target.value)}
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Buscar por ID externo
                  </span>
                  <Input
                    placeholder="Ex.: 790"
                    value={externalIdQuery}
                    onChange={(event) => setExternalIdQuery(event.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Exibindo {paginatedSchools.length} de {filteredSchools.length} escolas
                  filtradas.
                </p>

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearFilters}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {schools.length === 0 ? (
            <StateCard
              tone="empty"
              title="Nenhuma escola cadastrada"
              description="A base ainda não possui registros. Você pode adicionar a primeira escola manualmente nesta área interna."
              action={
                canCreateSchool ? (
                  <Button type="button" onClick={handleOpenCreateForm}>
                    Adicionar nova escola
                  </Button>
                ) : undefined
              }
            />
          ) : filteredSchools.length === 0 ? (
            <StateCard
              tone="search"
              title="Nenhum resultado para os filtros atuais"
              description="Ajuste a busca por nome ou ID externo para encontrar a escola desejada."
              action={
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClearFilters}
                  >
                    Limpar filtros
                  </Button>
                  {canCreateSchool ? (
                    <Button type="button" onClick={handleOpenCreateForm}>
                      Adicionar nova escola
                    </Button>
                  ) : null}
                </>
              }
            />
          ) : (
            <>
              <SchoolTable
                canEdit={canEditSchool}
                schools={paginatedSchools}
                onEdit={handleOpenEditForm}
              />

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Pagina {safePage} de {totalPages}
                  </p>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safePage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={safePage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          {feedbackMessage ? (
            <Card className="border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(220,252,231,0.92))]">
              <CardContent className="flex items-start gap-3 py-5">
                <span className="mt-1 inline-flex size-10 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-lg shadow-emerald-900/20">
                  <ShieldCheck className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Operação concluida
                  </p>
                  <p className="text-sm leading-7 text-emerald-950">
                    {feedbackMessage}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {formMode ? (
            <SchoolForm
              key={formMode === "edit" ? selectedSchool?.id ?? "edit" : "create"}
              canEditAdminFields={canEditAdminFields}
              mode={formMode}
              initialValues={toSchoolFormValues(selectedSchool)}
              onSubmitForm={handleSubmitSchool}
              onCancel={handleCloseForm}
            />
          ) : (
            <Card className="sticky top-28">
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                  {canCreateSchool || canEditSchool ? "Ação rápida" : "Perfil atual"}
                </p>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {canCreateSchool
                    ? "Cadastre ou edite sem sair da lista"
                    : canEditSchool
                      ? "Edite escolas existentes pela lista"
                      : "Consulta da base interna"}
                </h2>
                <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
                  {canCreateSchool
                    ? "Clique em \"Adicionar nova escola\" para um cadastro manual ou use \"Editar\" em qualquer linha da tabela para ajustar os dados principais."
                    : canEditSchool
                      ? "Use \"Editar\" nas linhas da tabela para ajustar campos operacionais. Campos administrativos continuam restritos ao perfil admin."
                      : "Seu perfil está configurado para consulta. A tabela e o detalhe da escola continuam disponíveis, sem ações de cadastro ou edição."}
                </p>
                {canCreateSchool ? (
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={handleOpenCreateForm}>
                      Adicionar nova escola
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
