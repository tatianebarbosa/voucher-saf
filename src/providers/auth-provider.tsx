"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { hasPermissionForRole, type SafPermission } from "@/lib/auth/permissions";
import {
  getUserRoleLabel,
  type UserRole,
} from "@/lib/auth/roles";

interface AuthContextValue {
  isAuthenticated: boolean;
  isActive: boolean;
  userEmail?: string | null;
  userRole?: UserRole | null;
  userRoleLabel?: string | null;
  hasPermission: (permission: SafPermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  isAuthenticated: boolean;
  isActive: boolean;
  userEmail?: string | null;
  userRole?: UserRole | null;
}

export function AuthProvider({
  children,
  isAuthenticated,
  isActive,
  userEmail,
  userRole,
}: AuthProviderProps) {
  const userRoleLabel = userRole ? getUserRoleLabel(userRole) : null;

  function hasPermission(permission: SafPermission) {
    if (!isAuthenticated || !isActive || !userRole) {
      return false;
    }

    return hasPermissionForRole(userRole, permission);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isActive,
        userEmail,
        userRole,
        userRoleLabel,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthSession deve ser usado dentro de AuthProvider.");
  }

  return context;
}

