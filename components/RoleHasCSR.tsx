"use client";

import type { ReactNode } from "react";
import { usePrivilege } from "@/hooks/usePrivilege";

interface RoleHasCSRProps {
  privileges: string[];
  children: ReactNode;
  fallback?: ReactNode;
  require?: "all" | "any";
}

export function RoleHasCSR({
  privileges,
  children,
  fallback,
  require: mode = "all",
}: RoleHasCSRProps) {
  const { valid, isLoading } = usePrivilege(privileges, { require: mode });

  if (isLoading) return null;
  if (!valid) return fallback ?? null;
  return <>{children}</>;
}
