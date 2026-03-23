import { RequestStatusBadge, RequestTypeBadge } from "@/components/requests/request-badges";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDateTime,
  formatCondition,
  formatCpf,
  formatRequesterSummaryLabel,
  formatRequesterType,
  formatRequestType,
} from "@/lib/formatters";
import {
  buildFamilyResponsiblesSummary,
  buildStudentClassesSummary,
  buildStudentNamesSummary,
  countRequestFamilies,
  countRequestStudents,
  getRequestFamilyGroups,
  hasMultipleFamilies,
} from "@/lib/request-family-groups";
import type { VoucherRequest } from "@/types/request";

function SummaryItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "space-y-2 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-4"
          : "space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

export function RequestOverviewCard({ request }: { request: VoucherRequest }) {
  const familyGroups = getRequestFamilyGroups(request);
  const showMultipleFamiliesSummary = hasMultipleFamilies(request);
  const isVoucherSplitRequest = request.requestType === "desmembramento";
  const studentNames =
    familyGroups.length > 0
      ? buildStudentNamesSummary(familyGroups)
      : request.studentNames || "Não informado";
  const studentClasses =
    familyGroups.length > 0
      ? buildStudentClassesSummary(familyGroups)
      : request.studentClassName || "Não informado";
  const familyResponsibles =
    familyGroups.length > 0
      ? buildFamilyResponsiblesSummary(familyGroups)
      : "Não informado";

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Resumo da solicitação
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)] md:text-3xl">
              {request.schoolName}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
              {request.justification}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <RequestTypeBadge requestType={request.requestType} />
            <RequestStatusBadge status={request.status} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Escola" value={request.schoolName} highlight />
          <SummaryItem
            label="Código do atendimento"
            value={request.ticketNumber}
            highlight
          />
          <SummaryItem
            label="Tipo da solicitação"
            value={formatRequestType(request.requestType)}
            highlight
          />
          <SummaryItem
            label="Condição solicitada"
            value={formatCondition(request)}
            highlight
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryItem
            label="Tipo de solicitante"
            value={formatRequesterType(request.requesterType)}
          />
          <SummaryItem
            label={formatRequesterSummaryLabel(request.requesterType)}
            value={request.requesterName}
          />
          <SummaryItem label="Origem" value={request.origin} />
          <SummaryItem
            label="Validade automática"
            value={request.generatedTexts.validityLabel}
          />
          {request.decisionReason ? (
            <SummaryItem
              label={
                request.status === "Negada"
                  ? "Motivo da negativa"
                  : "Motivo da aprovação"
              }
              value={request.decisionReason}
            />
          ) : null}
          {showMultipleFamiliesSummary && !isVoucherSplitRequest ? (
            <SummaryItem
              label="Famílias na solicitação"
              value={`${countRequestFamilies(familyGroups)} família(s) / ${countRequestStudents(familyGroups)} aluno(s)`}
            />
          ) : null}
          <SummaryItem
            label="Aluno(s)"
            value={isVoucherSplitRequest ? "Não se aplica" : studentNames}
          />
          <SummaryItem
            label="Turma(s)"
            value={isVoucherSplitRequest ? "Não se aplica" : studentClasses}
          />
          {isVoucherSplitRequest ? (
            <>
              <SummaryItem
                label="Código do voucher"
                value={request.campaignVoucherCode || "Não informado"}
              />
              <SummaryItem
                label="Como deseja desmembrar"
                value={request.splitInstruction || "Não informado"}
              />
            </>
          ) : showMultipleFamiliesSummary ? (
            <SummaryItem
              label="Responsáveis das famílias"
              value={familyResponsibles}
            />
          ) : (
            <>
              <SummaryItem
                label="Responsável financeiro"
                value={`${request.responsible1Name} - ${formatCpf(request.responsible1Cpf)}`}
              />
              <SummaryItem
                label="Responsável acadêmico"
                value={`${request.responsible2Name} - ${formatCpf(request.responsible2Cpf)}`}
              />
            </>
          )}
          <SummaryItem
            label="Código do voucher"
            value={request.generatedTexts.voucherCode || "Não se aplica"}
          />
        </div>

        <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 md:grid-cols-2">
          <SummaryItem label="Recebida em" value={formatDateTime(request.createdAt)} />
          <SummaryItem
            label="Última atualização"
            value={formatDateTime(request.updatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
