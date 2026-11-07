/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import inboxSchema from "./components/inbox/schema";
import notificationsSchema from "./components/notifications/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const notificationModules = import.meta.glob(
  "./components/notifications/**/*.ts",
);
const inboxModules = import.meta.glob("./components/inbox/**/*.ts");

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
  return t;
};

afterEach(() => {
  vi.useRealTimers();
});

const message = {
  recipientKey: "user:1",
  email: "ana@example.com",
  title: "Booking confirmed",
  body: "See you on Friday.",
  url: "/?tab=booking",
};

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
