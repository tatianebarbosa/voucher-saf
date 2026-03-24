"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileText,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";

import { SchoolAutocompleteField } from "@/components/requests/school-autocomplete-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCondition,
  formatCpfInput,
  formatRequesterFieldLabel,
  formatRequesterSummaryLabel,
  formatRequesterType,
  formatRequestType,
} from "@/lib/formatters";
import { INTERNAL_SAF_AGENT_OPTIONS } from "@/data/internal-saf-consultants";
import {
  buildFamilyResponsiblesSummary,
  buildStudentClassesSummary,
  buildStudentNamesSummary,
  countRequestFamilies,
  countRequestStudents,
  createEmptyRequestFamilyGroup,
  createEmptyRequestStudent,
  getRequestFamilyGroups,
} from "@/lib/request-family-groups";
import {
  REQUEST_INSTALLMENT_OPTIONS,
  REQUEST_ORIGIN_OPTIONS,
  requestFormDefaultValues,
  requestFormSchema,
  type RequestFormData,
} from "@/lib/request-schema";
import { cn } from "@/lib/utils";
import { useRequests } from "@/providers/requests-provider";
import type { PublicSchoolOption } from "@/types/school";
import type { VoucherRequest } from "@/types/request";

const REQUEST_CLASS_OPTIONS = [
  "Early Toddler (Bear Care)",
  "Toddler",
  "Nursery",
  "Junior Kindergarten",
  "Senior Kindergarten",
  ...Array.from({ length: 12 }, (_, index) => `Year ${index + 1}`),
];

function FieldShell({
  label,
  hint,
  error,
  required = true,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold text-[var(--color-foreground)]">
        {label}
        {required ? <span className="text-[var(--color-primary)]"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs text-[var(--color-muted-foreground)]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
          <CircleAlert className="size-3.5" />
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-[var(--radius-lg)] border border-emerald-200 bg-white/90 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {label}
      </p>
      <p className="whitespace-pre-line text-sm leading-6 text-emerald-950">
        {value}
      </p>
    </div>
  );
}

function RequestSuccessModal({
  request,
  requestFamilyGroups,
  onClose,
}: {
  request: VoucherRequest;
  requestFamilyGroups: ReturnType<typeof getRequestFamilyGroups>;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.55)] p-4 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex max-h-[calc(100svh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(220,252,231,0.95))] shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] sm:max-h-[calc(100svh-3rem)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-success-title"
          aria-describedby="request-success-description"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-emerald-200/80 px-5 py-5 md:px-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-emerald-600 text-white shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Solicitação registrada
                </p>
                <h3
                  id="request-success-title"
                  className="font-heading text-2xl font-bold tracking-tight text-emerald-950"
                >
                  Envio concluído com sucesso
                </h3>
                <p
                  id="request-success-description"
                  className="max-w-3xl text-sm leading-6 text-emerald-900/80"
                >
                  A solicitação foi salva no sistema e já está disponível para
                  consulta no painel SAF e na tela de detalhe.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fechar confirmação"
              className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-emerald-200 bg-white/80 text-emerald-900 transition hover:bg-white"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryItem label="Escola" value={request.schoolName} />
              <SummaryItem
                label="Código do atendimento"
                value={request.ticketNumber}
              />
              <SummaryItem
                label="Famílias"
                value={
                  request.requestType === "desmembramento"
                    ? "Não se aplica"
                    : `${countRequestFamilies(requestFamilyGroups)} família(s) / ${countRequestStudents(requestFamilyGroups)} aluno(s)`
                }
              />
              <SummaryItem
                label="Aluno(s)"
                value={
                  request.requestType === "desmembramento"
                    ? "Não se aplica"
                    : requestFamilyGroups.length > 0
                      ? buildStudentNamesSummary(requestFamilyGroups)
                      : request.studentNames || "Não informado"
                }
              />
              <SummaryItem
                label="Turma(s)"
                value={
                  request.requestType === "desmembramento"
                    ? "Não se aplica"
                    : requestFamilyGroups.length > 0
                      ? buildStudentClassesSummary(requestFamilyGroups)
                      : request.studentClassName || "Não informado"
                }
              />
              <SummaryItem
                label="Tipo"
                value={formatRequestType(request.requestType)}
              />
              <SummaryItem
                label="Condição"
                value={formatCondition(request)}
              />
              {request.requestType === "desmembramento" ? (
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
              ) : null}
              <SummaryItem
                label="Tipo de solicitante"
                value={formatRequesterType(request.requesterType)}
              />
              <SummaryItem
                label="Validade automática"
                value={request.generatedTexts.validityLabel}
              />
              <SummaryItem
                label={formatRequesterSummaryLabel(request.requesterType)}
                value={request.requesterName}
              />
              <SummaryItem
                label="Responsáveis"
                value={
                  request.requestType === "desmembramento"
                    ? "Não se aplica"
                    : requestFamilyGroups.length > 0
                      ? buildFamilyResponsiblesSummary(requestFamilyGroups)
                      : `${request.responsible1Name} e ${request.responsible2Name}`
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-emerald-200/80 bg-white/55 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <p className="text-sm text-emerald-900/80">
              Confira os dados da solicitação recém-registrada e feche quando
              terminar.
            </p>

            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstallmentPlanSelect({
  value,
  hasError = false,
  onChange,
  onBlur,
}: {
  value?: number;
  hasError?: boolean;
  onChange: (value?: number) => void;
  onBlur?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onBlur]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        data-invalid={hasError ? "true" : "false"}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-4 text-left text-sm text-[var(--color-foreground)] outline-none transition",
          "focus:border-[var(--color-primary)] focus:ring-4 focus:ring-red-100",
          "data-[invalid=true]:border-red-400 data-[invalid=true]:bg-red-50/60 data-[invalid=true]:focus:ring-red-100",
          hasError
            ? "border-red-400"
            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        )}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={cn(
            value ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]",
          )}
        >
          {value ? `${value}x sem juros` : "Selecione de 1x a 12x"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-[var(--color-muted-foreground)] transition",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[0_24px_70px_-48px_rgba(22,39,68,0.45)]">
          <div className="max-h-72 overflow-y-auto py-2">
            {REQUEST_INSTALLMENT_OPTIONS.map((installmentCount) => {
              const isSelected = value === installmentCount;

              return (
                <button
                  key={installmentCount}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-center border-b border-[var(--color-border)]/70 px-4 py-3 text-left text-sm transition last:border-b-0",
                    isSelected
                      ? "bg-[var(--color-surface-muted)] font-medium text-[var(--color-foreground)]"
                      : "bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]",
                  )}
                  onClick={() => {
                    onChange(installmentCount);
                    setIsOpen(false);
                    onBlur?.();
                  }}
                >
                  {installmentCount}x sem juros
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FamilyGroupFields({
  index,
  control,
  register,
  errors,
  requesterType,
  canRemoveFamily,
  onRemoveFamily,
}: {
  index: number;
  control: Control<RequestFormData>;
  register: UseFormRegister<RequestFormData>;
  errors: FieldErrors<RequestFormData>;
  requesterType: RequestFormData["requesterType"];
  canRemoveFamily: boolean;
  onRemoveFamily: () => void;
}) {
  const {
    fields: studentFields,
    append: appendStudent,
    remove: removeStudent,
  } = useFieldArray({
    control,
    name: `familyGroups.${index}.students`,
  });
  const familyErrors = errors.familyGroups?.[index];

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/65 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold tracking-tight text-[var(--color-foreground)]">
            {requesterType === "escola"
              ? `Família ${index + 1}`
              : "Família da solicitação"}
          </h3>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {requesterType === "escola"
              ? "Adicione os alunos desta família e os dois responsáveis vinculados ao voucher."
              : "Cadastre os alunos e responsáveis desta família."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => appendStudent(createEmptyRequestStudent())}
          >
            <Plus className="size-4" />
            Adicionar aluno
          </Button>
          {canRemoveFamily ? (
            <Button type="button" variant="ghost" onClick={onRemoveFamily}>
              <Trash2 className="size-4" />
              Remover família
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {studentFields.map((studentField, studentIndex) => {
          const studentErrors = familyErrors?.students?.[studentIndex];

          return (
            <div
              key={studentField.id}
              className="space-y-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Aluno {studentIndex + 1}
                </p>
                {studentFields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeStudent(studentIndex)}
                  >
                    <Trash2 className="size-4" />
                    Remover aluno
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell
                  label="Aluno"
                  error={studentErrors?.studentName?.message?.toString()}
                >
                  <Input
                    aria-invalid={Boolean(studentErrors?.studentName)}
                    placeholder="Ex.: Pedro Mendes"
                    {...register(
                      `familyGroups.${index}.students.${studentIndex}.studentName`,
                    )}
                  />
                </FieldShell>

                <FieldShell
                  label="Turma"
                  error={studentErrors?.studentClassName?.message?.toString()}
                >
                  <Controller
                    control={control}
                    name={`familyGroups.${index}.students.${studentIndex}.studentClassName`}
                    render={({ field }) => (
                      <Select
                        aria-invalid={Boolean(studentErrors?.studentClassName)}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      >
                        <option value="">Selecione a turma</option>
                        {REQUEST_CLASS_OPTIONS.map((classOption) => (
                          <option key={classOption} value={classOption}>
                            {classOption}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </FieldShell>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-4">
          <h4 className="font-heading text-base font-bold tracking-tight text-[var(--color-foreground)]">
            Responsável financeiro
          </h4>
          <FieldShell
            label="Nome completo"
            error={familyErrors?.responsible1Name?.message?.toString()}
          >
            <Input
              aria-invalid={Boolean(familyErrors?.responsible1Name)}
              placeholder="Ex.: Carla Mendes"
              {...register(`familyGroups.${index}.responsible1Name`)}
            />
          </FieldShell>

          <FieldShell
            label="CPF"
            error={familyErrors?.responsible1Cpf?.message?.toString()}
          >
            <Controller
              control={control}
              name={`familyGroups.${index}.responsible1Cpf`}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-invalid={Boolean(familyErrors?.responsible1Cpf)}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  onChange={(event) =>
                    field.onChange(formatCpfInput(event.target.value))
                  }
                />
              )}
            />
          </FieldShell>
        </div>

        <div className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-4">
          <h4 className="font-heading text-base font-bold tracking-tight text-[var(--color-foreground)]">
            Responsável acadêmico
          </h4>
          <FieldShell
            label="Nome completo"
            error={familyErrors?.responsible2Name?.message?.toString()}
          >
            <Input
              aria-invalid={Boolean(familyErrors?.responsible2Name)}
              placeholder="Ex.: Paulo Mendes"
              {...register(`familyGroups.${index}.responsible2Name`)}
            />
          </FieldShell>

          <FieldShell
            label="CPF"
            error={familyErrors?.responsible2Cpf?.message?.toString()}
          >
            <Controller
              control={control}
              name={`familyGroups.${index}.responsible2Cpf`}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-invalid={Boolean(familyErrors?.responsible2Cpf)}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  onChange={(event) =>
                    field.onChange(formatCpfInput(event.target.value))
                  }
                />
              )}
            />
          </FieldShell>
        </div>
      </div>
    </section>
  );
}

export function RequestForm({
  sidebarContent,
}: {
  sidebarContent?: ReactNode;
}) {
  const { addRequest, isReady } = useRequests();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCreatedRequest, setLastCreatedRequest] =
    useState<VoucherRequest | null>(null);
  const [selectedSchoolOption, setSelectedSchoolOption] =
    useState<PublicSchoolOption | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: requestFormDefaultValues,
  });
  const {
    fields: familyGroupFields,
    append: appendFamilyGroup,
    remove: removeFamilyGroup,
    replace: replaceFamilyGroups,
  } = useFieldArray({
    control,
    name: "familyGroups",
  });

  const requestType = useWatch({
    control,
    name: "requestType",
  });
  const requesterType = useWatch({
    control,
    name: "requesterType",
  });
  const originChannel = useWatch({
    control,
    name: "originChannel",
  });
  const familyGroups = useWatch({
    control,
    name: "familyGroups",
  });
  const isVoucherSplitRequest = requestType === "desmembramento";
  const requesterLabel = formatRequesterFieldLabel(requesterType);
  const requesterPlaceholder =
    requesterType === "responsavel" ? "Ex.: Larissa Mendes" : "Ex.: Ana Souza";
  const originReferenceLabel =
    originChannel === "email"
      ? "E-mail do solicitante"
      : "Código informado pelo atendente";
  const originReferencePlaceholder =
    originChannel === "email" ? "Ex.: nome@dominio.com" : "Ex.: TK-10452";
  const shouldShowOriginReferenceField = originChannel === "email";

  useEffect(() => {
    if (requestType === "desconto") {
      setValue("installmentCount", undefined, { shouldValidate: false });
      setValue("campaignVoucherCode", "", { shouldValidate: false });
      setValue("splitInstruction", "", { shouldValidate: false });
      return;
    }

    if (requestType === "parcelamento") {
      setValue("discountPercentage", undefined, { shouldValidate: false });
      setValue("campaignVoucherCode", "", { shouldValidate: false });
      setValue("splitInstruction", "", { shouldValidate: false });
      return;
    }

    setValue("discountPercentage", undefined, { shouldValidate: false });
    setValue("installmentCount", undefined, { shouldValidate: false });
    setValue("requesterType", "escola", { shouldValidate: true });
  }, [requestType, setValue]);

  useEffect(() => {
    if (isVoucherSplitRequest) {
      return;
    }

    if (!familyGroups?.length) {
      replaceFamilyGroups([createEmptyRequestFamilyGroup()]);
      return;
    }

    if (requesterType === "responsavel" && familyGroups.length > 1) {
      replaceFamilyGroups([familyGroups[0]]);
    }
  }, [familyGroups, isVoucherSplitRequest, replaceFamilyGroups, requesterType]);

  useEffect(() => {
    setValue("originReference", "", { shouldValidate: false });
  }, [originChannel, setValue]);

  async function onSubmit(values: RequestFormData) {
    setSubmitError(null);
    setIsSuccessModalOpen(false);

    try {
      const createdRequest = await addRequest(values);
      setLastCreatedRequest(createdRequest);
      setIsSuccessModalOpen(true);
      setSelectedSchoolOption(null);
      reset(requestFormDefaultValues);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a solicitação.",
      );
    }
  }

  const lastCreatedRequestFamilyGroups = lastCreatedRequest
    ? getRequestFamilyGroups(lastCreatedRequest)
    : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.72fr)] lg:items-start">
      <Card>
        <CardContent className="space-y-6 p-5 md:p-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Registro da solicitação
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Dados da solicitação
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              Preencha os dados abaixo com as informações da pessoa que abriu o
              chamado com o SAF. O sistema salva a solicitação e prepara
              automaticamente os textos que serão usados pelo time SAF.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register("schoolId")} />

            <section className="grid gap-4 md:grid-cols-2">
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)] md:col-span-2">
                Informe abaixo os dados da pessoa que abriu o chamado com o SAF e
                use o código do atendimento já criado na plataforma.
              </p>

              <FieldShell label="Nome da escola" error={errors.schoolName?.message}>
                <Controller
                  control={control}
                  name="schoolName"
                  render={({ field }) => (
                    <SchoolAutocompleteField
                      value={field.value}
                      selectedSchool={selectedSchoolOption}
                      hasError={Boolean(errors.schoolName)}
                      onBlur={field.onBlur}
                      onValueChange={(value) => {
                        field.onChange(value);

                        if (selectedSchoolOption?.schoolName !== value) {
                          setSelectedSchoolOption(null);
                          setValue("schoolId", "", { shouldValidate: true });
                        }
                      }}
                      onSelect={(school) => {
                        field.onChange(school.schoolName);
                        setValue("schoolId", school.id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setSelectedSchoolOption(school);
                      }}
                    />
                  )}
                />
              </FieldShell>

              <FieldShell
                label="Código do atendimento"
                error={errors.ticketNumber?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.ticketNumber)}
                  placeholder="Ex.: TK-10452"
                  {...register("ticketNumber")}
                />
              </FieldShell>

              <FieldShell
                label="Tipo da solicitação"
                error={errors.requestType?.message}
              >
                <Controller
                  control={control}
                  name="requestType"
                  render={({ field }) => (
                    <Select
                      aria-invalid={Boolean(errors.requestType)}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    >
                      <option value="desconto">Desconto</option>
                      <option value="parcelamento">Parcelamento</option>
                      <option value="desmembramento">Desmembramento de voucher</option>
                    </Select>
                  )}
                />
              </FieldShell>

              <FieldShell
                label="Tipo de solicitante"
                error={errors.requesterType?.message}
              >
                <Controller
                  control={control}
                  name="requesterType"
                  render={({ field }) => (
                    <Select
                      aria-invalid={Boolean(errors.requesterType)}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    >
                  <option value="responsavel">Responsável</option>
                  <option value="escola">Escola</option>
                    </Select>
                  )}
                />
              </FieldShell>

              <FieldShell
                label={requesterLabel}
                error={errors.requesterName?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.requesterName)}
                  placeholder={requesterPlaceholder}
                  {...register("requesterName")}
                />
              </FieldShell>

              <FieldShell
                label="Origem da solicitação"
                error={errors.originChannel?.message}
              >
                <Controller
                  control={control}
                  name="originChannel"
                  render={({ field }) => (
                    <Select
                      aria-invalid={Boolean(errors.originChannel)}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    >
                  {REQUEST_ORIGIN_OPTIONS.map((originOption) => (
                    <option key={originOption.value} value={originOption.value}>
                      {originOption.label}
                    </option>
                  ))}
                    </Select>
                  )}
                />
              </FieldShell>

              {shouldShowOriginReferenceField ? (
                <FieldShell
                  label={originReferenceLabel}
                  error={errors.originReference?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.originReference)}
                    type="email"
                    inputMode="email"
                    placeholder={originReferencePlaceholder}
                    {...register("originReference")}
                  />
                </FieldShell>
              ) : null}

              <FieldShell
                label="Nome de quem atendeu"
                error={errors.originAgentName?.message}
              >
                <Controller
                  control={control}
                  name="originAgentName"
                  render={({ field }) => (
                    <Select
                      aria-invalid={Boolean(errors.originAgentName)}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    >
                  <option value="">Selecione o agente SAF</option>
                  {INTERNAL_SAF_AGENT_OPTIONS.map((agentOption) => (
                    <option key={agentOption.value} value={agentOption.value}>
                      {agentOption.label}
                    </option>
                  ))}
                    </Select>
                  )}
                />
              </FieldShell>

              {requestType === "desconto" ? (
                <FieldShell
                  label="Percentual de desconto"
                  error={errors.discountPercentage?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.discountPercentage)}
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Ex.: 15"
                    {...register("discountPercentage", {
                      setValueAs: (value) =>
                        value === "" ? undefined : Number(value),
                    })}
                  />
                </FieldShell>
              ) : requestType === "parcelamento" ? (
                <FieldShell
                  label="Parcelamento sem juros"
                  error={errors.installmentCount?.message}
                >
                  <Controller
                    control={control}
                    name="installmentCount"
                    render={({ field }) => (
                      <InstallmentPlanSelect
                        value={field.value}
                        hasError={Boolean(errors.installmentCount)}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FieldShell>
              ) : (
                <FieldShell
                  label="Código do voucher"
                  error={errors.campaignVoucherCode?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.campaignVoucherCode)}
                    placeholder="Ex.: CAMP-MB-2026-001"
                    {...register("campaignVoucherCode")}
                  />
                </FieldShell>
              )}
            </section>

            {isVoucherSplitRequest ? (
              <FieldShell
                label="Como deseja desmembrar"
                error={errors.splitInstruction?.message}
              >
                <Textarea
                  aria-invalid={Boolean(errors.splitInstruction)}
                  placeholder="Ex.: dividir o voucher em 3 códigos menores, com distribuição entre as famílias/unidades e quantidade desejada em cada código."
                  {...register("splitInstruction")}
                />
              </FieldShell>
            ) : null}

            {!isVoucherSplitRequest ? (
              <FieldShell
                label="Justificativa / motivo da solicitação"
                error={errors.justification?.message}
              >
                <Textarea
                  aria-invalid={Boolean(errors.justification)}
                  placeholder="Descreva o contexto da exceção, impacto para a família e necessidade comercial."
                  {...register("justification")}
                />
              </FieldShell>
            ) : null}

            {!isVoucherSplitRequest ? (
              <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold tracking-tight text-[var(--color-foreground)]">
                      {requesterType === "responsavel"
                        ? "Família e alunos"
                        : "Famílias e alunos"}
                    </h3>
                    <p className="max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {requesterType === "responsavel"
                        ? "Preencha abaixo os dados da família e dos alunos desta solicitação."
                        : "Inclua várias famílias na mesma solicitação para aplicar a mesma condição e o mesmo voucher operacional."}
                    </p>
                    {errors.familyGroups?.message ? (
                      <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                        <CircleAlert className="size-3.5" />
                        {errors.familyGroups.message.toString()}
                      </span>
                    ) : null}
                  </div>

                  {requesterType === "escola" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => appendFamilyGroup(createEmptyRequestFamilyGroup())}
                    >
                      <Users className="size-4" />
                      Adicionar família
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {familyGroupFields.map((familyGroupField, familyIndex) => (
                    <FamilyGroupFields
                      key={familyGroupField.id}
                      index={familyIndex}
                      control={control}
                      register={register}
                      errors={errors}
                      requesterType={requesterType}
                      canRemoveFamily={
                        requesterType === "escola" && familyGroupFields.length > 1
                      }
                      onRemoveFamily={() => removeFamilyGroup(familyIndex)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Assim que a solicitação for enviada, avise o time SAF para que
                  possamos seguir com a solicitação junto aos times necessários.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !isReady}
                className="min-w-52"
              >
                <Send className="size-4" />
                {isSubmitting
                  ? "Enviando..."
                  : !isReady
                    ? "Conectando..."
                    : "Enviar solicitação"}
              </Button>
            </div>

            {!isSubmitSuccessful && Object.keys(errors).length > 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Revise os campos destacados antes de enviar a solicitação.
              </div>
            ) : null}

            {submitError ? (
              <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {sidebarContent}

        <Card className="overflow-hidden">
          <CardContent className="space-y-4">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Regras automáticas
            </p>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
              <p>
                Desconto: gera validade automática de 15 dias corridos após a
                aprovação e código no padrão institucional.
              </p>
              <p>
                Parcelamento: gera validade automática de 10 dias corridos após
                a aprovação, sem código de voucher, com vínculo obrigatório aos
                dois CPFs cadastrados.
              </p>
              <p>
                Desmembramento: exige o código do voucher de origem e a
                instrução operacional de como o benefício deve ser dividido.
              </p>
              <p>
                O sistema prepara automaticamente os materiais de apoio usados
                pelo time SAF no fluxo operacional.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-red-100 text-[var(--color-primary)]">
                <FileText className="size-5" />
              </span>
              <div>
                <h3 className="font-heading text-xl font-bold tracking-tight">
                  Como o fluxo funciona
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Formulário público, painel interno e acompanhamento da
                  solicitação.
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
              <li>1. A escola registra a solicitação no formulário público.</li>
              <li>2. O pedido é salvo no sistema e fica disponível para acompanhamento.</li>
              <li>3. O time SAF acompanha o painel, atualiza o status e utiliza os textos gerados pelo fluxo.</li>
            </ol>

            {lastCreatedRequest ? (
              <div className="space-y-4 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">
                  Links rápidos da solicitação recém-criada
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/solicitacoes/${lastCreatedRequest.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900"
                  >
                    Ver detalhe da solicitação
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/painel-saf"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900"
                  >
                    Abrir painel SAF
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {lastCreatedRequest && isSuccessModalOpen ? (
        <RequestSuccessModal
          request={lastCreatedRequest}
          requestFamilyGroups={lastCreatedRequestFamilyGroups}
          onClose={() => setIsSuccessModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
