/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { subDays, subHours } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

const paidAccess = {
  _v: "2",
  kind: "paid",
  planId: "daily",
  planPriceInKobo: 300000,
  amountInKobo: 300000,
  paymentMethod: "cash",
  duration: { type: "fullday" },
} as const;

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

async function grantStaffCheckin(
  t: ReturnType<typeof convexTest>,
  staffUserId: string,
) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "test-admin",
    });
    const role = await ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "test-admin",
      name: "role-staff",
      description: "",
      privileges: ["attendance:checkin"],
    });
    if (!role.success) throw new Error(role.error);
    const reg = await ctx.runMutation(
      components.wigxel_acl.identities.registerIdentity,
      {
        callerId: "test-admin",
        identity: staffUserId,
        roleId: role.data.roleId,
      },
    );
    if (!reg.success) throw new Error(reg.error);
  });
}

type SeedOverrides = {
  access?: unknown;
  timestamp?: string;
  reserved?: boolean;
};

/**
 * Seeds a guest visit for today. The guest has a `users` row but no `profile`,
 * which is what a staff-entered visitor looks like before they are linked.
 */
async function seedGuestVisit(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOverrides = {},
) {
  return t.run(async (ctx) => {
    const staffUserId = await ctx.db.insert("users", {
      email: "staff@example.com",
      isAnonymous: false,
      name: "Staff Member",
    });
    const hostUserId = await ctx.db.insert("users", {
      email: "florence@example.com",
      isAnonymous: false,
      name: "Florence Host",
    });
    await ctx.db.insert("profile", {
      id: hostUserId,
      email: "florence@example.com",
      firstName: "Florence",
      lastName: "Host",
      occupation: "None",
    });
    await ctx.db.insert("daily_register", {
      userId: hostUserId,
      timestamp: new Date().toISOString(),
      source: "web",
      device: makeDevice(),
      access: { kind: "free" },
      admitted_by: staffUserId,
    });

    const guestUserId = await ctx.db.insert("users", {
      email: "matilda@example.com",
      isAnonymous: false,
      name: "Matilda Doe",
    });

    let ticketId: Id<"tickets"> | undefined;
    if (overrides.reserved) {
      const bookingId = await ctx.db.insert("bookings", {
        userId: guestUserId,
        seatIds: [],
        duration: 1,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        durationType: "day",
        pricePerSeat: 300000,
        amount: 300000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: guestUserId,
        status: "claimed",
      });
    }

    const access = (overrides.access ?? {
      ...paidAccess,
      visiting: { hostUserId, guestType: "visitor" },
    }) as never;

    await ctx.db.insert("daily_register", {
      userId: guestUserId,
      timestamp: overrides.timestamp ?? new Date().toISOString(),
      source: "web",
      device: makeDevice("visitor-2"),
      access,
      admitted_by: staffUserId,
      ticketId,
    });

    return { staffUserId, hostUserId, guestUserId };
  });
}

const authed = (t: ReturnType<typeof convexTest>) =>
  t.withIdentity({ subject: "staff", email: "staff@example.com" });

const getGuestRow = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.run(async (ctx) =>
    ctx.db
      .query("daily_register")
      .withIndex("user", (q) => q.eq("userId", userId))
      .unique(),
  );

describe("markTodaysVisitAsRegular", () => {
  it("clears the guest link and keeps the plan and payment fields", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t);
    await grantStaffCheckin(t, staffUserId);

    await authed(t).mutation(api.register.markTodaysVisitAsRegular, {
      userId: guestUserId,
    });

    expect((await getGuestRow(t, guestUserId))?.access).toEqual(paidAccess);
  });

  it("keeps the visit on the same row — no duplicate", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t);
    await grantStaffCheckin(t, staffUserId);

    await authed(t).mutation(api.register.markTodaysVisitAsRegular, {
      userId: guestUserId,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("daily_register")
        .withIndex("user", (q) => q.eq("userId", guestUserId))
        .collect(),
    );

    expect(rows).toHaveLength(1);
  });

  it("records who converted the visit", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      aggregateTest.register(t, "customerStats");
      const { staffUserId, guestUserId } = await seedGuestVisit(t);
      await grantStaffCheckin(t, staffUserId);

      await authed(t).mutation(api.register.markTodaysVisitAsRegular, {
        userId: guestUserId,
      });
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const logs = await t.run(async (ctx) =>
        ctx.db.query("auditLog").collect(),
      );
      const entry = logs.find(
        (log) => log.action === "register.converted-to-regular",
      );

      expect(entry?.actorId).toBe(staffUserId);
      expect(entry?.targetType).toBe("daily_register");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a row older than the 24 hour edit window", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t, {
      timestamp: subHours(new Date(), 25).toISOString(),
    });
    await grantStaffCheckin(t, staffUserId);

    await expect(
      authed(t).mutation(api.register.markTodaysVisitAsRegular, {
        userId: guestUserId,
      }),
    ).rejects.toThrow("Record is older than 24 hours.");

    expect((await getGuestRow(t, guestUserId))?.access).toMatchObject({
      visiting: { hostUserId: expect.any(String) },
    });
  });

  it("rejects a visit that is not a guest visit", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t, {
      access: { kind: "free" },
    });
    await grantStaffCheckin(t, staffUserId);

    await expect(
      authed(t).mutation(api.register.markTodaysVisitAsRegular, {
        userId: guestUserId,
      }),
    ).rejects.toThrow("This visit is not a guest visit.");
  });

  it("leaves reservations read-only", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t, {
      reserved: true,
    });
    await grantStaffCheckin(t, staffUserId);

    await expect(
      authed(t).mutation(api.register.markTodaysVisitAsRegular, {
        userId: guestUserId,
      }),
    ).rejects.toThrow("Cannot modify a reserved booking.");
  });

  it("links a visitor with no profile to the customer on file", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId } = await seedGuestVisit(t);
    await grantStaffCheckin(t, staffUserId);

    const customerUserId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "customer@example.com",
        isAnonymous: false,
        name: "Customer Person",
      });
      await ctx.db.insert("profile", {
        id: userId,
        email: "customer@example.com",
        firstName: "Customer",
        lastName: "Person",
        occupation: "None",
      });
      // Their previous visit, so the count must continue rather than reset.
      await ctx.db.insert("daily_register", {
        userId,
        timestamp: subDays(new Date(), 1).toISOString(),
        source: "web",
        device: makeDevice("visitor-3"),
        access: { kind: "free" },
        admitted_by: staffUserId,
      });
      return userId;
    });

    await authed(t).mutation(api.register.markTodaysVisitAsRegular, {
      userId: guestUserId,
      linkEmail: "customer@example.com",
    });

    expect(await getGuestRow(t, guestUserId)).toBeNull();

    const customerRows = await t.run(async (ctx) =>
      ctx.db
        .query("daily_register")
        .withIndex("user", (q) => q.eq("userId", customerUserId))
        .collect(),
    );

    expect(customerRows).toHaveLength(2);
    expect(customerRows.map((row) => row.access)).toContainEqual(paidAccess);
  });

  it("refuses to link a customer already in today's scan", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");
    const { staffUserId, guestUserId, hostUserId } = await seedGuestVisit(t);
    await grantStaffCheckin(t, staffUserId);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "customer@example.com",
        isAnonymous: false,
        name: "Customer Person",
      });
      await ctx.db.insert("profile", {
        id: userId,
        email: "customer@example.com",
        firstName: "Customer",
        lastName: "Person",
        occupation: "None",
      });
      await ctx.db.insert("daily_register", {
        userId,
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice("visitor-3"),
        access: { kind: "free" },
        admitted_by: staffUserId,
      });
    });

    await expect(
      authed(t).mutation(api.register.markTodaysVisitAsRegular, {
        userId: guestUserId,
        linkEmail: "customer@example.com",
      }),
    ).rejects.toThrow("already in today's scan");

    expect((await getGuestRow(t, guestUserId))?.access).toMatchObject({
      visiting: { hostUserId },
    });
  });
});
