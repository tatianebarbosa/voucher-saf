"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, PencilLine, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { ADMIN_ONLY_SCHOOL_FIELDS } from "@/lib/auth/school-fields";
import {
  schoolFormDefaultValues,
  schoolFormSchema,
  type SchoolFormInput,
  type SchoolPayload,
} from "@/lib/school-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SchoolFormMode = "create" | "edit";

interface SchoolFormProps {
  mode: SchoolFormMode;
  initialValues?: SchoolFormInput;
  onSubmitForm: (values: SchoolPayload) => Promise<void>;
  onCancel: () => void;
  canEditAdminFields?: boolean;
}

function FieldShell({
  label,
  hint,
  error,
  required = false,
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

function readFieldErrors(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "details" in error &&
    error.details &&
    typeof error.details === "object" &&
    "fieldErrors" in error.details &&
    error.details.fieldErrors &&
    typeof error.details.fieldErrors === "object"
  ) {
    return error.details.fieldErrors as Record<string, string[] | undefined>;
  }

  return null;
}

export function SchoolForm({
  mode,
  initialValues = schoolFormDefaultValues,
  onSubmitForm,
  onCancel,
  canEditAdminFields = true,
}: SchoolFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<SchoolFormInput, undefined, SchoolPayload>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  async function handleFormSubmit(values: SchoolPayload) {
    setSubmitError(null);

    try {
      await onSubmitForm(values);

      if (mode === "create") {
        reset(schoolFormDefaultValues);
      }
    } catch (error) {
      const fieldErrors = readFieldErrors(error);

      if (fieldErrors) {
        for (const [fieldName, fieldMessages] of Object.entries(fieldErrors)) {
          const firstMessage = fieldMessages?.[0];

          if (!firstMessage) {
            continue;
          }

          setError(fieldName as keyof SchoolFormInput, {
            type: "server",
            message: firstMessage,
          });
        }
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados da escola.",
      );
    }
  }

  const isCreateMode = mode === "create";

  function isFieldDisabled(fieldName: keyof SchoolFormInput) {
    return (
      !canEditAdminFields &&
      ADMIN_ONLY_SCHOOL_FIELDS.includes(
        fieldName as (typeof ADMIN_ONLY_SCHOOL_FIELDS)[number],
      )
    );
  }

  function getFieldHint(
    fieldName: keyof SchoolFormInput,
    defaultHint?: string,
  ) {
    if (!isFieldDisabled(fieldName)) {
      return defaultHint;
    }

    return defaultHint
      ? `${defaultHint} Campo administrativo somente para admin.`
      : "Campo administrativo somente para admin.";
  }

  return (
    <Card className="sticky top-28">
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex size-12 items-center justify-center rounded-[8px] border border-red-100 bg-red-50 text-[var(--color-primary)]">
            {isCreateMode ? (
              <PlusCircle className="size-5" />
            ) : (
              <PencilLine className="size-5" />
            )}
          </span>

          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              {isCreateMode ? "Novo cadastro" : "Edição rápida"}
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {isCreateMode ? "Adicionar nova escola" : "Editar dados da escola"}
            </h2>
            <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">
              Cadastre ou atualize os dados principais sem sair da área interna
              do Voucher Maple Bear.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)}>
          <FieldShell
            label="ID externo"
            hint={getFieldHint("externalSchoolId")}
            error={errors.externalSchoolId?.message}
          >
            <Input
              aria-invalid={Boolean(errors.externalSchoolId)}
              disabled={isFieldDisabled("externalSchoolId")}
              placeholder="Ex.: 790"
              {...register("externalSchoolId")}
            />
          </FieldShell>

          <FieldShell
            label="Nome da escola"
            required
            hint={getFieldHint("schoolName")}
            error={errors.schoolName?.message}
          >
            <Input
              aria-invalid={Boolean(errors.schoolName)}
              disabled={isFieldDisabled("schoolName")}
              placeholder="Ex.: Maple Bear Pindamonhangaba"
              {...register("schoolName")}
            />
          </FieldShell>

          <FieldShell
            label="E-mail da escola"
            error={errors.schoolEmail?.message}
          >
            <Input
              aria-invalid={Boolean(errors.schoolEmail)}
              placeholder="contato@escola.com.br"
              {...register("schoolEmail")}
            />
          </FieldShell>

          <div className="grid gap-5 md:grid-cols-2">
            <FieldShell
              label="Status da escola"
              error={errors.schoolStatus?.message}
            >
              <Input
                aria-invalid={Boolean(errors.schoolStatus)}
                placeholder="Ex.: Operando"
                {...register("schoolStatus")}
              />
            </FieldShell>

            <FieldShell label="Cluster" error={errors.cluster?.message}>
              <Input
                aria-invalid={Boolean(errors.cluster)}
                placeholder="Ex.: Implantacao"
                {...register("cluster")}
              />
            </FieldShell>
          </div>

          <FieldShell label="Carteira SAF" error={errors.safOwner?.message}>
            <Input
              aria-invalid={Boolean(errors.safOwner)}
              placeholder="Ex.: Tatiane Barbosa"
              {...register("safOwner")}
            />
          </FieldShell>

          <div className="grid gap-5 md:grid-cols-[1fr_120px]">
            <FieldShell
              label="Cidade"
              hint={getFieldHint("city")}
              error={errors.city?.message}
            >
              <Input
                aria-invalid={Boolean(errors.city)}
                disabled={isFieldDisabled("city")}
                placeholder="Ex.: Sao Paulo"
                {...register("city")}
              />
            </FieldShell>

            <FieldShell
              label="UF"
              hint={getFieldHint("state", "Use 2 letras.")}
              error={errors.state?.message}
            >
              <Input
                aria-invalid={Boolean(errors.state)}
                disabled={isFieldDisabled("state")}
                placeholder="SP"
                maxLength={2}
                {...register("state")}
              />
            </FieldShell>
          </div>

          <FieldShell
            label="CNPJ"
            hint={getFieldHint("cnpj", "Informe 14 digitos ou deixe em branco.")}
            error={errors.cnpj?.message}
          >
            <Input
              aria-invalid={Boolean(errors.cnpj)}
              disabled={isFieldDisabled("cnpj")}
              placeholder="00.000.000/0000-00"
              {...register("cnpj")}
            />
          </FieldShell>

          {submitError ? (
            <div className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-[var(--color-primary)]">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isCreateMode
                  ? "Salvando..."
                  : "Atualizando..."
                : isCreateMode
                  ? "Salvar escola"
                  : "Atualizar escola"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
