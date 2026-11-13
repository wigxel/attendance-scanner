import { format, isToday, isValid } from "date-fns";
import type { CustomerRegisterTuple } from "@/hooks/tracking";

/** The day-stamp carried inside a member's personal QR code. */
export const ScanTimeCodec = {
  encode(date: Date) {
    return format(date, "dd-MM-yyyy-hh");
  },

  decode(time_str?: string) {
    const [d, m, y, h] = String(time_str).split("-");

    const date = new Date(+y, +m - 1, +d, +h);
    const is_valid_date = isValid(date) && isToday(date);

    return { success: is_valid_date, value: date };
  },
};

export type ScanMode = "walk_in" | "reservation";

export type ResolvedScan =
  | { status: "invalid" }
  | {
      status: "ready";
      customerId: string;
      visitorId: string;
      browser: string;
      plan: string;
      mode: ScanMode;
    };

/**
 * Validates the tuple decoded from a member's personal QR and picks the only
 * registration mode the backend would accept: reservation when the member has
 * an active booking, walk-in otherwise.
 */
export function resolveScan(
  decoded: CustomerRegisterTuple | null,
  hasActiveBooking: boolean,
): ResolvedScan {
  if (!decoded) return { status: "invalid" };

  const [customerId, visitorId, browser, plan, time] = decoded;

  if (!customerId) return { status: "invalid" };
  if (!ScanTimeCodec.decode(time).success) return { status: "invalid" };
  if (!hasActiveBooking && !plan) return { status: "invalid" };

  return {
    status: "ready",
    customerId,
    visitorId: visitorId ?? "unknown",
    browser: browser ?? "unknown",
    plan: plan ?? "none",
    mode: hasActiveBooking ? "reservation" : "walk_in",
  };
}

/**
 * The exact argument object `registerUser` accepts. Convex rejects unknown
 * keys, so the `status` tag must never travel with it.
 */
export function toRegisterArgs(
  resolved: Extract<ResolvedScan, { status: "ready" }>,
) {
  const { customerId, visitorId, browser, plan, mode } = resolved;

  return { customerId, visitorId, browser, plan, mode };
}
