/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { setConfig } from "./config";
import {
  getDefaultCheckInMode,
  parseCheckInMode,
  resolveCheckInMode,
} from "./flags";
import schema from "./schema";
import { type CheckInMode, SelfCheckInMessages } from "./shared";

const modules = import.meta.glob("./**/*.ts");

type T = ReturnType<typeof convexTest>;

/** Seed a users + profile pair; returns the id both share. */
async function seedCustomer(t: T, mode?: CheckInMode) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "customer@test.com",
      isAnonymous: false,
      name: "Test Customer",
    });

    await ctx.db.insert("profile", {
      id: userId,
      firstName: "Test",
      lastName: "Customer",
      occupation: "None",
      ...(mode ? { checkInMode: mode } : {}),
    });

    return userId;
  });
}

async function authed(t: T, userId: string) {
  return t.withIdentity({ subject: userId, profile_id: userId });
}

describe("parseCheckInMode", () => {
  it("keeps a known mode", () => {
    expect(parseCheckInMode("one_tap")).toBe("one_tap");
  });

  it("falls back to staff_scan for a missing value", () => {
    expect(parseCheckInMode(null)).toBe("staff_scan");
  });

  it("falls back to staff_scan for an invalid value", () => {
    expect(parseCheckInMode("everyone")).toBe("staff_scan");
  });
});

describe("default check-in mode", () => {
  it("is staff_scan when no config key exists", async () => {
    const t = convexTest(schema, modules);

    const mode = await t.run((ctx) => getDefaultCheckInMode(ctx));

    expect(mode).toBe("staff_scan");
  });

  it("reads the configured default", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      setConfig(ctx, "default_check_in_mode", "self_checkin"),
    );

    const mode = await t.run((ctx) => getDefaultCheckInMode(ctx));

    expect(mode).toBe("self_checkin");
  });

  it("ignores an invalid configured value", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => setConfig(ctx, "default_check_in_mode", "everyone"));

    const mode = await t.run((ctx) => getDefaultCheckInMode(ctx));

    expect(mode).toBe("staff_scan");
  });
});

describe("resolveCheckInMode", () => {
  it("uses the customer label over the default", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedCustomer(t, "one_tap");
    await t.run((ctx) =>
      setConfig(ctx, "default_check_in_mode", "self_checkin"),
    );

    const mode = await t.run((ctx) => resolveCheckInMode(ctx, userId));

    expect(mode).toBe("one_tap");
  });

  it("falls back to the default when the customer has no label", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedCustomer(t);
    await t.run((ctx) =>
      setConfig(ctx, "default_check_in_mode", "self_checkin"),
    );

    const mode = await t.run((ctx) => resolveCheckInMode(ctx, userId));

    expect(mode).toBe("self_checkin");
  });

  it("preserves today's off behaviour when nothing is set", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedCustomer(t);

    const mode = await t.run((ctx) => resolveCheckInMode(ctx, userId));

    expect(mode).toBe("staff_scan");
  });
});

describe("selfCheckIn mode guard", () => {
  it("refuses one-tap for a self_checkin customer", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const userId = await seedCustomer(t, "self_checkin");

    await expect(
      (await authed(t, userId)).mutation(api.selfService.selfCheckIn, {
        method: "one-tap",
      }),
    ).rejects.toThrow(SelfCheckInMessages.self_checkin);
  });

  it("refuses qr for a one_tap customer", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const userId = await seedCustomer(t, "one_tap");

    await expect(
      (await authed(t, userId)).mutation(api.selfService.selfCheckIn, {
        method: "qr",
        adminId: "admin-1",
      }),
    ).rejects.toThrow(SelfCheckInMessages.one_tap);
  });

  it("refuses both paths for a staff_scan customer", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const userId = await seedCustomer(t, "staff_scan");
    const user = await authed(t, userId);

    await expect(
      user.mutation(api.selfService.selfCheckIn, { method: "one-tap" }),
    ).rejects.toThrow(SelfCheckInMessages.staff_scan);

    await expect(
      user.mutation(api.selfService.selfCheckIn, {
        method: "qr",
        adminId: "admin-1",
      }),
    ).rejects.toThrow(SelfCheckInMessages.staff_scan);
  });

  it("applies the app default to an unlabelled customer", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const userId = await seedCustomer(t);
    await t.run((ctx) =>
      setConfig(ctx, "default_check_in_mode", "self_checkin"),
    );

    await expect(
      (await authed(t, userId)).mutation(api.selfService.selfCheckIn, {
        method: "one-tap",
      }),
    ).rejects.toThrow(SelfCheckInMessages.self_checkin);
  });

  it("allows the method the resolved mode names", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const userId = await seedCustomer(t, "one_tap");

    await expect(
      (await authed(t, userId)).mutation(api.selfService.selfCheckIn, {
        method: "one-tap",
      }),
    ).resolves.not.toThrow();
  });
});

describe("SelfCheckInMessages", () => {
  it("has actionable copy for every mode", () => {
    expect(Object.keys(SelfCheckInMessages)).toHaveLength(3);
    expect(SelfCheckInMessages.one_tap).toContain("Check In button");
    expect(SelfCheckInMessages.self_checkin).toContain("scanning the QR code");
    expect(SelfCheckInMessages.staff_scan).toContain("at the counter");
  });
});
