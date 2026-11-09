/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import inboxSchema from "./components/inbox/schema";
import notificationsSchema from "./components/notifications/schema";
import { isCreditExhausted } from "./notificationSender";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const notificationModules = import.meta.glob(
  "./components/notifications/**/*.ts",
);
const inboxModules = import.meta.glob("./components/inbox/**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

// scheduled delivery is not run here: these tests cover what send() queues,
// which is the part callers depend on
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

const seedAcl = async (t: ReturnType<typeof setup>) => {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-1",
    });
  });
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.ZEPTOMAIL_TOKEN;
  delete process.env.ZEPTOMAIL_FROM_ADDRESS;
});

const message = {
  recipientKey: "user:1",
  email: "ana@example.com",
  title: "Booking confirmed",
  body: "See you on Friday.",
  url: "/?tab=booking",
};

describe("notifications.sendTest", () => {
  it("drops a test row into the caller's inbox", async () => {
    const t = setup().withIdentity({
      subject: "clerk_1",
      email: "ana@example.com",
    });
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "ana@example.com", name: "Ana" }),
    );

    await t.mutation(api.notifications.sendTest, {});

    const inbox = await t.query(components.inbox.index.list, {
      recipientKey: `user:${userId}`,
    });
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe("Test notification");
  });
});

describe("notifications.alertRecipientKeys", () => {
  it("returns inbox keys for identities allowed to change settings", async () => {
    const t = setup();
    await seedAcl(t);

    const created = await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.roles.createRole, {
        callerId: "admin-1",
        name: "front desk",
        description: "Runs the desk",
        privileges: ["attendance:checkin"],
      }),
    );
    if (!created.success) throw new Error(created.error);

    await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
        callerId: "admin-1",
        identity: "desk-1",
        roleId: created.data.roleId,
      }),
    );

    expect(
      await t.query(internal.notifications.alertRecipientKeys, {}),
    ).toEqual(["user:admin-1"]);
  });
});

describe("isCreditExhausted", () => {
  it("matches ZeptoMail's out-of-credit 429", () => {
    expect(
      isCreditExhausted(
        429,
        '{"error":{"code":"TM_5001","message":"Credit exhausted"}}',
      ),
    ).toBe(true);
    expect(isCreditExhausted(429, '{"error":{"code":"LE_102"}}')).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isCreditExhausted(429, '{"error":{"code":"LE_999"}}')).toBe(false);
    expect(isCreditExhausted(500, "Credit exhausted")).toBe(false);
  });
});

describe("notificationSender.deliver", () => {
  it("raises one inbox alert per admin when ZeptoMail is out of credit", async () => {
    const t = setup();
    await seedAcl(t);
    process.env.ZEPTOMAIL_TOKEN = "token";
    process.env.ZEPTOMAIL_FROM_ADDRESS = "no-reply@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            '{"error":{"code":"TM_5001","message":"Credit exhausted"}}',
            { status: 429 },
          ),
      ),
    );

    await t.mutation(internal.notifications.send, {
      recipientKey: "user:somebody",
      email: "ana@example.com",
      channels: ["email"],
      title: "Booking confirmed",
      body: "See you on Friday.",
    });

    await t.action(internal.notificationSender.deliver, {});
    // the drain retries the failed row every minute; the alert must not repeat
    await t.action(internal.notificationSender.deliver, {});

    const inbox = await t.query(components.inbox.index.list, {
      recipientKey: "user:admin-1",
    });
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toContain("out of credits");
    expect(inbox[0].severity).toBe("critical");

    // 429 is retryable, so the row goes back to pending with the reason kept
    const deliveries = await t.query(internal.notifications.recent, {
      recipientKey: "user:somebody",
    });
    expect(deliveries[0].status).toBe("pending");
    expect(deliveries[0].error).toContain("TM_5001");
  });
});

describe("notifications.send", () => {
  it("queues a push and an email row", async () => {
    const t = setup();
    const result = await t.mutation(internal.notifications.send, message);

    expect(result.queued).toHaveLength(2);

    const rows = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    expect(rows.map((row) => row.channel).sort()).toEqual(["email", "push"]);

    const email = rows.find((row) => row.channel === "email");
    expect(email?.to).toBe("ana@example.com");
    expect(email?.status).toBe("pending");
  });

  it("honours a preference the signed-in user turned off", async () => {
    const t = setup().withIdentity({
      subject: "clerk_1",
      email: "ana@example.com",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "ana@example.com",
        name: "Ana",
      });
    });
    await t.mutation(api.notifications.setPreferences, { push: false });

    const users = await t.run(async (ctx) => ctx.db.query("users").take(1));
    const result = await t.mutation(internal.notifications.send, {
      ...message,
      recipientKey: `user:${users[0]._id}`,
    });

    expect(result.queued).toHaveLength(1);
    expect(result.skipped).toContain("opted out of push");
  });

  it("stores an in-app row alongside the transport delivery", async () => {
    const t = setup();
    await t.mutation(internal.notifications.send, {
      ...message,
      channels: ["inapp", "email"],
    });

    const inbox = await t.query(components.inbox.index.list, {
      recipientKey: "user:1",
    });
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe(message.title);

    const deliveries = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].channel).toBe("email");
  });

  it("forwards severity to the inbox row only", async () => {
    const t = setup();
    await t.mutation(internal.notifications.send, {
      ...message,
      channels: ["inapp", "email"],
      severity: "warning",
    });

    const inbox = await t.query(components.inbox.index.list, {
      recipientKey: "user:1",
    });
    expect(inbox[0].severity).toBe("warning");

    const deliveries = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    expect(deliveries[0]).not.toHaveProperty("severity");
  });

  it("keeps a broadcast out of the inbox", async () => {
    const t = setup();
    await t.mutation(internal.notifications.send, {
      ...message,
      recipientKey: "broadcast:environment-alerts",
      channels: ["inapp"],
    });

    expect(
      await t.query(components.inbox.index.list, {
        recipientKey: "broadcast:environment-alerts",
      }),
    ).toHaveLength(0);
  });

  it("purges old deliveries but leaves inbox rows alone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
    const t = setup();

    await t.mutation(internal.notifications.send, {
      ...message,
      channels: ["inapp", "email"],
    });

    const [delivery] = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    await t.mutation(components.notifications.index.claim, {
      now: Date.now(),
    });
    await t.mutation(components.notifications.index.markSent, {
      deliveryId: delivery._id,
    });

    vi.setSystemTime(new Date("2020-02-15T00:00:00.000Z"));
    await t.mutation(components.notifications.index.purgeOld, {});

    expect(
      await t.query(internal.notifications.recent, {
        recipientKey: "user:1",
      }),
    ).toHaveLength(0);
    expect(
      await t.query(components.inbox.index.list, {
        recipientKey: "user:1",
      }),
    ).toHaveLength(1);
  });
});
