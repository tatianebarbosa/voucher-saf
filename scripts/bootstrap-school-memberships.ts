import { PrismaClient } from "@prisma/client";

import {
  INTERNAL_SAF_CONSULTANTS,
  INTERNAL_SAF_OWNER_REPLACEMENTS,
  type InternalSafConsultant,
} from "../src/data/internal-saf-consultants";

const prisma = new PrismaClient();

const APPLY_FLAG = "--apply";

type ConsultantDirectoryEntry = InternalSafConsultant & {
  userId?: string;
  isActive?: boolean;
};

type PreviewSchoolAssignment = {
  schoolId: string;
  schoolName: string;
  originalOwner: string;
  effectiveOwner: string;
};

type ReplacementPreview = {
  schoolName: string;
  originalOwner: string;
  replacementOwner: string;
  replacementEmail: string;
};

type UnmatchedSchoolPreview = {
  schoolName: string;
  owner: string | null;
  reason: string;
};

type AmbiguousSchoolPreview = {
  schoolName: string;
  owner: string;
  consultantEmails: string[];
};

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function extractOwnerSegments(value: string | null) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[;,|/]+/g)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0),
    ),
  ];
}

function buildConsultantTokens(consultant: InternalSafConsultant) {
  const emailLocalPart = consultant.email.split("@")[0] ?? consultant.email;

  return [
    normalizeToken(consultant.canonicalName),
    normalizeToken(consultant.displayName),
    normalizeToken(consultant.email),
    normalizeToken(emailLocalPart),
  ].filter((token) => token.length > 0);
}

function printSection(title: string) {
  console.log("");
  console.log(`[membership-bootstrap] ${title}`);
}

async function main() {
  const shouldApply = process.argv.includes(APPLY_FLAG);
  const dbUsers = await prisma.user.findMany({
    where: {
      email: {
        in: INTERNAL_SAF_CONSULTANTS.map((consultant) => consultant.email),
      },
    },
    select: {
      id: true,
      email: true,
      isActive: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  const dbUsersByEmail = new Map(
    dbUsers.map((user) => [user.email.toLocaleLowerCase("pt-BR"), user]),
  );
  const consultants: ConsultantDirectoryEntry[] = INTERNAL_SAF_CONSULTANTS.map(
    (consultant) => {
      const dbUser = dbUsersByEmail.get(
        consultant.email.toLocaleLowerCase("pt-BR"),
      );

      return {
        ...consultant,
        userId: dbUser?.id,
        isActive: dbUser?.isActive,
      };
    },
  );

  const consultantsByToken = new Map<string, ConsultantDirectoryEntry[]>();

  for (const consultant of consultants) {
    for (const token of buildConsultantTokens(consultant)) {
      const existingEntries = consultantsByToken.get(token) ?? [];
      const hasConsultant = existingEntries.some(
        (entry) => entry.email === consultant.email,
      );

      if (!hasConsultant) {
        existingEntries.push(consultant);
      }

      consultantsByToken.set(token, existingEntries);
    }
  }

  const replacementTargetByToken = new Map<string, string>();

  for (const replacement of INTERNAL_SAF_OWNER_REPLACEMENTS) {
    replacementTargetByToken.set(
      normalizeToken(replacement.from),
      normalizeToken(replacement.to),
    );
  }

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      schoolName: true,
      safOwner: true,
    },
    orderBy: {
      schoolName: "asc",
    },
  });

  const previewByConsultant = new Map<
    string,
    {
      consultant: ConsultantDirectoryEntry;
      schools: PreviewSchoolAssignment[];
    }
  >(
    consultants.map((consultant) => [
      consultant.email,
      {
        consultant,
        schools: [],
      },
    ]),
  );
  const replacements: ReplacementPreview[] = [];
  const unmatchedSchools: UnmatchedSchoolPreview[] = [];
  const ambiguousSchools: AmbiguousSchoolPreview[] = [];

  for (const school of schools) {
    const ownerSegments = extractOwnerSegments(school.safOwner);

    if (ownerSegments.length === 0) {
      unmatchedSchools.push({
        schoolName: school.schoolName,
        owner: school.safOwner,
        reason: "Carteira SAF nao preenchida.",
      });
      continue;
    }

    const matchedConsultants = new Map<string, ConsultantDirectoryEntry>();
    let effectiveOwner = school.safOwner ?? "";

    for (const ownerSegment of ownerSegments) {
      const rawToken = normalizeToken(ownerSegment);
      const effectiveToken =
        replacementTargetByToken.get(rawToken) ?? rawToken;
      const tokenConsultants = consultantsByToken.get(effectiveToken) ?? [];

      if (rawToken !== effectiveToken && tokenConsultants.length === 1) {
        const [replacementConsultant] = tokenConsultants;
        effectiveOwner = replacementConsultant.displayName;
        replacements.push({
          schoolName: school.schoolName,
          originalOwner: ownerSegment,
          replacementOwner: replacementConsultant.displayName,
          replacementEmail: replacementConsultant.email,
        });
      }

      for (const consultant of tokenConsultants) {
        matchedConsultants.set(consultant.email, consultant);
      }
    }

    if (matchedConsultants.size === 0) {
      unmatchedSchools.push({
        schoolName: school.schoolName,
        owner: school.safOwner,
        reason: "Carteira SAF sem mapeamento para consultor interno.",
      });
      continue;
    }

    if (matchedConsultants.size > 1) {
      ambiguousSchools.push({
        schoolName: school.schoolName,
        owner: school.safOwner ?? "",
        consultantEmails: [...matchedConsultants.values()]
          .map((consultant) => consultant.email)
          .sort((left, right) => left.localeCompare(right, "pt-BR")),
      });
      continue;
    }

    const [matchedConsultant] = [...matchedConsultants.values()];
    previewByConsultant.get(matchedConsultant.email)?.schools.push({
      schoolId: school.id,
      schoolName: school.schoolName,
      originalOwner: school.safOwner ?? "",
      effectiveOwner,
    });
  }

  const membershipCandidates = [...previewByConsultant.values()].flatMap(
    ({ consultant, schools: assignedSchools }) =>
      consultant.userId
        ? assignedSchools.map((school) => ({
            userId: consultant.userId as string,
            schoolId: school.schoolId,
          }))
        : [],
  );
  const linkedSchoolsCount = [...previewByConsultant.values()].reduce(
    (total, entry) => total + entry.schools.length,
    0,
  );

  console.log(
    `[membership-bootstrap] modo=${shouldApply ? "apply" : "dry-run"} consultores=${consultants.length} usuarios_cadastrados=${dbUsers.length} escolas_total=${schools.length} escolas_vinculadas=${linkedSchoolsCount} substituicoes=${replacements.length} sem_correspondencia=${unmatchedSchools.length} ambiguas=${ambiguousSchools.length}`,
  );

  printSection("usuario x escolas vinculadas");

  for (const { consultant, schools: assignedSchools } of [...previewByConsultant.values()].sort(
    (left, right) =>
      left.consultant.displayName.localeCompare(
        right.consultant.displayName,
        "pt-BR",
      ),
  )) {
    const sortedSchools = [...assignedSchools].sort((left, right) =>
      left.schoolName.localeCompare(right.schoolName, "pt-BR"),
    );
    const userStatus = consultant.userId
      ? consultant.isActive
        ? "usuario_interno_ativo"
        : "usuario_interno_inativo"
      : "usuario_interno_nao_cadastrado";

    console.log(
      `- ${consultant.displayName} <${consultant.email}>: ${sortedSchools.length} escola(s) [${userStatus}]`,
    );

    for (const school of sortedSchools) {
      const replacementSuffix =
        school.originalOwner !== school.effectiveOwner
          ? ` [owner: ${school.originalOwner} -> ${school.effectiveOwner}]`
          : "";

      console.log(`  - ${school.schoolName}${replacementSuffix}`);
    }
  }

  printSection("registros substituidos de Rafhael para Jamille");

  if (replacements.length === 0) {
    console.log("- Nenhum registro precisou de substituicao.");
  } else {
    for (const replacement of replacements.sort((left, right) =>
      left.schoolName.localeCompare(right.schoolName, "pt-BR"),
    )) {
      console.log(
        `- ${replacement.schoolName}: ${replacement.originalOwner} -> ${replacement.replacementOwner} <${replacement.replacementEmail}>`,
      );
    }
  }

  printSection("escolas sem correspondencia");

  if (unmatchedSchools.length === 0) {
    console.log("- Nenhuma escola ficou sem correspondencia.");
  } else {
    for (const unmatchedSchool of unmatchedSchools.sort((left, right) =>
      left.schoolName.localeCompare(right.schoolName, "pt-BR"),
    )) {
      const ownerLabel = unmatchedSchool.owner ?? "Nao informado";
      console.log(
        `- ${unmatchedSchool.schoolName}: ${ownerLabel} (${unmatchedSchool.reason})`,
      );
    }
  }

  if (ambiguousSchools.length > 0) {
    printSection("escolas com correspondencia ambigua");

    for (const ambiguousSchool of ambiguousSchools.sort((left, right) =>
      left.schoolName.localeCompare(right.schoolName, "pt-BR"),
    )) {
      console.log(
        `- ${ambiguousSchool.schoolName}: ${ambiguousSchool.owner} -> ${ambiguousSchool.consultantEmails.join(", ")}`,
      );
    }
  }

  if (!shouldApply) {
    console.log("");
    console.log(
      `[membership-bootstrap] nenhuma alteracao foi gravada. Rode novamente com ${APPLY_FLAG} para aplicar.`,
    );
    return;
  }

  let createdCount = 0;

  for (const candidate of membershipCandidates) {
    await prisma.schoolMembership.upsert({
      where: {
        userId_schoolId: {
          userId: candidate.userId,
          schoolId: candidate.schoolId,
        },
      },
      update: {},
      create: candidate,
    });

    createdCount += 1;
  }

  console.log(
    `[membership-bootstrap] memberships aplicados com sucesso: ${createdCount}.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
