/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { findOrCreateUser } from "./myFunctions";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const guest = {
  email: "matilda@example.com",
  firstName: "Matilda",
  lastName: "Doe",
  phone: "+2348000000000",
};

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

describe("findOrCreateUser", () => {
  it("creates a users row and a matching profile for a new guest", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    await t.run(async (ctx) => {
      const userId = await findOrCreateUser(ctx, guest);

      const profile = await ctx.db
        .query("profile")
        .withIndex("by_user_id", (q) => q.eq("id", userId))
        .unique();

      expect(profile?.firstName).toBe("Matilda");
      expect(profile?.email).toBe(guest.email);
      expect(profile?.phoneNumber).toBe(guest.phone);
    });
  });

  it("is idempotent on email — a returning guest reuses their record", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    await t.run(async (ctx) => {
      const first = await findOrCreateUser(ctx, guest);
      const second = await findOrCreateUser(ctx, guest);

      expect(second).toBe(first);

      const profiles = await ctx.db.query("profile").collect();
      const users = await ctx.db.query("users").collect();

      expect(profiles).toHaveLength(1);
      expect(users).toHaveLength(1);
    });
  });

  it("adopts the existing users row when someone signs up with a guest's email", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    await t.run(async (ctx) => {
      const guestUserId = await findOrCreateUser(ctx, guest);

      // Later sign-up flow resolves to the very same identity, so the guest's
      // attendance history stays attached.
      const signUpUserId = await findOrCreateUser(ctx, {
        ...guest,
        firstName: "Matilda",
        lastName: "Doe",
      });

      expect(signUpUserId).toBe(guestUserId);
    });
  });
});

describe("listTodaysHosts", () => {
  it("lists today's checked-in customers and excludes guest visits", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const { hostId } = await t.run(async (ctx) => {
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

      const guestUserId = await findOrCreateUser(ctx, guest);

      // The host: a normal check-in.
      await ctx.db.insert("daily_register", {
        userId: hostUserId,
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: staffUserId,
      });

      // The guest: carries `visiting`, so must not show up as a possible host.
      await ctx.db.insert("daily_register", {
        userId: guestUserId,
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: staffUserId,
        visiting: { hostUserId },
      });

      return { hostId: hostUserId };
    });

    const hosts = await t
      .withIdentity({ subject: "staff", email: "staff@example.com" })
      .query(api.register.listTodaysHosts, {});

    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toEqual({ userId: hostId, name: "Florence Host" });
  });

  it("returns nothing to an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    expect(await t.query(api.register.listTodaysHosts, {})).toEqual([]);
  });
});
