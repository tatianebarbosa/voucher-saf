"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { School } from "@/types/school";

import { SchoolStatusBadge } from "@/components/schools/school-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SchoolTableFilterField =
  | "externalSchoolId"
  | "schoolName"
  | "schoolEmail"
  | "schoolStatus"
  | "cluster"
  | "safOwner";

export interface SchoolTableFilters {
  externalSchoolId: string;
  schoolName: string;
  schoolEmail: string;
  schoolStatus: string;
  cluster: string;
  safOwner: string;
}

interface SchoolTableProps {
  schools: School[];
  onEdit: (school: School) => void;
  canEdit?: boolean;
  emptyMessage?: string;
  filters: SchoolTableFilters;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onFilterChange: (field: SchoolTableFilterField, value: string) => void;
}

const FILTERABLE_HEADERS: Array<{
  field: SchoolTableFilterField;
  label: string;
  widthClassName: string;
}> = [
  {
    field: "externalSchoolId",
    label: "ID externo",
    widthClassName: "w-[6rem]",
  },
  {
    field: "schoolName",
    label: "Escola",
    widthClassName: "w-[19%]",
  },
  {
    field: "schoolEmail",
    label: "E-mail",
    widthClassName: "w-[18%]",
  },
  {
    field: "schoolStatus",
    label: "Status",
    widthClassName: "w-[8rem]",
  },
  {
    field: "cluster",
    label: "Cluster",
    widthClassName: "w-[12%]",
  },
  {
    field: "safOwner",
    label: "Carteira SAF",
    widthClassName: "w-[14%]",
  },
];

export function SchoolTable({
  schools,
  onEdit,
  canEdit = true,
  emptyMessage = "Nenhuma escola encontrada para os filtros atuais.",
  filters,
  hasActiveFilters = false,
  onClearFilters,
  onFilterChange,
}: SchoolTableProps) {
  const [activeFilterField, setActiveFilterField] =
    useState<SchoolTableFilterField | null>(null);
  const activeFilterInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!activeFilterField) {
      return;
    }

    activeFilterInputRef.current?.focus();
    activeFilterInputRef.current?.select();
  }, [activeFilterField]);

  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                {FILTERABLE_HEADERS.map(({ field, label, widthClassName }) => {
                  const isEditingFilter = activeFilterField === field;
                  const currentValue = filters[field];

                  return (
                    <th
                      key={field}
                      className={`${widthClassName} px-4 py-3 align-top`}
                    >
                      {isEditingFilter ? (
                        <Input
                          ref={activeFilterInputRef}
                          className="h-11 px-2.5 text-xs"
                          placeholder={`Filtrar ${label.toLowerCase()}`}
                          value={currentValue}
                          onChange={(event) =>
                            onFilterChange(field, event.target.value)
                          }
                          onBlur={() => setActiveFilterField(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape" || event.key === "Enter") {
                              setActiveFilterField(null);
                              event.currentTarget.blur();
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex min-h-[2.75rem] w-full flex-col items-start justify-center text-left"
                          onDoubleClick={() => setActiveFilterField(field)}
                        >
                          <span className="font-semibold">{label}</span>
                          {currentValue ? (
                            <span className="max-w-full truncate text-[11px] leading-4 text-[var(--color-primary)]">
                              {currentValue}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </th>
                  );
                })}
                <th className="w-[9.5rem] px-4 py-3 align-top">
                  <div className="flex min-h-[2.75rem] flex-col items-start justify-center gap-1">
                    <span className="font-semibold">Acoes</span>
                    {hasActiveFilters && onClearFilters ? (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-strong)]"
                        onClick={onClearFilters}
                      >
                        Limpar filtros
                      </button>
                    ) : null}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}

              {schools.map((school) => (
                <tr
                  key={school.id}
                  className="border-t border-[var(--color-border)] align-top text-[var(--color-foreground)]"
                >
                  <td className="break-words px-4 py-5 text-[var(--color-muted-foreground)]">
                    {school.externalSchoolId || "Não informado"}
                  </td>
                  <td className="px-4 py-5">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{school.schoolName}</p>
                    </div>
                  </td>
                  <td className="break-all px-4 py-5 text-[var(--color-muted-foreground)]">
                    {school.schoolEmail || "Não informado"}
                  </td>
                  <td className="px-4 py-5">
                    <SchoolStatusBadge status={school.schoolStatus} />
                  </td>
                  <td className="break-words px-4 py-5 text-[var(--color-muted-foreground)]">
                    {school.cluster || "Não informado"}
                  </td>
                  <td className="break-words px-4 py-5 text-[var(--color-muted-foreground)]">
                    {school.safOwner || "Não informado"}
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/escolas/${school.id}`}
                        className="inline-flex w-full items-center justify-center rounded-[8px] border border-[var(--color-border-strong)] px-3 py-2 font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
                      >
                        Abrir detalhe
                      </Link>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(school)}
                          className="inline-flex w-full items-center justify-center rounded-[8px] border border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-muted)]"
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          Perfil de consulta: edição indisponível.
                        </span>
                      )}
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
