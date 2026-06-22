"use client";

import { useConvex, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "@/convex/_generated/api";

export function usePrivilege(
  privileges: string | string[],
  options?: { require?: "all" | "any" },
) {
  const convex = useConvex();
  const privilegeArray = useMemo(
    () => (Array.isArray(privileges) ? privileges : [privileges]),
    [privileges],
  );
  const mode = options?.require ?? "all";

  const safeQuery = mode === "all" ? api.acl.hasAll : api.acl.hasAny;
  const result = useQuery(safeQuery, { privileges: privilegeArray });

  const check = useCallback(
    async (specific?: string | string[]) => {
      const toCheck =
        specific !== undefined
          ? Array.isArray(specific)
            ? specific
            : [specific]
          : privilegeArray;
      const res = await convex.query(
        mode === "all" ? api.acl.hasAll : api.acl.hasAny,
        { privileges: toCheck },
      );
      return res?.valid ?? false;
    },
    [convex, privilegeArray, mode],
  );

  return { valid: result?.valid, isLoading: result === undefined, check };
}
