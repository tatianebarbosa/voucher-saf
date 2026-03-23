import { z } from "zod";

import { onlyDigits } from "@/lib/formatters";
import type { SchoolDraft } from "@/types/school";

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

const optionalTextSchema = z.preprocess(
  normalizeOptionalText,
  z.string().min(1).optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) => {
    const normalized = normalizeOptionalText(value);

    if (typeof normalized !== "string") {
      return normalized;
    }

    return normalized.toLowerCase();
  },
  z.string().email("Informe um e-mail válido.").optional(),
);

const optionalStateSchema = z.preprocess(
  (value) => {
    const normalized = normalizeOptionalText(value);

    if (typeof normalized !== "string") {
      return normalized;
    }

    return normalized.toUpperCase();
  },
  z
    .string()
    .regex(/^[A-Z]{2}$/, "Informe a UF com 2 letras.")
    .optional(),
);

const optionalCnpjSchema = z.preprocess(
  (value) => {
    const normalized = normalizeOptionalText(value);

    if (typeof normalized !== "string") {
      return normalized;
    }

    const digits = onlyDigits(normalized);

    return digits === "" ? undefined : digits;
  },
  z.string().length(14, "Informe um CNPJ com 14 digitos.").optional(),
);

export const schoolFormSchema = z.object({
  externalSchoolId: optionalTextSchema,
  schoolName: z.string().trim().min(3, "Informe o nome da escola."),
  schoolEmail: optionalEmailSchema,
  schoolStatus: optionalTextSchema,
  cluster: optionalTextSchema,
  safOwner: optionalTextSchema,
  city: optionalTextSchema,
  state: optionalStateSchema,
  cnpj: optionalCnpjSchema,
  tradeName: optionalTextSchema,
  region: optionalTextSchema,
  contactPhone: optionalTextSchema,
});

export const schoolListQuerySchema = z.object({
  query: z.string().trim().optional(),
});

export const publicSchoolSearchQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
});

export type SchoolFormInput = z.input<typeof schoolFormSchema>;
export type SchoolPayload = z.output<typeof schoolFormSchema>;

export const schoolFormDefaultValues: SchoolFormInput = {
  externalSchoolId: "",
  schoolName: "",
  schoolEmail: "",
  schoolStatus: "",
  cluster: "",
  safOwner: "",
  city: "",
  state: "",
  cnpj: "",
  tradeName: "",
  region: "",
  contactPhone: "",
};

export function normalizeSchoolDraft(
  data: SchoolFormInput | SchoolPayload,
): SchoolDraft {
  return schoolFormSchema.parse(data);
}
