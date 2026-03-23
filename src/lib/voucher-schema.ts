import { z } from "zod";

import type {
  VoucherDraft,
  VoucherListFilters,
  VoucherUpdateDraft,
} from "@/types/voucher";
import {
  VOUCHER_STATUS_OPTIONS,
  VOUCHER_TYPE_OPTIONS,
} from "@/types/voucher";

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

function normalizeOptionalDateTime(value: unknown) {
  const normalized = normalizeOptionalText(value);

  if (typeof normalized !== "string") {
    return normalized;
  }

  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? `${normalized}T00:00:00.000Z`
    : normalized;
  const parsedDate = new Date(candidate);

  if (Number.isNaN(parsedDate.valueOf())) {
    return normalized;
  }

  return parsedDate.toISOString();
}

function normalizeOptionalInteger(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  return Number(trimmed);
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

const optionalDateTimeSchema = z.preprocess(
  normalizeOptionalDateTime,
  z.string().datetime("Informe uma data valida.").optional(),
);

const integerSchema = z.preprocess(
  normalizeOptionalInteger,
  z
    .number({
      error: "Informe um número inteiro válido.",
    })
    .int("Informe um número inteiro válido.")
    .min(0, "Informe um número igual ou maior que zero."),
);

const optionalIntegerSchema = z.preprocess(
  normalizeOptionalInteger,
  z
    .number({
      error: "Informe um número inteiro válido.",
    })
    .int("Informe um número inteiro válido.")
    .min(0, "Informe um número igual ou maior que zero.")
    .optional(),
);

function addVoucherConsistencyIssues(
  data: {
    quantityAvailable?: number;
    quantitySent?: number;
    sentAt?: string;
    expiresAt?: string;
  },
  context: z.RefinementCtx,
) {
  if (
    data.quantityAvailable !== undefined &&
    data.quantitySent !== undefined &&
    data.quantitySent > data.quantityAvailable
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantitySent"],
      message: "A quantidade enviada não pode ser maior que a quantidade disponível.",
    });
  }

  if (data.sentAt && data.expiresAt) {
    const sentAt = new Date(data.sentAt);
    const expiresAt = new Date(data.expiresAt);

    if (expiresAt < sentAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "A data de expiracao deve ser posterior ao envio.",
      });
    }
  }
}

export const voucherFormSchema = z
  .object({
    schoolId: optionalTextSchema,
    schoolExternalId: optionalTextSchema,
    schoolName: z.string().trim().min(3, "Informe o nome da escola."),
    voucherType: z.enum(VOUCHER_TYPE_OPTIONS),
    campaignName: z.string().trim().min(3, "Informe o nome da campanha."),
    voucherCode: z.string().trim().min(3, "Informe o código do voucher."),
    quantityAvailable: integerSchema,
    quantitySent: integerSchema,
    sentToEmail: optionalEmailSchema,
    sentAt: optionalDateTimeSchema,
    expiresAt: optionalDateTimeSchema,
    status: z.enum(VOUCHER_STATUS_OPTIONS),
    sourceFile: optionalTextSchema,
    sourceSheet: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((data, context) => {
    addVoucherConsistencyIssues(data, context);
  });

export const voucherUpdateSchema = z
  .object({
    schoolId: optionalTextSchema,
    schoolExternalId: optionalTextSchema,
    schoolName: optionalTextSchema,
    voucherType: z.enum(VOUCHER_TYPE_OPTIONS).optional(),
    campaignName: optionalTextSchema,
    voucherCode: optionalTextSchema,
    quantityAvailable: optionalIntegerSchema,
    quantitySent: optionalIntegerSchema,
    sentToEmail: optionalEmailSchema,
    sentAt: optionalDateTimeSchema,
    expiresAt: optionalDateTimeSchema,
    status: z.enum(VOUCHER_STATUS_OPTIONS).optional(),
    sourceFile: optionalTextSchema,
    sourceSheet: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((data, context) => {
    addVoucherConsistencyIssues(data, context);
  });

export const voucherListQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  schoolId: z.string().trim().optional(),
  campaignName: z.string().trim().max(150).optional(),
  voucherType: z.enum(VOUCHER_TYPE_OPTIONS).optional(),
  status: z.enum(VOUCHER_STATUS_OPTIONS).optional(),
});

export type VoucherFormInput = z.input<typeof voucherFormSchema>;
export type VoucherPayload = z.output<typeof voucherFormSchema>;
export type VoucherUpdateInput = z.input<typeof voucherUpdateSchema>;
export type VoucherUpdatePayload = z.output<typeof voucherUpdateSchema>;

export function normalizeVoucherDraft(
  data: VoucherFormInput | VoucherPayload,
): VoucherDraft {
  return voucherFormSchema.parse(data);
}

export function normalizeVoucherUpdateDraft(
  data: VoucherUpdateInput | VoucherUpdatePayload,
): VoucherUpdateDraft {
  return voucherUpdateSchema.parse(data);
}

export function normalizeVoucherListFilters(
  data: unknown,
): VoucherListFilters {
  return voucherListQuerySchema.parse(data);
}
