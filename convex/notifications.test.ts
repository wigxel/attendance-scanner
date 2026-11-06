/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import notificationsSchema from "./components/notifications/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const notificationModules = import.meta.glob(
  "./components/notifications/**/*.ts",
);

// scheduled delivery is not run here: these tests cover what send() queues,
// which is the part callers depend on
const setup = () => {
  const t = convexTest(schema, modules);
  t.registerComponent(
    "notifications",
    notificationsSchema,
    notificationModules,
  );
  return t;
};

const message = {
  recipientKey: "user:1",
  email: "ana@example.com",
  title: "Booking confirmed",
  body: "See you on Friday.",
  url: "/?tab=booking",
};

describe("notifications.send", () => {
  it("queues an in-app, a push and an email row", async () => {
    const t = setup();
    const result = await t.mutation(internal.notifications.send, message);

    expect(result.queued).toHaveLength(3);

    const rows = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    expect(rows.map((row) => row.channel).sort()).toEqual([
      "email",
      "inApp",
      "push",
    ]);

    const email = rows.find((row) => row.channel === "email");
    expect(email?.to).toBe("ana@example.com");
    expect(email?.status).toBe("pending");

    const inApp = rows.find((row) => row.channel === "inApp");
    expect(inApp?.status).toBe("sent");
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

    // in-app has no opt-out, so only the email row is still queued
    expect(result.queued).toHaveLength(2);
    expect(result.skipped).toContain("opted out of push");
  });
});

describe("in-app inbox", () => {
  const withUser = async () => {
    const t = setup().withIdentity({
      subject: "clerk_1",
      email: "ana@example.com",
    });
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "ana@example.com", name: "Ana" }),
    );
    return { t, recipientKey: `user:${userId}` };
  };

  it("shows the signed-in user their notifications, newest first", async () => {
    const { t, recipientKey } = await withUser();

    await t.mutation(internal.notifications.send, {
      ...message,
      recipientKey,
    });
    await t.mutation(internal.notifications.send, {
      ...message,
      recipientKey,
      title: "Payment received",
      dedupeKey: "second",
    });

    const inbox = await t.query(api.notifications.mine, {});

    expect(inbox?.items.map((item) => item.title)).toEqual([
      "Payment received",
      "Booking confirmed",
    ]);
    expect(inbox?.unread).toBe(2);
  });

  it("marks one notification read, then the rest", async () => {
    const { t, recipientKey } = await withUser();
    await t.mutation(internal.notifications.send, { ...message, recipientKey });
    await t.mutation(internal.notifications.send, {
      ...message,
      recipientKey,
      title: "Payment received",
      dedupeKey: "second",
    });

    const before = await t.query(api.notifications.mine, {});
    const first = before?.items[0];
    if (!first) throw new Error("expected a notification");

    expect(
      await t.mutation(api.notifications.markRead, { deliveryId: first._id }),
    ).toBe(true);
    expect((await t.query(api.notifications.mine, {}))?.unread).toBe(1);

    expect(await t.mutation(api.notifications.markAllRead, {})).toBe(1);
    expect((await t.query(api.notifications.mine, {}))?.unread).toBe(0);
  });

  it("will not mark another user's notification read", async () => {
    const { t } = await withUser();
    await t.mutation(internal.notifications.send, message);

    const other = await t.query(internal.notifications.recent, {
      recipientKey: "user:1",
    });
    const row = other.find((item) => item.channel === "inApp");
    if (!row) throw new Error("expected an in-app row");

    expect(
      await t.mutation(api.notifications.markRead, { deliveryId: row._id }),
    ).toBe(false);
  });
});
