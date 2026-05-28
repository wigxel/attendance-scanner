"use client";

import { SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { safeArray } from "@/lib/data.helpers";
import { useQuery } from "convex/react";

export function AccessPlanDropdown() {
  const accessPlans = useQuery(api.myFunctions.listAccessPlans);

  return (
    <SelectContent>
      {safeArray(accessPlans)
        .filter((p) => p.key !== "free")
        .map((plan) => (
          <SelectItem key={plan.key} value={plan.key}>
            {plan.name} &mdash; {plan.no_of_days} day(s)
          </SelectItem>
        ))}
    </SelectContent>
  );
}
