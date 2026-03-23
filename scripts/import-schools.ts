import fs from "node:fs";
import path from "node:path";

import { PrismaClient, type Prisma, type School } from "@prisma/client";
import { z } from "zod";
import * as XLSX from "xlsx";

import { recordImportExecution } from "../src/lib/server/audit-log";

const prisma = new PrismaClient();

const usageMessage =
  "Uso: npm run db:import:schools -- <caminho-do-arquivo.csv|xlsx|xls>";

const headerMap = new Map<string, keyof ImportedSchoolInput>([
  ["id da escola", "externalSchoolId"],
  ["nome da escola", "schoolName"],
  ["e-mail da escola", "schoolEmail"],
  ["email da escola", "schoolEmail"],
  ["status da escola", "schoolStatus"],
  ["cluster", "cluster"],
  ["carteira saf", "safOwner"],
  ["cidade da escola", "city"],
  ["estado da escola", "state"],
  ["cnpj", "cnpj"],
  ["nome fantasia", "tradeName"],
  ["regiao da escola", "region"],
  ["regiao", "region"],
  ["telefone", "contactPhone"],
  ["telefone da escola", "contactPhone"],
  ["telefone de contato da escola", "contactPhone"],
]);

const importedSchoolSchema = z.object({
  externalSchoolId: z.string().trim().min(1).optional().nullable(),
  schoolName: z.string().trim().min(1, "Nome da Escola obrigatorio."),
  schoolEmail: z.string().trim().min(1).optional().nullable(),
  schoolStatus: z.string().trim().min(1).optional().nullable(),
  cluster: z.string().trim().min(1).optional().nullable(),
  safOwner: z.string().trim().min(1).optional().nullable(),
  city: z.string().trim().min(1).optional().nullable(),
  state: z.string().trim().min(1).optional().nullable(),
  cnpj: z.string().trim().min(1).optional().nullable(),
  tradeName: z.string().trim().min(1).optional().nullable(),
  region: z.string().trim().min(1).optional().nullable(),
  contactPhone: z.string().trim().min(1).optional().nullable(),
});

const emailSchema = z.string().email();

type ImportedSchoolInput = z.input<typeof importedSchoolSchema>;
type ImportedSchool = z.output<typeof importedSchoolSchema>;

type ImportStats = {
  created: number;
  updated: number;
  skipped: number;
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

function normalizeEmail(value: unknown) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function normalizeState(value: unknown) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : undefined;
}

function normalizeCnpj(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}

function isEmptyRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => normalizeText(value) === undefined);
}

function mapRow(row: Record<string, unknown>): ImportedSchoolInput {
  const mapped: ImportedSchoolInput = {
    externalSchoolId: undefined,
    schoolName: "",
    schoolEmail: undefined,
    schoolStatus: undefined,
    cluster: undefined,
    safOwner: undefined,
    city: undefined,
    state: undefined,
    cnpj: undefined,
    tradeName: undefined,
    region: undefined,
    contactPhone: undefined,
  };

  for (const [header, rawValue] of Object.entries(row)) {
    const targetKey = headerMap.get(normalizeHeader(header));

    if (!targetKey) {
      continue;
    }

    switch (targetKey) {
      case "schoolName":
        mapped.schoolName = normalizeText(rawValue) ?? "";
        break;
      case "schoolEmail":
        mapped.schoolEmail = normalizeEmail(rawValue);
        break;
      case "state":
        mapped.state = normalizeState(rawValue);
        break;
      case "cnpj":
        mapped.cnpj = normalizeCnpj(rawValue);
        break;
      default:
        mapped[targetKey] = normalizeText(rawValue);
        break;
    }
  }

  return mapped;
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join("; ");
}

function getWorkbookRows(filePath: string) {
  const workbook = XLSX.readFile(filePath, {
    raw: false,
    cellDates: false,
    dense: false,
  });
  const [firstSheetName] = workbook.SheetNames;

  if (!firstSheetName) {
    throw new Error("O arquivo nao possui abas legiveis.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
}

async function findExistingSchool(data: ImportedSchool) {
  const matches = new Map<string, School>();

  if (data.externalSchoolId) {
    const schoolByExternalId = await prisma.school.findUnique({
      where: { externalSchoolId: data.externalSchoolId },
    });

    if (schoolByExternalId) {
      matches.set(schoolByExternalId.id, schoolByExternalId);
    }
  }

  if (data.cnpj) {
    const schoolByCnpj = await prisma.school.findFirst({
      where: { cnpj: data.cnpj },
      orderBy: { createdAt: "asc" },
    });

    if (schoolByCnpj) {
      matches.set(schoolByCnpj.id, schoolByCnpj);
    }
  }

  if (data.schoolName) {
    const schoolByName = await prisma.school.findFirst({
      where: { schoolName: data.schoolName },
      orderBy: { createdAt: "asc" },
    });

    if (schoolByName) {
      matches.set(schoolByName.id, schoolByName);
    }
  }

  if (matches.size > 1) {
    throw new Error(
      "conflito entre externalSchoolId, cnpj e/ou schoolName ja cadastrados em registros diferentes",
    );
  }

  return [...matches.values()][0] ?? null;
}

function buildSchoolData(data: ImportedSchool): Prisma.SchoolUncheckedCreateInput {
  return {
    externalSchoolId: data.externalSchoolId ?? null,
    schoolName: data.schoolName,
    schoolEmail: data.schoolEmail ?? null,
    schoolStatus: data.schoolStatus ?? null,
    cluster: data.cluster ?? null,
    safOwner: data.safOwner ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    cnpj: data.cnpj ?? null,
    tradeName: data.tradeName ?? null,
    region: data.region ?? null,
    contactPhone: data.contactPhone ?? null,
  };
}

async function persistSchool(data: ImportedSchool): Promise<"created" | "updated"> {
  const existing = await findExistingSchool(data);
  const schoolData = buildSchoolData(data);

  if (!existing) {
    await prisma.school.create({ data: schoolData });
    return "created";
  }

  await prisma.school.update({
    where: { id: existing.id },
    data: schoolData,
  });

  return "updated";
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

  const rows = getWorkbookRows(resolvedPath);
  const stats: ImportStats = {
    created: 0,
    updated: 0,
    skipped: 0,
  };
  const rowWarnings: string[] = [];
  const seenExternalIds = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const spreadsheetRowNumber = index + 2;

    if (isEmptyRow(row)) {
      continue;
    }

    const mappedRow = mapRow(row);
    const parsed = importedSchoolSchema.safeParse(mappedRow);

    if (!parsed.success) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: ${formatZodIssues(parsed.error)}`,
      );
      continue;
    }

    const school = { ...parsed.data };

    if (
      school.schoolEmail &&
      !emailSchema.safeParse(school.schoolEmail).success
    ) {
      school.schoolEmail = undefined;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: E-mail da Escola invalido, campo ignorado.`,
      );
    }

    if (
      school.externalSchoolId &&
      seenExternalIds.has(school.externalSchoolId)
    ) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: externalSchoolId duplicado no arquivo (${school.externalSchoolId}).`,
      );
      continue;
    }

    if (school.externalSchoolId) {
      seenExternalIds.add(school.externalSchoolId);
    }

    try {
      const result = await persistSchool(school);
      stats[result] += 1;
    } catch (error) {
      stats.skipped += 1;
      rowWarnings.push(
        `Linha ${spreadsheetRowNumber}: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }.`,
      );
    }
  }

  console.log(`Arquivo processado: ${resolvedPath}`);
  console.log(`Escolas criadas: ${stats.created}`);
  console.log(`Escolas atualizadas: ${stats.updated}`);
  console.log(`Linhas ignoradas: ${stats.skipped}`);

  if (rowWarnings.length > 0) {
    console.log("");
    console.log("Ocorrencias:");

    for (const warning of rowWarnings) {
      console.log(`- ${warning}`);
    }
  }

  await recordImportExecution(prisma, {
    sourceLabel: "import-schools.ts",
    summary: `Importacao de escolas executada para ${sourceFileName(resolvedPath)}: ${stats.created} criada(s), ${stats.updated} atualizada(s), ${stats.skipped} ignorada(s).`,
    metadata: {
      filePath: resolvedPath,
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      warningCount: rowWarnings.length,
    },
  });
}

function sourceFileName(filePath: string) {
  return path.basename(filePath);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
