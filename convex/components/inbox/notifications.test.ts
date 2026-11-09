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

const setup = () => convexTest(schema, modules);

describe("inbox component", () => {
  it("enqueues a row that appears in the inbox", async () => {
    const t = setup();
    const { id, duplicate } = await t.mutation(api.index.enqueue, notification);

    expect(duplicate).toBe(false);

    const rows = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe(id);
    expect(
      await t.query(api.index.unreadCount, {
        recipientKey: notification.recipientKey,
      }),
    ).toBe(1);
  });

  it("drops the unread count after markRead", async () => {
    const t = setup();
    const { id } = await t.mutation(api.index.enqueue, notification);

    await t.mutation(api.index.markRead, {
      recipientKey: notification.recipientKey,
      id,
    });

    expect(
      await t.query(api.index.unreadCount, {
        recipientKey: notification.recipientKey,
      }),
    ).toBe(0);
  });

  it("marks every unread row read", async () => {
    const t = setup();
    await t.mutation(api.index.enqueue, notification);
    await t.mutation(api.index.enqueue, { ...notification, title: "Second" });

    await t.mutation(api.index.markAllRead, {
      recipientKey: notification.recipientKey,
    });

    expect(
      await t.query(api.index.unreadCount, {
        recipientKey: notification.recipientKey,
      }),
    ).toBe(0);
  });

  it("hides an archived row and restores it", async () => {
    const t = setup();
    const { id } = await t.mutation(api.index.enqueue, notification);

    await t.mutation(api.index.archive, {
      recipientKey: notification.recipientKey,
      id,
    });

    const open = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
    });
    expect(open).toHaveLength(0);

    const archived = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
      archived: true,
    });
    expect(archived).toHaveLength(1);

    await t.mutation(api.index.unarchive, {
      recipientKey: notification.recipientKey,
      id,
    });

    const restored = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
    });
    expect(restored).toHaveLength(1);
  });

  it("ignores reads and archives for another recipient", async () => {
    const t = setup();
    const { id } = await t.mutation(api.index.enqueue, notification);
    const foreign = { recipientKey: "user:2", id };

    await t.mutation(api.index.markRead, foreign);
    await t.mutation(api.index.archive, foreign);

    const [row] = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
    });
    expect(row.readAt).toBeUndefined();
    expect(row.archivedAt).toBeUndefined();
  });

  it("round-trips severity and defaults an omitted one to info", async () => {
    const t = setup();
    await t.mutation(api.index.enqueue, {
      ...notification,
      severity: "critical",
    });
    await t.mutation(api.index.enqueue, { ...notification, title: "Second" });

    const rows = await t.query(api.index.list, {
      recipientKey: notification.recipientKey,
    });

    expect(
      Object.fromEntries(rows.map((row) => [row.title, row.severity])),
    ).toEqual({ "Booking confirmed": "critical", Second: "info" });
  });

  it("returns the existing row for a duplicate dedupe key", async () => {
    const t = setup();
    const args = { ...notification, dedupeKey: "booking-confirmed" };

    const first = await t.mutation(api.index.enqueue, args);
    const second = await t.mutation(api.index.enqueue, args);

    expect(second.duplicate).toBe(true);
    expect(second.id).toBe(first.id);
    expect(
      await t.query(api.index.list, {
        recipientKey: notification.recipientKey,
      }),
    ).toHaveLength(1);
  });
});
