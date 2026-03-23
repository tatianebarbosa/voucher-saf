import { z } from "zod";

import { onlyDigits } from "@/lib/formatters";
import {
  buildRequestDraftFromFamilyGroups,
  createEmptyRequestFamilyGroup,
} from "@/lib/request-family-groups";
import type { RequestDraft } from "@/types/request";

export const REQUEST_INSTALLMENT_OPTIONS = Array.from(
  { length: 12 },
  (_, index) => index + 1,
);

export const REQUEST_ORIGIN_OPTIONS = [
  { value: "email", label: "E-mail" },
  { value: "live_chat", label: "Live chat" },
  { value: "whatsapp_saf", label: "WhatsApp SAF" },
] as const;

export type RequestOriginChannel = (typeof REQUEST_ORIGIN_OPTIONS)[number]["value"];

const requestOriginChannelSchema = z.enum([
  "email",
  "live_chat",
  "whatsapp_saf",
]);

export function formatRequestOriginChannel(channel: RequestOriginChannel) {
  switch (channel) {
    case "email":
      return "E-mail";
    case "live_chat":
      return "Live chat";
    case "whatsapp_saf":
      return "WhatsApp SAF";
  }
}

export function buildRequestOriginLabel(
  channel: RequestOriginChannel,
  reference: string,
  agentName: string,
) {
  const normalizedReference = reference.trim();
  const normalizedAgentName = agentName.trim();

  return `${formatRequestOriginChannel(channel)} | ${normalizedReference} | Agente SAF: ${normalizedAgentName}`;
}

const requestStudentSchema = z.object({
  studentName: z.string().trim().min(3, "Informe o nome do aluno."),
  studentClassName: z.string().trim().min(2, "Informe a turma."),
});

const requestFamilyGroupSchema = z
  .object({
    students: z
      .array(requestStudentSchema)
      .min(1, "Adicione pelo menos um aluno nesta família."),
    responsible1Name: z
      .string()
      .trim()
      .min(3, "Informe o nome completo do responsável financeiro."),
    responsible1Cpf: z
      .string()
      .trim()
      .refine(
        (value) => onlyDigits(value).length === 11,
        "Informe um CPF válido para o responsável financeiro.",
      ),
    responsible2Name: z
      .string()
      .trim()
      .min(3, "Informe o nome completo do responsável acadêmico."),
    responsible2Cpf: z
      .string()
      .trim()
      .refine(
        (value) => onlyDigits(value).length === 11,
        "Informe um CPF válido para o responsável acadêmico.",
      ),
  })
  .superRefine((data, context) => {
    if (onlyDigits(data.responsible1Cpf) === onlyDigits(data.responsible2Cpf)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["responsible2Cpf"],
        message: "Os CPFs dos responsáveis devem ser diferentes.",
      });
    }
  });

export const requestFormSchema = z
  .object({
    schoolId: z.string().trim().optional(),
    schoolName: z.string().trim().min(1, "Selecione a escola."),
    ticketNumber: z.string().trim().min(3, "Informe o código do atendimento."),
    requesterType: z.enum(["responsavel", "escola"]),
    requesterName: z.string().trim().min(3, "Informe o nome do solicitante."),
    originChannel: requestOriginChannelSchema,
    originReference: z.string().trim(),
    originAgentName: z.string().trim(),
    justification: z.string().trim(),
    familyGroups: z.array(requestFamilyGroupSchema),
    requestType: z.enum(["desconto", "parcelamento", "desmembramento"]),
    discountPercentage: z.number().optional(),
    installmentCount: z.number().optional(),
    campaignVoucherCode: z.string().trim().optional(),
    splitInstruction: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    if (!data.schoolId?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schoolName"],
        message: "Selecione uma escola da lista.",
      });
    }

    if (
      data.requestType !== "desmembramento" &&
      data.familyGroups.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["familyGroups"],
        message: "Adicione pelo menos uma família na solicitação.",
      });
    }

    if (
      data.requestType !== "desmembramento" &&
      data.requesterType === "responsavel" &&
      data.familyGroups.length > 1
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["familyGroups"],
        message:
          "Para solicitante responsável, mantenha uma única família e adicione quantos alunos forem necessários.",
      });
    }

    if (
      data.requestType !== "desmembramento" &&
      data.justification.trim().length < 10
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justification"],
        message: "Descreva o motivo com mais detalhes.",
      });
    }

    if (data.originChannel === "email") {
      if (!data.originReference.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["originReference"],
          message: "Informe o e-mail do solicitante.",
        });
      } else if (!z.string().email().safeParse(data.originReference.trim()).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["originReference"],
          message: "Informe um e-mail válido.",
        });
      }
    }

    if (data.originAgentName.trim().length < 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["originAgentName"],
        message: "Selecione quem atendeu.",
      });
    }

    if (data.requestType === "desconto") {
      if (!data.discountPercentage) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountPercentage"],
          message: "Informe o percentual de desconto.",
        });
      }

      if (
        data.discountPercentage !== undefined &&
        (data.discountPercentage < 1 || data.discountPercentage > 100)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountPercentage"],
          message: "O percentual deve estar entre 1 e 100.",
        });
      }
    }

    if (data.requestType === "parcelamento") {
      if (!data.installmentCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installmentCount"],
          message: "Selecione a opcao de parcelamento.",
        });
      }

      if (
        data.installmentCount !== undefined &&
        !REQUEST_INSTALLMENT_OPTIONS.includes(data.installmentCount)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installmentCount"],
          message: "Selecione uma opcao de 1x a 12x sem juros.",
        });
      }
    }

    if (data.requestType === "desmembramento") {
      if (data.requesterType !== "escola") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requesterType"],
          message:
            "Desmembramento de voucher deve ser solicitado pela escola.",
        });
      }

      if (!data.campaignVoucherCode?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["campaignVoucherCode"],
          message: "Informe o código do voucher.",
        });
      }

      if (!data.splitInstruction?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["splitInstruction"],
          message: "Descreva como deseja desmembrar o voucher.",
        });
      }
    }
  });

export type RequestFormData = z.infer<typeof requestFormSchema>;

export const requestStatusSchema = z.enum([
  "Recebida",
  "Em analise",
  "Pronta para envio",
  "Negada",
]);

export type RequestStatusPayload = z.infer<typeof requestStatusSchema>;

export const requestStatusUpdateSchema = z
  .object({
    status: requestStatusSchema,
    decisionReason: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    const requiresDecisionReason =
      data.status === "Pronta para envio" || data.status === "Negada";

    if (
      requiresDecisionReason &&
      (!data.decisionReason || data.decisionReason.trim().length < 10)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decisionReason"],
        message:
          data.status === "Pronta para envio"
            ? "Informe o motivo da aprovação."
            : "Informe o motivo da negativa.",
      });
    }
  });

export type RequestStatusUpdatePayload = z.infer<
  typeof requestStatusUpdateSchema
>;

export const publicRequestTrackingQuerySchema = z.object({
  ticketNumber: z
    .string()
    .trim()
    .min(3, "Informe o código do atendimento.")
    .max(60, "Informe um código do atendimento válido."),
});

export type PublicRequestTrackingQuery = z.infer<
  typeof publicRequestTrackingQuerySchema
>;

export const requestFormDefaultValues: RequestFormData = {
  schoolId: "",
  schoolName: "",
  ticketNumber: "",
  requesterType: "responsavel",
  requesterName: "",
  originChannel: "email",
  originReference: "",
  originAgentName: "",
  justification: "",
  familyGroups: [createEmptyRequestFamilyGroup()],
  requestType: "desconto",
  discountPercentage: undefined,
  installmentCount: undefined,
  campaignVoucherCode: "",
  splitInstruction: "",
};

export function normalizeRequestDraft(data: RequestFormData): RequestDraft {
  const origin = buildRequestOriginLabel(
    data.originChannel,
    data.originChannel === "email" ? data.originReference : data.ticketNumber,
    data.originAgentName,
  );

  if (data.requestType === "desmembramento") {
    return {
      schoolId: data.schoolId?.trim() || undefined,
      schoolName: data.schoolName.trim(),
      ticketNumber: data.ticketNumber?.trim() || undefined,
      requesterType: "escola",
      requesterName: data.requesterName.trim(),
      origin,
      justification: data.splitInstruction?.trim() || data.justification.trim(),
      familyGroups: undefined,
      studentNames: "",
      studentClassName: "",
      requestType: data.requestType,
      responsible1Name: "",
      responsible1Cpf: "",
      responsible2Name: "",
      responsible2Cpf: "",
      discountPercentage: undefined,
      installmentCount: undefined,
      campaignVoucherCode: data.campaignVoucherCode?.trim() || undefined,
      splitInstruction: data.splitInstruction?.trim() || undefined,
    };
  }

  return buildRequestDraftFromFamilyGroups({
    schoolId: data.schoolId?.trim() || undefined,
    schoolName: data.schoolName.trim(),
    ticketNumber: data.ticketNumber?.trim() || undefined,
    requesterType: data.requesterType,
    requesterName: data.requesterName.trim(),
    origin,
    justification: data.justification.trim(),
    requestType: data.requestType,
    discountPercentage:
      data.requestType === "desconto" ? data.discountPercentage : undefined,
    installmentCount:
      data.requestType === "parcelamento" ? data.installmentCount : undefined,
    campaignVoucherCode: undefined,
    splitInstruction: undefined,
    familyGroups: data.familyGroups,
  });
}
