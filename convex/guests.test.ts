/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import { findOrCreateUser } from "./myFunctions";
import {
  insertGuestVisit,
  requireHostRegisteredToday,
} from "./register_common";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

const guest = {
  email: "matilda@example.com",
  firstName: "Matilda",
  lastName: "Doe",
  phone: "+2348000000000",
};

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
    const role = await ctx.runMutation(
      components.wigxel_acl.roles.createRole,
      {
        callerId: "test-admin",
        name: "role-staff",
        description: "",
        privileges: ["attendance:checkin"],
      },
    );
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

    const { hostId, staffId } = await t.run(async (ctx) => {
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

      // The guest: carries `access.visiting`, so must not show up as a
      // possible host.
      await ctx.db.insert("daily_register", {
        userId: guestUserId,
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free", visiting: { hostUserId } },
        admitted_by: staffUserId,
      });

      return { hostId: hostUserId, staffId: staffUserId };
    });

    await grantStaffCheckin(t, staffId);

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

async function seedHostAndGuest(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
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
      admitted_by: "staff-1",
    });

    const guestUserId = await ctx.db.insert("users", {
      email: guest.email,
      isAnonymous: false,
      name: `${guest.firstName} ${guest.lastName}`,
    });

    return { hostUserId, guestUserId };
  });
}

describe("requireHostRegisteredToday", () => {
  it("throws when the host is not checked in today", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const hostUserId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "florence@example.com",
        isAnonymous: false,
        name: "Florence Host",
      });
      await ctx.db.insert("profile", {
        id: userId,
        email: "florence@example.com",
        firstName: "Florence",
        lastName: "Host",
        occupation: "None",
      });
      return userId;
    });

    await expect(
      t.run((ctx) => requireHostRegisteredToday(ctx, hostUserId)),
    ).rejects.toThrow("is not checked in today");
  });

  it("throws when the host has no profile", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const hostUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "florence@example.com",
        isAnonymous: false,
        name: "Florence Host",
      }),
    );

    await expect(
      t.run((ctx) => requireHostRegisteredToday(ctx, hostUserId)),
    ).rejects.toThrow("Host customer not found.");
  });
});

describe("insertGuestVisit", () => {
  it("inserts a register row linked to the host", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const { hostUserId, guestUserId } = await seedHostAndGuest(t);

    await t.run((ctx) =>
      insertGuestVisit(ctx, {
        guestUserId,
        hostUserId,
        admittedBy: "staff-1",
      }),
    );

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("daily_register")
        .filter((q) => q.eq(q.field("userId"), guestUserId))
        .unique(),
    );

    expect(row?.access.visiting).toEqual({ hostUserId });
    expect(row?.admitted_by).toBe("staff-1");
  });

  it("rejects a guest who is their own host", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const { hostUserId } = await seedHostAndGuest(t);

    await expect(
      t.run((ctx) =>
        insertGuestVisit(ctx, {
          guestUserId: hostUserId,
          hostUserId,
          admittedBy: "staff-1",
        }),
      ),
    ).rejects.toThrow("A customer cannot be their own guest.");
  });

  it("rejects a guest already registered today", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const { hostUserId, guestUserId } = await seedHostAndGuest(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: guestUserId,
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    await expect(
      t.run((ctx) =>
        insertGuestVisit(ctx, {
          guestUserId,
          hostUserId,
          admittedBy: "staff-1",
        }),
      ),
    ).rejects.toThrow("This person is already registered for today.");
  });
});
