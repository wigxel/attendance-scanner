/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("push subscriptions", () => {
  it("round-trips subscribe -> upsert -> unsubscribe", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.push.subscribe, {
      endpoint: "https://push.example/1",
      p256dh: "key1",
      auth: "auth1",
    });

    const subscriptions = await t.query(api.push.listSubscriptions, {});
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].p256dh).toBe("key1");

    // re-subscribe on the same browser endpoint replaces keys, no new row
    await t.mutation(api.push.subscribe, {
      endpoint: "https://push.example/1",
      p256dh: "key2",
      auth: "auth2",
    });
    const resubscribed = await t.query(api.push.listSubscriptions, {});
    expect(resubscribed).toHaveLength(1);
    expect(resubscribed[0].p256dh).toBe("key2");

    await t.mutation(api.push.unsubscribe, {
      endpoint: "https://push.example/1",
    });
    expect(await t.query(api.push.listSubscriptions, {})).toHaveLength(0);
  });
});
