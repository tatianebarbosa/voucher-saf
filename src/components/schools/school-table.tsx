"use client";

import Link from "next/link";

import type { School } from "@/types/school";

import { SchoolStatusBadge } from "@/components/schools/school-status-badge";
import { Card, CardContent } from "@/components/ui/card";

interface SchoolTableProps {
  schools: School[];
  onEdit: (school: School) => void;
  canEdit?: boolean;
  emptyMessage?: string;
}

export function SchoolTable({
  schools,
  onEdit,
  canEdit = true,
  emptyMessage = "Nenhuma escola encontrada para os filtros atuais.",
}: SchoolTableProps) {
  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-4 font-semibold">ID externo</th>
                <th className="px-6 py-4 font-semibold">Escola</th>
                <th className="px-6 py-4 font-semibold">E-mail</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Cluster</th>
                <th className="px-6 py-4 font-semibold">Carteira SAF</th>
                <th className="px-6 py-4 font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-[var(--color-muted-foreground)]"
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
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {school.externalSchoolId || "Não informado"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-semibold">{school.schoolName}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {school.city && school.state
                          ? `${school.city} - ${school.state}`
                          : school.city ||
                            school.state ||
                            "Localização não informada"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {school.schoolEmail || "Não informado"}
                  </td>
                  <td className="px-6 py-5">
                    <SchoolStatusBadge status={school.schoolStatus} />
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {school.cluster || "Não informado"}
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {school.safOwner || "Não informado"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/escolas/${school.id}`}
                        className="inline-flex items-center rounded-[8px] border border-[var(--color-border-strong)] px-4 py-2 font-semibold text-[var(--color-primary)] transition hover:bg-red-50"
                      >
                        Abrir detalhe
                      </Link>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(school)}
                          className="inline-flex items-center rounded-[8px] border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-muted)]"
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
