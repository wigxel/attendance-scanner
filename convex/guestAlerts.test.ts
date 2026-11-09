/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import aclSchema from "./components/acl/schema";
import inboxSchema from "./components/inbox/schema";
import notificationsSchema from "./components/notifications/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const notificationModules = import.meta.glob(
  "./components/notifications/**/*.ts",
);
const inboxModules = import.meta.glob("./components/inbox/**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

const NOW = new Date("2026-11-09T12:00:00.000Z");
const DESK_KEY = "user:desk-1";

const setup = () => {
  const t = convexTest(schema, modules);
  t.registerComponent(
    "notifications",
    notificationsSchema,
    notificationModules,
  );
  t.registerComponent("inbox", inboxSchema, inboxModules);
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  return t;
};

// Front-desk staff: the audience that can check guests in.
const seedDesk = async (t: ReturnType<typeof setup>) => {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-1",
    });
    const role = await ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "admin-1",
      name: "front desk",
      description: "Runs the desk",
      privileges: ["attendance:checkin"],
    });
    if (!role.success) throw new Error(role.error);
    const registered = await ctx.runMutation(
      components.wigxel_acl.identities.registerIdentity,
      {
        callerId: "admin-1",
        identity: "desk-1",
        roleId: role.data.roleId,
      },
    );
    if (!registered.success) throw new Error(registered.error);
  });
};

type Access = {
  kind: "free" | "paid";
  planId?: string;
  amount?: number;
  visiting?: { hostUserId: string; guestType?: "visitor" | "student" };
};

const seedGuestVisit = async (
  t: ReturnType<typeof setup>,
  {
    access = {
      kind: "free",
      visiting: { hostUserId: "host-1", guestType: "visitor" },
    },
    minutesAgo = 61,
    checkedoutAt,
  }: { access?: Access; minutesAgo?: number; checkedoutAt?: string } = {},
): Promise<Id<"users">> => {
  return await t.run(async (ctx) => {
    const guestUserId = await ctx.db.insert("users", {
      email: "matilda@example.com",
      name: "Matilda Doe",
    });
    await ctx.db.insert("daily_register", {
      userId: guestUserId,
      timestamp: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
      source: "web",
      device: { browser: "Chrome", name: "Desk", visitorId: "visitor-1" },
      access: access as never,
      admitted_by: "desk-1",
      checkedout_at: checkedoutAt,
    });
    return guestUserId;
  });
};

const alertAfterStay = async (
  t: ReturnType<typeof setup>,
  guestUserId: Id<"users">,
) => {
  await t.action(internal.guestAlerts.checkGuestStay, {
    guestUserId: guestUserId as string,
  });
};

const inboxForDesk = (t: ReturnType<typeof setup>) =>
  t.query(components.inbox.index.list, { recipientKey: DESK_KEY });

const deliveriesForDesk = (t: ReturnType<typeof setup>) =>
  t.query(internal.notifications.recent, { recipientKey: DESK_KEY });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("guestAlerts.checkGuestStay", () => {
  it("alerts the front desk once when a free guest stays past an hour", async () => {
    const t = setup();
    await seedDesk(t);
    const guestUserId = await seedGuestVisit(t);

    await alertAfterStay(t, guestUserId);

    const inbox = await inboxForDesk(t);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe("Guest overstayed: Matilda Doe");
    expect(inbox[0].body).toContain("Matilda Doe checked in at");
    expect(inbox[0].body).toContain("still unpaid");
    expect(inbox[0].url).toBe("/admin");
    expect(inbox[0].severity).toBe("warning");

    const deliveries = await deliveriesForDesk(t);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].channel).toBe("push");
    expect(deliveries[0].title).toBe("Guest overstayed: Matilda Doe");
  });

  it("stays quiet once the guest has paid", async () => {
    const t = setup();
    await seedDesk(t);
    const guestUserId = await seedGuestVisit(t, {
      access: {
        kind: "paid",
        planId: "hourly",
        amount: 500,
        visiting: { hostUserId: "host-1" },
      },
    });

    await alertAfterStay(t, guestUserId);

    expect(await inboxForDesk(t)).toHaveLength(0);
    expect(await deliveriesForDesk(t)).toHaveLength(0);
  });

  it("stays quiet once the guest has checked out", async () => {
    const t = setup();
    await seedDesk(t);
    const guestUserId = await seedGuestVisit(t, {
      checkedoutAt: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
    });

    await alertAfterStay(t, guestUserId);

    expect(await inboxForDesk(t)).toHaveLength(0);
    expect(await deliveriesForDesk(t)).toHaveLength(0);
  });

  it("stays quiet during the free hour", async () => {
    const t = setup();
    await seedDesk(t);
    const guestUserId = await seedGuestVisit(t, { minutesAgo: 59 });

    await alertAfterStay(t, guestUserId);

    expect(await inboxForDesk(t)).toHaveLength(0);
    expect(await deliveriesForDesk(t)).toHaveLength(0);
  });

  it("stays quiet for a regular visitor with no host link", async () => {
    const t = setup();
    await seedDesk(t);
    const guestUserId = await seedGuestVisit(t, { access: { kind: "free" } });

    await alertAfterStay(t, guestUserId);

    expect(await inboxForDesk(t)).toHaveLength(0);
    expect(await deliveriesForDesk(t)).toHaveLength(0);
  });
});
