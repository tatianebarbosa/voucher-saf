import type {
  RequesterType,
  RequestType,
  VoucherRequest,
} from "@/types/request";
import type { AuditEventType } from "@/types/audit";
import type { VoucherStatus, VoucherType } from "@/types/voucher";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCpf(value: string) {
  return formatCpfInput(value);
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatRequestType(value: RequestType) {
  if (value === "desconto") {
    return "Desconto";
  }

  if (value === "parcelamento") {
    return "Parcelamento";
  }

  return "Desmembramento de voucher";
}

export function formatVoucherType(value: VoucherType) {
  return value === "campanha" ? "Campanha" : "Outro";
}

export function formatVoucherStatus(value: VoucherStatus) {
  switch (value) {
    case "rascunho":
      return "Rascunho";
    case "ativo":
      return "Ativo";
    case "enviado":
      return "Enviado";
    case "esgotado":
      return "Esgotado";
    case "expirado":
      return "Expirado";
    case "cancelado":
      return "Cancelado";
    default:
      return value;
  }
}

export function formatRequesterType(value: RequesterType) {
  return value === "responsavel" ? "Responsável" : "Escola";
}

export function formatRequestStatus(value: string) {
  switch (value) {
    case "Em analise":
      return "Em análise";
    case "Pronta para envio":
      return "Pronta para envio";
    case "Recebida":
      return "Recebida";
    case "Negada":
      return "Negada";
    default:
      return value;
  }
}

export function formatAuditEventType(value: AuditEventType) {
  switch (value) {
    case "request_created":
      return "Solicitação criada";
    case "request_status_changed":
      return "Status alterado";
    case "school_created":
      return "Escola cadastrada";
    case "school_updated":
      return "Escola atualizada";
    case "school_access_invited":
      return "Convite de acesso enviado";
    case "school_access_activated":
      return "Acesso da escola ativado";
    case "school_password_reset_requested":
      return "Reset de senha solicitado";
    case "school_password_reset_completed":
      return "Senha redefinida";
    case "voucher_created":
      return "Voucher criado";
    case "voucher_updated":
      return "Voucher atualizado";
    case "voucher_available":
      return "Voucher disponibilizado";
    case "campaign_available":
      return "Campanha disponibilizada";
    case "import_executed":
      return "Importação executada";
    default:
      return value;
  }
}

export function formatRequesterFieldLabel(value: RequesterType) {
  return value === "responsavel"
    ? "Nome do solicitante"
    : "Nome do contato da escola";
}

export function formatRequesterSummaryLabel(value: RequesterType) {
  return value === "responsavel"
    ? "Responsável solicitante"
    : "Contato da escola";
}

export function formatInstallmentPlan(installmentCount?: number | null) {
  if (
    installmentCount === undefined ||
    installmentCount === null ||
    Number.isNaN(installmentCount)
  ) {
    return "Parcelamento sem juros";
  }

  return `${installmentCount}x sem juros`;
}

export function formatCampaignVoucherCondition(
  campaignVoucherCode?: string | null,
) {
  if (!campaignVoucherCode?.trim()) {
    return "Desmembramento de voucher";
  }

  return `Voucher ${campaignVoucherCode.trim()}`;
}

export function formatCondition(request: VoucherRequest) {
  if (request.requestType === "desconto") {
    return `${request.discountPercentage}% de desconto`;
  }

  if (request.requestType === "desmembramento") {
    return formatCampaignVoucherCondition(request.campaignVoucherCode);
  }

  return formatInstallmentPlan(request.installmentCount);
}

export function buildSchoolAcronym(schoolName: string) {
  const cleaned = schoolName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim();

  const stopWords = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
  const words = cleaned
    .toUpperCase()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !stopWords.has(word));

  const initials = words.map((word) => word[0]).join("").slice(0, 6);

  if (initials.length >= 2) {
    return initials;
  }

  return cleaned.replace(/\s+/g, "").toUpperCase().slice(0, 6) || "ESCOLA";
}

export function buildVoucherCode(
  schoolName: string,
  discountPercentage: number,
  requesterName: string,
) {
  const schoolAcronym = buildSchoolAcronym(schoolName);
  const requesterInitial =
    requesterName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .charAt(0)
      .toUpperCase() || "X";

  return `DESC-${schoolAcronym}-${discountPercentage}-${requesterInitial}`;
}
