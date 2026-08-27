"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function DurationBadge({ duration }: { duration: number }) {
  const plan = useQuery(api.accessPlans.getByDuration, { noOfDays: duration });

  if (!plan) {
    return <span>{`${duration} days`}</span>;
  }

  return <span>{plan.name}</span>;
}
