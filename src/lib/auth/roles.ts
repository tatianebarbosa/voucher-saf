export const USER_ROLE_VALUES = [
  "SAF_ADMIN",
  "SAF_OPERADOR",
  "SAF_LEITURA",
] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    USER_ROLE_VALUES.includes(value as UserRole)
  );
}

export function isSafRole(role: UserRole) {
  return USER_ROLE_VALUES.includes(role);
}

export function isSafViewerRole(role: UserRole) {
  return role === "SAF_LEITURA";
}

export function isSafAdminRole(role: UserRole) {
  return role === "SAF_ADMIN";
}

export function getDefaultHomeForRole(role: UserRole) {
  switch (role) {
    case "SAF_ADMIN":
    case "SAF_OPERADOR":
    case "SAF_LEITURA":
      return "/painel-saf";
  }
}

export function getUserRoleLabel(role: UserRole) {
  switch (role) {
    case "SAF_ADMIN":
      return "SAF Admin";
    case "SAF_OPERADOR":
      return "SAF Operador";
    case "SAF_LEITURA":
      return "Central Viewer";
  }
}
