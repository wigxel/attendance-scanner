// @vitest-environment node

import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import type { CustomerRegisterTuple } from "@/hooks/tracking";
import { resolveScan, ScanTimeCodec, toRegisterArgs } from "./scan";

function memberQr(overrides: Record<number, string | undefined> = {}) {
  const tuple: CustomerRegisterTuple = [
    "customer-1",
    "visitor-9",
    "Safari",
    "free",
    ScanTimeCodec.encode(new Date()),
  ];

  return tuple.map((value, i) =>
    i in overrides ? overrides[i] : value,
  ) as CustomerRegisterTuple;
}

describe("resolveScan", () => {
  it("registers a member with an active booking as a reservation", () => {
    expect(resolveScan(memberQr({}), true)).toMatchObject({
      status: "ready",
      mode: "reservation",
      customerId: "customer-1",
    });
  });

  it("registers a member with no booking as a walk-in", () => {
    expect(resolveScan(memberQr({}), false)).toMatchObject({
      status: "ready",
      mode: "walk_in",
    });
  });

  it("rejects a code stamped on another day", () => {
    const stale = memberQr({
      4: format(addDays(new Date(), -1), "dd-MM-yyyy-hh"),
    });

    expect(resolveScan(stale, true)).toEqual({ status: "invalid" });
  });

  it("rejects a code carrying no customer", () => {
    expect(resolveScan(memberQr({ 0: undefined }), true)).toEqual({
      status: "invalid",
    });
  });

  it("rejects a walk-in code carrying no plan", () => {
    expect(resolveScan(memberQr({ 3: undefined }), false)).toEqual({
      status: "invalid",
    });
  });

  it("hands registerUser only the fields it accepts", () => {
    const ready = resolveScan(memberQr({}), false);

    if (ready.status !== "ready") throw new Error("expected a ready scan");

    // Convex rejects unknown keys, so the status tag must not ride along.
    expect(Object.keys(toRegisterArgs(ready)).sort()).toEqual([
      "browser",
      "customerId",
      "mode",
      "plan",
      "visitorId",
    ]);
  });
});
