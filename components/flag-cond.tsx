"use client";

import type { IFlagsmithFeature } from "@flagsmith/flagsmith/types";
import type { ReactNode } from "react";
import { useFlags } from "@/services/flagsmith";

interface FlagCondProps {
  flags: string[];
  children: ReactNode;
  fallback?: ReactNode;
  require?: "all" | "any";
  cond?: (flags: Record<string, IFlagsmithFeature>) => boolean;
}

export function FlagCond({
  flags,
  children,
  fallback,
  require: mode = "all",
  cond,
}: FlagCondProps) {
  const resolved = useFlags(flags);

  if (cond) {
    if (!cond(resolved)) return fallback ?? null;
    return <>{children}</>;
  }

  const match =
    mode === "all"
      ? flags.every((f) => resolved[f]?.enabled)
      : flags.some((f) => resolved[f]?.enabled);

  if (!match) return fallback ?? null;
  return <>{children}</>;
}
