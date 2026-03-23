import fs from "node:fs";
import path from "node:path";

import { PrismaClient, type Prisma, type School } from "@prisma/client";
import { z } from "zod";
import * as XLSX from "xlsx";

import { recordImportExecution } from "../src/lib/server/audit-log";
import {
  VOUCHER_STATUS_OPTIONS,
  VOUCHER_TYPE_OPTIONS,
  type VoucherStatus,
  type VoucherType,
} from "../src/types/voucher";

const prisma = new PrismaClient();

const usageMessage =
  "Uso: npm run db:import:vouchers -- <caminho-do-arquivo.csv|xlsx|xls>";

const headerMap = new Map<string, keyof ImportedVoucherRow>([
  ["id da escola", "schoolExternalId"],
  ["id_escola", "schoolExternalId"],
  ["escola", "schoolName"],
  ["nome da escola", "schoolName"],
  ["nome", "schoolName"],
  ["unidade", "schoolName"],
  ["tipo do voucher", "voucherTypeRaw"],
  ["voucher type", "voucherTypeRaw"],
  ["campanha", "campaignName"],
  ["codigo do voucher", "voucherCode"],
  ["codigo voucher", "voucherCode"],
  ["quantidade disponibilizada", "quantityAvailableRaw"],
  ["qtd. vouchers", "quantityAvailableRaw"],
  ["qtd vouchers", "quantityAvailableRaw"],
  ["quantidade enviada", "quantitySentRaw"],
  ["email de envio", "sentToEmail"],
  ["e-mail de envio", "sentToEmail"],
  ["data de envio", "sentAtRaw"],
  ["validade", "expiresAtRaw"],
  ["status", "statusRaw"],
  ["observacao", "notes"],
  ["observacoes", "notes"],
  ["voucher enviado", "voucherSentRaw"],
  ["direito a voucher", "voucherEligibilityRaw"],
  ["habilitacao voucher", "voucherEligibilityLevelRaw"],
  ["cluster", "clusterRaw"],
  ["status da escola", "schoolStatusRaw"],
  ["adimplencia contratual", "contractualStatusRaw"],
  ["adimplencia financeira", "financialStatusRaw"],
  ["vendas slm 2025", "salesVolumeRaw"],
]);

const importedVoucherSchema = z
  .object({
    schoolExternalId: z.string().trim().min(1).optional().nullable(),
    schoolName: z.string().trim().min(1, "Nome da escola obrigatorio."),
    voucherType: z.enum(VOUCHER_TYPE_OPTIONS),
    campaignName: z.string().trim().min(1, "Campanha obrigatoria."),
    voucherCode: z.string().trim().min(1, "Codigo do voucher obrigatorio."),
    quantityAvailable: z.number().int().min(0),
    quantitySent: z.number().int().min(0),
    sentToEmail: z.string().trim().min(1).optional().nullable(),
    sentAt: z.string().trim().min(1).optional().nullable(),
    expiresAt: z.string().trim().min(1).optional().nullable(),
    status: z.enum(VOUCHER_STATUS_OPTIONS),
    notes: z.string().trim().min(1).optional().nullable(),
    sourceFile: z.string().trim().min(1),
    sourceSheet: z.string().trim().min(1).optional().nullable(),
  })
  .superRefine((data, context) => {
    if (data.quantitySent > data.quantityAvailable) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantitySent"],
        message:
          "Quantidade enviada nao pode ser maior que a quantidade disponibilizada.",
      });
    }
  });

const emailSchema = z.string().email();
const isoDateTimeSchema = z.string().datetime();

type ImportedVoucher = z.output<typeof importedVoucherSchema>;
type ImportStats = {
  read: number;
  created: number;
  updated: number;
  skipped: number;
};

type ImportedVoucherRow = {
  schoolExternalId?: string;
  schoolName?: string;
  voucherTypeRaw?: string;
  campaignName?: string;
  voucherCode?: string;
  quantityAvailableRaw?: string;
  quantitySentRaw?: string;
  sentToEmail?: string;
  sentAtRaw?: string;
  expiresAtRaw?: string;
  statusRaw?: string;
  notes?: string;
  voucherSentRaw?: string;
  voucherEligibilityRaw?: string;
  voucherEligibilityLevelRaw?: string;
  clusterRaw?: string;
  schoolStatusRaw?: string;
  contractualStatusRaw?: string;
  financialStatusRaw?: string;
  salesVolumeRaw?: string;
};

type SchoolLookup = Pick<School, "id" | "externalSchoolId" | "schoolName">;

type ExistingVoucherRecord = {
  id: string;
  schoolExternalId?: string;
  schoolName: string;
  campaignName: string;
  voucherCode: string;
  sentToEmail?: string;
  sentAt?: string;
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeText(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized === "" ? undefined : normalized;
}

function normalizeNameKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeOptionalEmail(value: unknown) {
  const normalized = normalizeText(value);

  return normalized ? normalized.toLowerCase() : undefined;
}

function normalizeOptionalInteger(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const digits = normalized.replace(/[^\d-]/g, "");

  if (digits === "") {
    return undefined;
  }

  const parsed = Number(digits);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOptionalDate(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const dayMonthMatch = normalized.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/,
  );

  if (dayMonthMatch) {
    const [, day, month, year] = dayMonthMatch;
    const resolvedYear = year
      ? year.length === 2
        ? `20${year}`
        : year
      : String(new Date().getFullYear());
    const isoDate = `${resolvedYear}-${month.padStart(2, "0")}-${day.padStart(
      2,
      "0",
    )}T00:00:00.000Z`;

    if (!Number.isNaN(new Date(isoDate).valueOf())) {
      return isoDate;
    }
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.valueOf())) {
    return undefined;
  }

  return parsed.toISOString();
}

function normalizeCampaignName(baseName: string) {
  if (/^voucherdecampanha/i.test(baseName)) {
    const suffix = baseName.replace(/^voucherdecampanha/i, "").trim();

    return suffix ? `Voucher de Campanha ${suffix}`.trim() : "Voucher de Campanha";
  }

  return baseName
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTruthyFlag(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const comparable = normalizeHeader(normalized);

  if (["sim", "s", "yes", "true"].includes(comparable)) {
    return true;
  }

  if (["nao", "na", "n/a", "no", "false"].includes(comparable)) {
    return false;
  }

  return undefined;
}

function resolveVoucherType(rawValue: unknown, notes?: string): VoucherType {
  const comparable = normalizeHeader(normalizeText(rawValue) ?? "");
  const notesComparable = normalizeHeader(notes ?? "");

  if (
    comparable.includes("outro") ||
    comparable.includes("amostra") ||
    notesComparable.includes("voucher de amostra")
  ) {
    return "outro";
  }

  return "campanha";
}

function resolveVoucherStatus(row: ImportedVoucherRow, quantityAvailable: number) {
  const explicitStatus = normalizeHeader(row.statusRaw ?? "");

  if (explicitStatus.includes("cancel")) {
    return "cancelado" satisfies VoucherStatus;
  }

  if (explicitStatus.includes("expir")) {
    return "expirado" satisfies VoucherStatus;
  }

  if (explicitStatus.includes("esgot")) {
    return "esgotado" satisfies VoucherStatus;
  }

  if (explicitStatus.includes("envi")) {
    return "enviado" satisfies VoucherStatus;
  }

  if (explicitStatus.includes("ativ")) {
    return "ativo" satisfies VoucherStatus;
  }

  if (explicitStatus.includes("rascun")) {
    return "rascunho" satisfies VoucherStatus;
  }

  const sentFlag = parseTruthyFlag(row.voucherSentRaw);

  if (sentFlag === true) {
    return "enviado";
  }

  const eligibilityFlag = parseTruthyFlag(row.voucherEligibilityRaw);

  if (eligibilityFlag === false) {
    return "cancelado";
  }

  if (quantityAvailable > 0 || normalizeText(row.voucherCode)) {
    return "ativo";
  }

  return "rascunho";
}

function buildNotes(row: ImportedVoucherRow) {
  const sections: string[] = [];
  const freeTextNotes = normalizeText(row.notes);

  if (freeTextNotes) {
    sections.push(freeTextNotes);
  }

  const metadataEntries = [
    ["Cluster", row.clusterRaw],
    ["Status da escola", row.schoolStatusRaw],
    ["Adimplencia contratual", row.contractualStatusRaw],
    ["Adimplencia financeira", row.financialStatusRaw],
    ["Vendas SLM 2025", row.salesVolumeRaw],
    ["Direito a voucher", row.voucherEligibilityRaw],
    ["Habilitacao voucher", row.voucherEligibilityLevelRaw],
    ["Voucher enviado", row.voucherSentRaw],
  ]
    .map(([label, value]) => {
      const normalizedValue = normalizeText(value);

      return normalizedValue ? `${label}: ${normalizedValue}` : undefined;
    })
    .filter((value): value is string => Boolean(value));

  if (metadataEntries.length > 0) {
    sections.push(`[Importacao CSV]\n${metadataEntries.join("\n")}`);
  }

  return sections.join("\n\n") || undefined;
}

function isEmptyRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => normalizeText(value) === undefined);
}

function mapRow(
  row: Record<string, unknown>,
  context: {
    derivedCampaignName: string;
    sourceFile: string;
    sourceSheet?: string;
  },
) {
  const mapped: ImportedVoucherRow = {};

  for (const [header, rawValue] of Object.entries(row)) {
    const targetKey = headerMap.get(normalizeHeader(header));

    if (!targetKey) {
      continue;
    }

    mapped[targetKey] = normalizeText(rawValue);
  }

  const quantityAvailable = normalizeOptionalInteger(mapped.quantityAvailableRaw) ?? 0;
  const explicitQuantitySent = normalizeOptionalInteger(mapped.quantitySentRaw);
  const sentFlag = parseTruthyFlag(mapped.voucherSentRaw);
  const quantitySent =
    explicitQuantitySent ?? (sentFlag === true ? quantityAvailable : 0);

  return {
    schoolExternalId: mapped.schoolExternalId,
    schoolName: mapped.schoolName ?? "",
    voucherType: resolveVoucherType(mapped.voucherTypeRaw, mapped.notes),
    campaignName: mapped.campaignName ?? context.derivedCampaignName,
    voucherCode: mapped.voucherCode ?? "",
    quantityAvailable,
    quantitySent,
    sentToEmail: normalizeOptionalEmail(mapped.sentToEmail),
    sentAt: normalizeOptionalDate(mapped.sentAtRaw),
    expiresAt: normalizeOptionalDate(mapped.expiresAtRaw),
    status: resolveVoucherStatus(mapped, quantityAvailable),
    notes: buildNotes(mapped),
    sourceFile: context.sourceFile,
    sourceSheet: context.sourceSheet,
  };
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join("; ");
}

function getWorkbookRows(filePath: string) {
  const fileExtension = path.extname(filePath).toLowerCase();
  const workbook =
    fileExtension === ".csv"
      ? XLSX.read(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""), {
          type: "string",
          raw: false,
          cellDates: false,
          dense: false,
          FS: ";",
        })
      : XLSX.readFile(filePath, {
          raw: false,
          cellDates: false,
          dense: false,
          codepage: 65001,
        });
  const [firstSheetName] = workbook.SheetNames;

  if (!firstSheetName) {
    throw new Error("O arquivo nao possui abas legiveis.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  return {
    rows,
    firstSheetName,
  };
}

function buildGlobalWarnings(rows: Record<string, unknown>[], derivedCampaignName: string) {
  const normalizedHeaders = new Set<string>();

  for (const row of rows.slice(0, 1)) {
    for (const header of Object.keys(row)) {
      normalizedHeaders.add(normalizeHeader(header));
    }
  }

  const warnings: string[] = [];

  if (!normalizedHeaders.has("campanha")) {
    warnings.push(
      `Coluna de campanha ausente; usando o nome derivado do arquivo: ${derivedCampaignName}.`,
    );
  }

  if (
    !normalizedHeaders.has("tipo do voucher") &&
    !normalizedHeaders.has("voucher type")
  ) {
    warnings.push("Coluna de tipo do voucher ausente; usando 'campanha' por padrao.");
  }

  if (!normalizedHeaders.has("email de envio")) {
    warnings.push("Coluna de email de envio ausente; sentToEmail ficara vazio.");
  }

  if (!normalizedHeaders.has("data de envio")) {
    warnings.push("Coluna de data de envio ausente; sentAt ficara vazio.");
  }

  if (!normalizedHeaders.has("validade")) {
    warnings.push("Coluna de validade ausente; expiresAt ficara vazio.");
  }

  return warnings;
}

function buildVoucherIdentityCandidates(data: {
  schoolExternalId?: string | null;
  schoolName: string;
  campaignName: string;
  voucherCode: string;
  sentToEmail?: string | null;
  sentAt?: string | null;
}) {
  const baseKey = [
    normalizeNameKey(data.campaignName),
    normalizeNameKey(data.voucherCode),
    normalizeNameKey(data.sentToEmail ?? ""),
    data.sentAt ?? "",
  ].join("|");
  const candidates = new Set<string>();

  if (data.schoolExternalId) {
    candidates.add(`external:${normalizeNameKey(data.schoolExternalId)}|${baseKey}`);
  }

  candidates.add(`name:${normalizeNameKey(data.schoolName)}|${baseKey}`);

  return [...candidates];
}

function addVoucherToIdentityMap(
  map: Map<string, Set<string>>,
  voucher: ExistingVoucherRecord,
) {
  const candidates = buildVoucherIdentityCandidates(voucher);

  for (const candidate of candidates) {
    const ids = map.get(candidate) ?? new Set<string>();
    ids.add(voucher.id);
    map.set(candidate, ids);
  }
}

function removeVoucherFromIdentityMap(
  map: Map<string, Set<string>>,
  voucher: ExistingVoucherRecord,
) {
  const candidates = buildVoucherIdentityCandidates(voucher);

  for (const candidate of candidates) {
    const ids = map.get(candidate);

    if (!ids) {
      continue;
    }

    ids.delete(voucher.id);

    if (ids.size === 0) {
      map.delete(candidate);
    }
  }
}

function buildVoucherPersistenceData(
  data: ImportedVoucher,
  schoolMatch: SchoolLookup | null,
): Prisma.SchoolVoucherUncheckedCreateInput {
  return {
    schoolId: schoolMatch?.id ?? null,
    schoolExternalId:
      schoolMatch?.externalSchoolId ?? data.schoolExternalId ?? null,
    schoolName: schoolMatch?.schoolName ?? data.schoolName,
    voucherType: data.voucherType === "campanha" ? "CAMPANHA" : "OUTRO",
    campaignName: data.campaignName,
    voucherCode: data.voucherCode,
    quantityAvailable: data.quantityAvailable,
    quantitySent: data.quantitySent,
    sentToEmail: data.sentToEmail ?? null,
    sentAt: data.sentAt ? new Date(data.sentAt) : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    status:
      data.status === "rascunho"
        ? "RASCUNHO"
        : data.status === "ativo"
          ? "ATIVO"
          : data.status === "enviado"
            ? "ENVIADO"
            : data.status === "esgotado"
              ? "ESGOTADO"
              : data.status === "expirado"
                ? "EXPIRADO"
                : "CANCELADO",
    sourceFile: data.sourceFile,
    sourceSheet: data.sourceSheet ?? null,
    notes: data.notes ?? null,
  };
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error(usageMessage);
    process.exitCode = 1;
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const supportedExtensions = new Set([".csv", ".xlsx", ".xls"]);
  const fileExtension = path.extname(resolvedPath).toLowerCase();

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Arquivo nao encontrado: ${resolvedPath}`);
    process.exitCode = 1;
    return;
  }

  if (!supportedExtensions.has(fileExtension)) {
    console.error(
      `Formato nao suportado (${fileExtension || "sem extensao"}). Use CSV, XLSX ou XLS.`,
    );
    process.exitCode = 1;
    return;
  }

  const { rows, firstSheetName } = getWorkbookRows(resolvedPath);
  const derivedCampaignName = normalizeCampaignName(
    path.basename(resolvedPath, fileExtension),
  );
  const sourceFile = path.basename(resolvedPath);
  const stats: ImportStats = {
    read: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  };
  const rowWarnings: string[] = [];
  const globalWarnings = buildGlobalWarnings(rows, derivedCampaignName);

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      externalSchoolId: true,
      schoolName: true,
    },
  });
  const schoolByExternalId = new Map<string, SchoolLookup>();
  const schoolByNormalizedName = new Map<string, SchoolLookup[]>();

  for (const school of schools) {
    if (school.externalSchoolId) {
      schoolByExternalId.set(school.externalSchoolId, school);
    }

    const nameKey = normalizeNameKey(school.schoolName);
    const schoolsWithSameName = schoolByNormalizedName.get(nameKey) ?? [];
    schoolsWithSameName.push(school);
    schoolByNormalizedName.set(nameKey, schoolsWithSameName);
  }

  const existingVouchers = await prisma.schoolVoucher.findMany({
    select: {
      id: true,
      schoolExternalId: true,
      schoolName: true,
      campaignName: true,
      voucherCode: true,
      sentToEmail: true,
      sentAt: true,
    },
  });
  const voucherById = new Map<string, ExistingVoucherRecord>();
  const voucherIdentityMap = new Map<string, Set<string>>();

  for (const existingVoucher of existingVouchers) {
    const normalizedVoucher: ExistingVoucherRecord = {
      id: existingVoucher.id,
      schoolExternalId: existingVoucher.schoolExternalId ?? undefined,
      schoolName: existingVoucher.schoolName,
      campaignName: existingVoucher.campaignName,
      voucherCode: existingVoucher.voucherCode,
      sentToEmail: existingVoucher.sentToEmail ?? undefined,
      sentAt: existingVoucher.sentAt?.toISOString(),
    };

    voucherById.set(normalizedVoucher.id, normalizedVoucher);
    addVoucherToIdentityMap(voucherIdentityMap, normalizedVoucher);
  }

  for (const [index, row] of rows.entries()) {
    const spreadsheetRowNumber = index + 2;

    if (isEmptyRow(row)) {
      continue;
    }

    stats.read += 1;

    const mappedRow = mapRow(row, {
      derivedCampaignName,
      sourceFile,
      sourceSheet: fileExtension === ".csv" ? "CSV" : firstSheetName,
    });
    const parsed = importedVoucherSchema.safeParse(mappedRow);

    if (!parsed.success) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: ${formatZodIssues(parsed.error)}`,
      );
      continue;
    }

    const voucher = { ...parsed.data };

    if (
      voucher.sentToEmail &&
      !emailSchema.safeParse(voucher.sentToEmail).success
    ) {
      voucher.sentToEmail = undefined;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: e-mail de envio invalido, campo ignorado.`,
      );
    }

    if (
      voucher.sentAt &&
      !isoDateTimeSchema.safeParse(voucher.sentAt).success
    ) {
      voucher.sentAt = undefined;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: data de envio invalida, campo ignorado.`,
      );
    }

    if (
      voucher.expiresAt &&
      !isoDateTimeSchema.safeParse(voucher.expiresAt).success
    ) {
      voucher.expiresAt = undefined;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: validade invalida, campo ignorado.`,
      );
    }

    let matchedSchool: SchoolLookup | null = null;

    if (
      voucher.schoolExternalId &&
      schoolByExternalId.has(voucher.schoolExternalId)
    ) {
      matchedSchool = schoolByExternalId.get(voucher.schoolExternalId) ?? null;
    } else {
      const schoolNameKey = normalizeNameKey(voucher.schoolName);
      const schoolMatches = schoolByNormalizedName.get(schoolNameKey) ?? [];

      if (schoolMatches.length === 1) {
        matchedSchool = schoolMatches[0];
      } else if (schoolMatches.length > 1) {
        rowWarnings.push(
          `Linha ${spreadsheetRowNumber}: escola com nome ambiguo para vinculo (${voucher.schoolName}). Voucher mantido sem schoolId.`,
        );
      }
    }

    if (!matchedSchool) {
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: escola nao encontrada para vinculo (${voucher.schoolExternalId ?? voucher.schoolName}). Voucher mantido com snapshot.`,
      );
    }

    const identityCandidates = buildVoucherIdentityCandidates(voucher);
    const matchingIds = new Set<string>();

    for (const candidate of identityCandidates) {
      for (const existingId of voucherIdentityMap.get(candidate) ?? []) {
        matchingIds.add(existingId);
      }
    }

    if (matchingIds.size > 1) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: mais de um voucher existente corresponde a chave de idempotencia (${voucher.voucherCode}).`,
      );
      continue;
    }

    const persistenceData = buildVoucherPersistenceData(voucher, matchedSchool);

    try {
      if (matchingIds.size === 1) {
        const [existingId] = [...matchingIds];
        const previousVoucher = voucherById.get(existingId);
        const updatedVoucher = await prisma.schoolVoucher.update({
          where: { id: existingId },
          data: persistenceData,
          select: {
            id: true,
            schoolExternalId: true,
            schoolName: true,
            campaignName: true,
            voucherCode: true,
            sentToEmail: true,
            sentAt: true,
          },
        });

        if (previousVoucher) {
          removeVoucherFromIdentityMap(voucherIdentityMap, previousVoucher);
        }

        const normalizedVoucher: ExistingVoucherRecord = {
          id: updatedVoucher.id,
          schoolExternalId: updatedVoucher.schoolExternalId ?? undefined,
          schoolName: updatedVoucher.schoolName,
          campaignName: updatedVoucher.campaignName,
          voucherCode: updatedVoucher.voucherCode,
          sentToEmail: updatedVoucher.sentToEmail ?? undefined,
          sentAt: updatedVoucher.sentAt?.toISOString(),
        };

        voucherById.set(updatedVoucher.id, normalizedVoucher);
        addVoucherToIdentityMap(voucherIdentityMap, normalizedVoucher);
        stats.updated += 1;
        continue;
      }

      const createdVoucher = await prisma.schoolVoucher.create({
        data: persistenceData,
        select: {
          id: true,
          schoolExternalId: true,
          schoolName: true,
          campaignName: true,
          voucherCode: true,
          sentToEmail: true,
          sentAt: true,
        },
      });

      const normalizedVoucher: ExistingVoucherRecord = {
        id: createdVoucher.id,
        schoolExternalId: createdVoucher.schoolExternalId ?? undefined,
        schoolName: createdVoucher.schoolName,
        campaignName: createdVoucher.campaignName,
        voucherCode: createdVoucher.voucherCode,
        sentToEmail: createdVoucher.sentToEmail ?? undefined,
        sentAt: createdVoucher.sentAt?.toISOString(),
      };

      voucherById.set(normalizedVoucher.id, normalizedVoucher);
      addVoucherToIdentityMap(voucherIdentityMap, normalizedVoucher);
      stats.created += 1;
    } catch (error) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }.`,
      );
    }
  }

  const combinedWarnings = [...globalWarnings, ...rowWarnings];
  const warningExamples = combinedWarnings.slice(0, 12);

  console.log(`Arquivo processado: ${resolvedPath}`);
  console.log(`Campanha utilizada: ${derivedCampaignName}`);
  console.log(`Registros lidos: ${stats.read}`);
  console.log(`Vouchers criados: ${stats.created}`);
  console.log(`Vouchers atualizados: ${stats.updated}`);
  console.log(`Registros ignorados: ${stats.skipped}`);
  console.log(`Ocorrencias com aviso: ${combinedWarnings.length}`);

  if (warningExamples.length > 0) {
    console.log("");
    console.log("Exemplos de avisos:");

    for (const warning of warningExamples) {
      console.log(`- ${warning}`);
    }

    if (combinedWarnings.length > warningExamples.length) {
      console.log(
        `- ... e mais ${combinedWarnings.length - warningExamples.length} aviso(s).`,
      );
    }
  }

  await recordImportExecution(prisma, {
    sourceLabel: "import-vouchers.ts",
    summary: `Importacao de vouchers executada para ${sourceFile}: ${stats.created} criado(s), ${stats.updated} atualizado(s), ${stats.skipped} ignorado(s).`,
    metadata: {
      filePath: resolvedPath,
      campaignName: derivedCampaignName,
      read: stats.read,
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      warningCount: combinedWarnings.length,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
