import { currentUser } from "@clerk/nextjs/server";
import type { ReactNode } from "react";
import { safeStr } from "@/lib/data.helpers";
import { ConvexUserImpl } from "@/lib/user.model";

interface RoleIsProps {
  role: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export async function RoleIs({ role, children, fallback }: RoleIsProps) {
  const user = await currentUser();
  const fallback_ = fallback ?? null;

  if (!user) return fallback_;
  const userRole = safeStr(ConvexUserImpl.role(user));
  const roles = Array.isArray(role) ? role : [role];
  const matches = roles.includes(userRole);

  if (!matches) return fallback_;

  return <>{children}</>;
}
