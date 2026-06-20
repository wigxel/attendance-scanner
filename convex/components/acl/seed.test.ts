/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
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

    expect(result).toEqual({ success: false, error: "Roles have already been seeded." });
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

  it("seedPermissions is idempotent (second call fails)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.seed.seedPermissions);
    const result = await t.mutation(api.seed.seedPermissions);

    expect(result).toEqual({
      success: false,
      error: "Permissions have already been seeded.",
    });
  });
});
