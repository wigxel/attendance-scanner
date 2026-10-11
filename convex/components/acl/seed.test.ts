/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("seed", () => {
  it("seedRoles creates the admin role", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.seed.seedRoles);

    expect(result).toMatchObject({
      success: true,
      data: { roleId: expect.any(String) },
    });
  });

  it("seedRoles is idempotent (second call fails)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.seed.seedRoles);
    const result = await t.mutation(api.seed.seedRoles);

    expect(result).toEqual({
      success: false,
      error: "Roles have already been seeded.",
    });
  });

  it("seedPermissions creates all permissions", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.seed.seedPermissions);

    expect(result).toMatchObject({
      success: true,
      data: { count: expect.any(Number) },
    });
    expect(result.data?.count).toBeGreaterThan(0);
  });

  it("seedPermissions re-run adds nothing when catalog is current", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.seed.seedPermissions);
    const result = await t.mutation(api.seed.seedPermissions);

    expect(result).toEqual({ success: true, data: { count: 0 } });
  });

  it("seedPermissions backfills only missing entries", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.seed.seedPermissions);
    // Simulate an older database: drop the KPI permissions.
    await t.run(async (ctx) => {
      const all = await ctx.db.query("permissions").collect();
      for (const p of all.filter((e) => e.name.startsWith("kpis:"))) {
        await ctx.db.delete(p._id);
      }
    });

    const result = await t.mutation(api.seed.seedPermissions);

    expect(result).toEqual({ success: true, data: { count: 2 } });
    const names = await t.run(async (ctx) =>
      (await ctx.db.query("permissions").collect()).map((p) => p.name),
    );
    expect(names).toContain("kpis:complete");
    expect(names).toContain("kpis:manage");
    expect(new Set(names).size).toBe(names.length);
  });
});
