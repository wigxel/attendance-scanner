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
});
