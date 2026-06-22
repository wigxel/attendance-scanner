import { currentUser } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

interface RoleHasProps {
  privileges: string[];
  children: ReactNode;
  fallback?: ReactNode;
  require?: "all" | "any";
}

export async function RoleHas({
  privileges,
  children,
  fallback,
  require: mode = "all",
}: RoleHasProps) {
  const user = await currentUser().catch(() => null);
  if (!user) return fallback ?? null;

  const userPrivileges = (user?.privateMetadata?.privileges as string[]) ?? [];
  const matches =
    mode === "all"
      ? privileges.every((p) => userPrivileges.includes(p))
      : privileges.some((p) => userPrivileges.includes(p));

  if (!matches) return fallback ?? null;
  return <>{children}</>;
}
