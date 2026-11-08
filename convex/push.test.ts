/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const subscription = {
  endpoint: "https://push.example/1",
  p256dh: "key1",
  auth: "auth1",
};

describe("push subscriptions", () => {
  it("round-trips subscribe -> upsert -> unsubscribe", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.push.subscribe, subscription);

    const subscriptions = await t.query(api.push.listSubscriptions, {});
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].p256dh).toBe("key1");

    // re-subscribe on the same browser endpoint replaces keys, no new row
    await t.mutation(api.push.subscribe, {
      ...subscription,
      p256dh: "key2",
      auth: "auth2",
    });
    const resubscribed = await t.query(api.push.listSubscriptions, {});
    expect(resubscribed).toHaveLength(1);
    expect(resubscribed[0].p256dh).toBe("key2");

    await t.mutation(api.push.unsubscribe, {
      endpoint: subscription.endpoint,
    });
    expect(await t.query(api.push.listSubscriptions, {})).toHaveLength(0);
  });

  it("stamps the signed-in user on the subscription", async () => {
    const t = convexTest(schema, modules).withIdentity({
      subject: "clerk_1",
      email: "ana@example.com",
    });
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "ana@example.com", name: "Ana" }),
    );

    await t.mutation(api.push.subscribe, subscription);

    const [row] = await t.query(api.push.listSubscriptions, {});
    expect(row.recipientKey).toBe(`user:${userId}`);
  });

  it("routes a targeted delivery to that user's devices only", async () => {
    const t = convexTest(schema, modules);

    // one keyed row per user, plus a legacy row stored before keys existed
    await t.run(async (ctx) => {
      await ctx.db.insert("pushSubscriptions", {
        ...subscription,
        endpoint: "https://push.example/ana",
        recipientKey: "user:ana",
        createdAt: Date.now(),
      });
      await ctx.db.insert("pushSubscriptions", {
        ...subscription,
        endpoint: "https://push.example/bode",
        recipientKey: "user:bode",
        createdAt: Date.now(),
      });
      await ctx.db.insert("pushSubscriptions", {
        ...subscription,
        endpoint: "https://push.example/legacy",
        createdAt: Date.now(),
      });
    });

    const ana = await t.query(api.push.listSubscriptions, {
      recipientKey: "user:ana",
    });
    expect(ana.map((row) => row.endpoint)).toEqual([
      "https://push.example/ana",
    ]);

    // broadcasts (no recipientKey) still reach every device
    expect(await t.query(api.push.listSubscriptions, {})).toHaveLength(3);
  });
});
