/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("requireAuthSafe", () => {
  it("returns no-identities error when system has no identities and no roles", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "anyone",
      name: "test",
      description: "test",
      category: "test",
    });

    expect(result).toEqual({
      success: false,
      error:
        'No ACL identities exist in the system. Run "seedRoles" to create the admin role, then use "registerIdentity" to register yourself.',
    });
  });

  it("returns not-registered error when identities exist but caller is unknown", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const roleId = await ctx.db.insert("roles", {
        name: "admin",
        description: "Admin",
        privileges: ["user:assign:role"],
      });
      await ctx.db.insert("identities", {
        identity: "existing-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "unknown-user",
      name: "test",
      description: "test",
      category: "test",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Your account is not registered as an ACL identity. Contact admin to give create one for you",
    });
  });
});

describe("requirePrivilege", () => {
  it("returns denied error when caller lacks the required privilege", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const roleId = await ctx.db.insert("roles", {
        name: "limited",
        description: "Limited role",
        privileges: ["attendance:read"],
      });
      await ctx.db.insert("identities", {
        identity: "limited-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "limited-user",
      name: "test",
      description: "test",
      category: "test",
    });

    expect(result).toEqual({
      success: false,
      error: 'Access denied. Required privilege: "user:assign:role".',
    });
  });

  it("returns success when caller has the required privilege", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const roleId = await ctx.db.insert("roles", {
        name: "admin",
        description: "Admin",
        privileges: ["user:assign:role"],
      });
      await ctx.db.insert("identities", {
        identity: "admin-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "admin-user",
      name: "test:action",
      description: "Should succeed",
      category: "Test",
    });

    expect(result.success).toBe(true);
  });
});
