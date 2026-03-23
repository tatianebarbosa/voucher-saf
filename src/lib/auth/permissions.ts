import type { UserRole } from "@/lib/auth/roles";

export type SafPermission =
  | "requests.read"
  | "requests.update_status"
  | "requests.copy_generated_texts"
  | "vouchers.read"
  | "vouchers.create"
  | "vouchers.update"
  | "schools.read"
  | "schools.create"
  | "schools.update_operational"
  | "schools.update_admin";

const rolePermissions: Record<UserRole, readonly SafPermission[]> = {
  SAF_ADMIN: [
    "requests.read",
    "requests.update_status",
    "requests.copy_generated_texts",
    "vouchers.read",
    "vouchers.create",
    "vouchers.update",
    "schools.read",
    "schools.create",
    "schools.update_operational",
    "schools.update_admin",
  ],
  SAF_OPERADOR: [
    "requests.read",
    "requests.update_status",
    "requests.copy_generated_texts",
    "vouchers.read",
    "vouchers.create",
    "vouchers.update",
    "schools.read",
    "schools.update_operational",
  ],
  SAF_LEITURA: [
    "requests.read",
    "requests.copy_generated_texts",
    "vouchers.read",
    "schools.read",
  ],
};

export function hasPermissionForRole(
  role: UserRole,
  permission: SafPermission,
) {
  return rolePermissions[role].includes(permission);
}
