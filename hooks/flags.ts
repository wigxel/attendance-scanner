import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** The signed-in customer's resolved check-in mode, or null when signed out. */
export function useCheckInMode() {
  return useQuery(api.flags.getMyCheckInMode);
}

/** The app-wide fallback used by customers with no label of their own. */
export function useDefaultCheckInMode() {
  return useQuery(api.flags.getCheckInModeDefault);
}
