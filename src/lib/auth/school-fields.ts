import type { SchoolDraft } from "@/types/school";

export const ADMIN_ONLY_SCHOOL_FIELDS = [
  "externalSchoolId",
  "schoolName",
  "cnpj",
  "tradeName",
  "region",
  "city",
  "state",
] as const satisfies readonly (keyof SchoolDraft)[];

