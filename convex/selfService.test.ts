/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("submitRating", () => {
  it("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.selfService.submitRating, {
        score: 5,
        presets: ["great"],
      }),
    ).rejects.toThrow();
  });

  it("throws when score is out of range", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-1" });

    await expect(
      authed.runMutation(api.selfService.submitRating, {
        score: 0,
        presets: [],
      }),
    ).rejects.toThrow("Score must be between 1 and 5");

    await expect(
      authed.runMutation(api.selfService.submitRating, {
        score: 6,
        presets: [],
      }),
    ).rejects.toThrow("Score must be between 1 and 5");
  });

  it("inserts a rating with valid data", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-1" });

    await authed.runMutation(api.selfService.submitRating, {
      score: 4,
      presets: ["good", "clean"],
      comment: "Nice place",
    });

    const ratings = await t.run(async (ctx) => {
      return await ctx.db.query("ratings").collect();
    });

    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toMatchObject(
      expect.objectContaining({
        comment: "Nice place",
        presets: ["good", "clean"],
        score: 4,
        userId: "user-1",
      }),
    );
  });

  it("inserts a rating without optional comment", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-2" });

    await authed.runMutation(api.selfService.submitRating, {
      score: 3,
      presets: [],
    });

    const ratings = await t.run(async (ctx) => {
      return await ctx.db.query("ratings").collect();
    });

    expect(ratings).toHaveLength(1);
    expect(ratings[0].comment).toBeUndefined();
  });
});

describe("getTodaysRating", () => {
  it("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.selfService.getTodaysRating, {});
    expect(result).toBeNull();
  });

  it("returns null when no rating exists today", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-1" });
    const result = await authed.runQuery(api.selfService.getTodaysRating, {});
    expect(result).toBeNull();
  });

  it("returns today's rating", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("ratings", {
        userId: "user-1",
        score: 5,
        presets: ["excellent"],
        createdAt: new Date().toISOString(),
      });
    });

    const authed = t.withIdentity({ profile_id: "user-1" });
    const result = await authed.runQuery(api.selfService.getTodaysRating, {});
    expect(result).not.toBeNull();
    expect(result!.score).toBe(5);
  });
});

describe("getTodaysRegistration", () => {
  it("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.selfService.getTodaysRegistration, {});
    expect(result).toBeNull();
  });

  it("returns null when no check-in today", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-1" });
    const result = await authed.runQuery(
      api.selfService.getTodaysRegistration,
      {},
    );
    expect(result).toBeNull();
  });

  it("returns today's registration", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v1", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const authed = t.withIdentity({ profile_id: "user-1" });
    const result = await authed.runQuery(
      api.selfService.getTodaysRegistration,
      {},
    );
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
  });
});

describe("selfCheckOut", () => {
  it("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.selfService.selfCheckOut, {}),
    ).rejects.toThrow();
  });

  it("throws when no check-in record today", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-1" });
    await expect(
      authed.runMutation(api.selfService.selfCheckOut, {}),
    ).rejects.toThrow("No check-in record found for today.");
  });

  it("throws when already checked out", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v1", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        checkedout_at: new Date().toISOString(),
        source: "web",
      });
    });

    const authed = t.withIdentity({ profile_id: "user-1" });
    await expect(
      authed.runMutation(api.selfService.selfCheckOut, {}),
    ).rejects.toThrow("Already checked out for today.");
  });

  it("sets checkedout_at on valid check-out", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v1", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const authed = t.withIdentity({ profile_id: "user-1" });
    await authed.runMutation(api.selfService.selfCheckOut, {});

    const entry = await t.run(async (ctx) => {
      const all = await ctx.db.query("daily_register").collect();
      return all[0];
    });

    expect(entry.checkedout_at).toBeDefined();
    expect(typeof entry.checkedout_at).toBe("string");
  });
});
