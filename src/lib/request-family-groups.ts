import { formatCpf, onlyDigits } from "@/lib/formatters";
import type {
  RequestDraft,
  RequestFamilyGroup,
  RequestStudentEntry,
  VoucherRequest,
} from "@/types/request";

type RequestFamilyGroupSource = Pick<
  RequestDraft,
  | "familyGroups"
  | "studentNames"
  | "studentClassName"
  | "responsible1Name"
  | "responsible1Cpf"
  | "responsible2Name"
  | "responsible2Cpf"
>;

export function createEmptyRequestStudent(): RequestStudentEntry {
  return {
    studentName: "",
    studentClassName: "",
  };
}

export function createEmptyRequestFamilyGroup(): RequestFamilyGroup {
  return {
    students: [createEmptyRequestStudent()],
    responsible1Name: "",
    responsible1Cpf: "",
    responsible2Name: "",
    responsible2Cpf: "",
  };
}

export function normalizeRequestFamilyGroups(
  groups: RequestFamilyGroup[],
): RequestFamilyGroup[] {
  return groups.map((group) => ({
    students: group.students.map((student) => ({
      studentName: student.studentName.trim(),
      studentClassName: student.studentClassName.trim(),
    })),
    responsible1Name: group.responsible1Name.trim(),
    responsible1Cpf: onlyDigits(group.responsible1Cpf),
    responsible2Name: group.responsible2Name.trim(),
    responsible2Cpf: onlyDigits(group.responsible2Cpf),
  }));
}

function buildSingleFamilyFallback(
  source: RequestFamilyGroupSource,
): RequestFamilyGroup[] {
  const hasAnyLegacyField = [
    source.studentNames,
    source.studentClassName,
    source.responsible1Name,
    source.responsible1Cpf,
    source.responsible2Name,
    source.responsible2Cpf,
  ].some((value) => value.trim() !== "");

  if (!hasAnyLegacyField) {
    return [];
  }

  return [
    {
      students: [
        {
          studentName: source.studentNames.trim(),
          studentClassName: source.studentClassName.trim(),
        },
      ],
      responsible1Name: source.responsible1Name.trim(),
      responsible1Cpf: onlyDigits(source.responsible1Cpf),
      responsible2Name: source.responsible2Name.trim(),
      responsible2Cpf: onlyDigits(source.responsible2Cpf),
    },
  ];
}

export function getRequestFamilyGroups(
  source: RequestFamilyGroupSource,
): RequestFamilyGroup[] {
  if (source.familyGroups?.length) {
    return source.familyGroups;
  }

  return buildSingleFamilyFallback(source);
}

export function serializeRequestFamilyGroups(groups?: RequestFamilyGroup[]) {
  if (!groups?.length) {
    return undefined;
  }

  return JSON.stringify(normalizeRequestFamilyGroups(groups));
}

export function parseRequestFamilyGroups(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as RequestFamilyGroup[];

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const normalizedGroups = parsed
      .map((group) => {
        const students = Array.isArray(group.students)
          ? group.students
              .map((student) => ({
                studentName:
                  typeof student.studentName === "string"
                    ? student.studentName.trim()
                    : "",
                studentClassName:
                  typeof student.studentClassName === "string"
                    ? student.studentClassName.trim()
                    : "",
              }))
              .filter(
                (student) =>
                  student.studentName !== "" || student.studentClassName !== "",
              )
          : [];

        if (students.length === 0) {
          return null;
        }

        return {
          students,
          responsible1Name:
            typeof group.responsible1Name === "string"
              ? group.responsible1Name.trim()
              : "",
          responsible1Cpf:
            typeof group.responsible1Cpf === "string"
              ? onlyDigits(group.responsible1Cpf)
              : "",
          responsible2Name:
            typeof group.responsible2Name === "string"
              ? group.responsible2Name.trim()
              : "",
          responsible2Cpf:
            typeof group.responsible2Cpf === "string"
              ? onlyDigits(group.responsible2Cpf)
              : "",
        } satisfies RequestFamilyGroup;
      })
      .filter((group): group is RequestFamilyGroup => group !== null);

    return normalizedGroups.length > 0 ? normalizedGroups : undefined;
  } catch {
    return undefined;
  }
}

export function countRequestFamilies(groups?: RequestFamilyGroup[]) {
  return groups?.length ?? 0;
}

export function countRequestStudents(groups?: RequestFamilyGroup[]) {
  return (
    groups?.reduce((total, group) => total + group.students.length, 0) ?? 0
  );
}

export function buildStudentNamesSummary(groups: RequestFamilyGroup[]) {
  if (groups.length === 0) {
    return "";
  }

  if (groups.length === 1) {
    return groups[0].students.map((student) => student.studentName).join(", ");
  }

  return groups
    .map(
      (group, index) =>
        `Família ${index + 1}: ${group.students
          .map((student) => student.studentName)
          .join(", ")}`,
    )
    .join("\n");
}

export function buildStudentClassesSummary(groups: RequestFamilyGroup[]) {
  if (groups.length === 0) {
    return "";
  }

  if (groups.length === 1) {
    return groups[0].students
      .map((student) => student.studentClassName)
      .join(", ");
  }

  return groups
    .map(
      (group, index) =>
        `Família ${index + 1}: ${group.students
          .map((student) => student.studentClassName)
          .join(", ")}`,
    )
    .join("\n");
}

export function buildResponsibleNamesSummary(
  groups: RequestFamilyGroup[],
  key: "responsible1Name" | "responsible2Name",
) {
  if (groups.length === 0) {
    return "";
  }

  if (groups.length === 1) {
    return groups[0][key];
  }

  return groups
    .map((group, index) => `Família ${index + 1}: ${group[key]}`)
    .join("\n");
}

export function buildResponsibleCpfsSummary(
  groups: RequestFamilyGroup[],
  key: "responsible1Cpf" | "responsible2Cpf",
) {
  if (groups.length === 0) {
    return "";
  }

  if (groups.length === 1) {
    return groups[0][key];
  }

  return groups
    .map((group, index) => `Família ${index + 1}: ${formatCpf(group[key])}`)
    .join("\n");
}

export function buildFamilyResponsiblesSummary(groups: RequestFamilyGroup[]) {
  if (groups.length === 0) {
    return "Não informado";
  }

  if (groups.length === 1) {
    const group = groups[0];

    return `${group.responsible1Name} (${formatCpf(group.responsible1Cpf)}) e ${group.responsible2Name} (${formatCpf(group.responsible2Cpf)})`;
  }

  return groups
    .map(
      (group, index) =>
        `Família ${index + 1}: ${group.responsible1Name} (${formatCpf(group.responsible1Cpf)}) e ${group.responsible2Name} (${formatCpf(group.responsible2Cpf)})`,
    )
    .join("\n");
}

export function buildFamilyGroupsSummaryForDisplay(groups: RequestFamilyGroup[]) {
  if (groups.length === 0) {
    return "Não informado";
  }

  return groups
    .map((group, index) => {
      const students = group.students
        .map(
          (student) => `${student.studentName} (${student.studentClassName})`,
        )
        .join(", ");

      return [
        `Família ${index + 1}`,
        `Aluno(s): ${students}`,
        `Responsável financeiro: ${group.responsible1Name} - ${formatCpf(group.responsible1Cpf)}`,
        `Responsável acadêmico: ${group.responsible2Name} - ${formatCpf(group.responsible2Cpf)}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildRequestDraftFromFamilyGroups(
  source: Omit<
    RequestDraft,
    | "familyGroups"
    | "studentNames"
    | "studentClassName"
    | "responsible1Name"
    | "responsible1Cpf"
    | "responsible2Name"
    | "responsible2Cpf"
  > & {
    familyGroups: RequestFamilyGroup[];
  },
): RequestDraft {
  const normalizedGroups = normalizeRequestFamilyGroups(source.familyGroups);
  const firstFamily = normalizedGroups[0];

  return {
    ...source,
    familyGroups: normalizedGroups,
    studentNames: buildStudentNamesSummary(normalizedGroups),
    studentClassName: buildStudentClassesSummary(normalizedGroups),
    responsible1Name: buildResponsibleNamesSummary(
      normalizedGroups,
      "responsible1Name",
    ),
    responsible1Cpf:
      normalizedGroups.length === 1
        ? firstFamily?.responsible1Cpf ?? ""
        : buildResponsibleCpfsSummary(normalizedGroups, "responsible1Cpf"),
    responsible2Name: buildResponsibleNamesSummary(
      normalizedGroups,
      "responsible2Name",
    ),
    responsible2Cpf:
      normalizedGroups.length === 1
        ? firstFamily?.responsible2Cpf ?? ""
        : buildResponsibleCpfsSummary(normalizedGroups, "responsible2Cpf"),
  };
}

export function hasMultipleFamilies(
  request: Pick<VoucherRequest, "familyGroups">,
) {
  return countRequestFamilies(request.familyGroups) > 1;
}
