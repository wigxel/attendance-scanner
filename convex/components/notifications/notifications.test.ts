/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const notification = {
  recipientKey: "user:1",
  title: "Booking confirmed",
  body: "See you on Friday.",
};

describe("notifications queue", () => {
  it("stores an in-app copy and delivers the transported channels", async () => {
    const t = convexTest(schema, modules);
    const { queued } = await t.mutation(api.index.enqueue, {
      ...notification,
      to: "ana@example.com",
    });
    expect(queued).toHaveLength(3);

    // the in-app row is already delivered, so the drain only claims the rest
    const claimed = await t.mutation(api.index.claim, { now: Date.now() });
    expect(claimed.map((row) => row.channel).sort()).toEqual(["email", "push"]);
    expect(claimed[0].status).toBe("sending");
    expect(claimed[0].attempts).toBe(1);

    await t.mutation(api.index.markSent, { deliveryId: claimed[0]._id });
    const sent = await t.query(api.index.listDeliveries, { status: "sent" });
    expect(sent).toHaveLength(2);
    expect(sent[0].sentAt).toBeTypeOf("number");
  });

  it("skips channels the recipient opted out of", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.index.setPreferences, {
      recipientKey: notification.recipientKey,
      email: false,
    });

    const { queued, skipped } = await t.mutation(api.index.enqueue, {
      ...notification,
      to: "ana@example.com",
    });

    // in-app has no opt-out
    expect(queued).toHaveLength(2);
    expect(skipped).toContain("opted out of email");
  });

  it("skips email when no address is known", async () => {
    const t = convexTest(schema, modules);
    const { queued, skipped } = await t.mutation(api.index.enqueue, {
      ...notification,
      channels: ["email"],
    });

    expect(queued).toHaveLength(0);
    expect(skipped).toContain("no email address");
  });

  it("does not queue the same dedupe key twice", async () => {
    const t = convexTest(schema, modules);
    const args = { ...notification, to: "ana@example.com", dedupeKey: "once" };

    await t.mutation(api.index.enqueue, args);
    const second = await t.mutation(api.index.enqueue, args);

    expect(second.queued).toHaveLength(0);
    expect(second.skipped).toContain("duplicate");
  });

  it("retries a failure with backoff until attempts run out", async () => {
    const t = convexTest(schema, modules);
    const { queued } = await t.mutation(api.index.enqueue, {
      ...notification,
      channels: ["email"],
      to: "ana@example.com",
    });
    const deliveryId = queued[0];

    // attempt 1 -> retry pending, no longer due immediately
    await t.mutation(api.index.claim, { now: Date.now() });
    await t.mutation(api.index.markFailed, {
      deliveryId,
      error: "zeptomail 503: busy",
    });
    let [row] = await t.query(api.index.listDeliveries, {
      recipientKey: "user:1",
    });
    expect(row.status).toBe("pending");
    expect(row.nextAttemptAt).toBeGreaterThan(Date.now());

    // attempts 2 and 3 exhaust the retry budget
    for (let attempt = 2; attempt <= 3; attempt++) {
      await t.mutation(api.index.claim, { now: Date.now() + 2 * 60 * 60_000 });
      await t.mutation(api.index.markFailed, {
        deliveryId,
        error: "zeptomail 503: busy",
      });
    }
    [row] = await t.query(api.index.listDeliveries, { recipientKey: "user:1" });
    expect(row.status).toBe("failed");
    expect(row.error).toBe("zeptomail 503: busy");
  });

  it("fails immediately on a non-retryable error", async () => {
    const t = convexTest(schema, modules);
    const { queued } = await t.mutation(api.index.enqueue, {
      ...notification,
      channels: ["email"],
      to: "ana@example.com",
    });
    await t.mutation(api.index.claim, { now: Date.now() });
    await t.mutation(api.index.markFailed, {
      deliveryId: queued[0],
      error: "ZEPTOMAIL_TOKEN is not set",
      retryable: false,
    });

    const [row] = await t.query(api.index.listDeliveries, {});
    expect(row.status).toBe("failed");
  });
});
