/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedSystem(t: ReturnType<typeof convexTest>) {
  const {
    data: { roleId },
  } = (await t.mutation(api.seed.seedRoles)) as {
    success: true;
    data: { roleId: string };
  };

  await t.run(async (ctx) => {
    await ctx.db.insert("identities", {
      identity: "admin",
      role: roleId as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return roleId;
}

describe("identities", () => {
  it("listIdentities returns empty for unregistered caller", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.identities.listIdentities, {
      callerId: "unknown",
    });

    expect(result).toEqual([]);
  });

  it("listIdentities returns identities with populated role", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "user-1",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = (await t.query(api.identities.listIdentities, {
      callerId: "admin",
    })) as any[];

    expect(result.length).toBeGreaterThanOrEqual(2);
    const user1 = result.find((i: any) => i.identity === "user-1");
    expect(user1).toBeDefined();
    expect(user1.role).toHaveProperty("name", "admin");
    expect(user1.role).toHaveProperty("privileges");
  });

  it("registerIdentity creates a new identity", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const result = await t.mutation(api.identities.registerIdentity, {
      callerId: "admin",
      identity: "new-user",
      roleId: roleId as any,
    });

    expect(result).toMatchObject({
      success: true,
      data: { action: "created" },
    });
  });

  it("registerIdentity updates existing identity", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const secondRoleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "viewer",
        description: "Can only view",
        privileges: ["user:read"],
      });
    });

    await t.mutation(api.identities.registerIdentity, {
      callerId: "admin",
      identity: "existing-user",
      roleId: roleId as any,
    });

    const result = await t.mutation(api.identities.registerIdentity, {
      callerId: "admin",
      identity: "existing-user",
      roleId: secondRoleId,
    });

    expect(result).toMatchObject({
      success: true,
      data: { action: "updated" },
    });
  });

  it("registerIdentity rejects unregistered caller", async () => {
    const t = convexTest(schema, modules);

    const roleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "test-role",
        description: "Test",
        privileges: [],
      });
    });

    const result = await t.mutation(api.identities.registerIdentity, {
      callerId: "unknown",
      identity: "some-user",
      roleId,
    });

    expect(result.success).toBe(false);
  });

  it("registerIdentity returns error for non-existent role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const deletedRoleId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("roles", {
        name: "temp:role",
        description: "Temp",
        privileges: [],
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.identities.registerIdentity, {
      callerId: "admin",
      identity: "orphan-user",
      roleId: deletedRoleId,
    });

    expect(result).toEqual({ success: false, error: "Role not found." });
  });

  it("updateIdentityRole updates identity role", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const viewerRoleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "viewer",
        description: "Can view",
        privileges: ["user:read"],
      });
    });

    const identityId = await t.run(async (ctx) => {
      return await ctx.db.insert("identities", {
        identity: "switch-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.mutation(api.identities.updateIdentityRole, {
      callerId: "admin",
      identityId,
      roleId: viewerRoleId,
    });

    expect(result).toMatchObject({
      success: true,
      data: { identityId },
    });
  });

  it("updateIdentityRole returns error for non-existent identity", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("identities", {
        identity: "ghost-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.identities.updateIdentityRole, {
      callerId: "admin",
      identityId: deletedId,
      roleId: roleId as any,
    });

    expect(result).toEqual({ success: false, error: "Identity not found." });
  });

  it("updateIdentityRole returns error for non-existent role", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const identityId = await t.run(async (ctx) => {
      return await ctx.db.insert("identities", {
        identity: "user-with-bad-role",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const deletedRoleId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("roles", {
        name: "vanishing",
        description: "Will be deleted",
        privileges: [],
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.identities.updateIdentityRole, {
      callerId: "admin",
      identityId,
      roleId: deletedRoleId,
    });

    expect(result).toEqual({ success: false, error: "Role not found." });
  });

  it("deleteIdentity deletes an identity", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const identityId = await t.run(async (ctx) => {
      return await ctx.db.insert("identities", {
        identity: "to-delete",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.mutation(api.identities.deleteIdentity, {
      callerId: "admin",
      identityId,
    });

    expect(result).toEqual({
      success: true,
      data: { identityId },
    });
  });

  it("deleteIdentity returns error for non-existent identity", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("identities", {
        identity: "already-gone",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.identities.deleteIdentity, {
      callerId: "admin",
      identityId: deletedId,
    });

    expect(result).toEqual({ success: false, error: "Identity not found." });
  });

  it("hasPrivilege returns valid true when role has privilege", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "privileged-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasPrivilege, {
      identity: "privileged-user",
      privilege: "user:assign:role",
    });

    expect(result).toEqual({ valid: true });
  });

  it("hasPrivilege returns valid false when role lacks privilege", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "limited-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasPrivilege, {
      identity: "limited-user",
      privilege: "nonexistent:privilege",
    });

    expect(result).toEqual({ valid: false });
  });

  it("hasPrivilege returns valid false for unknown identity", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.identities.hasPrivilege, {
      identity: "unknown-user",
      privilege: "user:read",
    });

    expect(result).toEqual({ valid: false });
  });

  it("hasAll returns true when identity has all privileges", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "full-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasAll, {
      identity: "full-user",
      privileges: ["user:assign:role", "user:read"],
    });

    expect(result).toEqual({ valid: true });
  });

  it("hasAll returns false when identity lacks any privilege", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "partial-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasAll, {
      identity: "partial-user",
      privileges: ["user:assign:role", "nonexistent:privilege"],
    });

    expect(result).toEqual({ valid: false });
  });

  it("hasAny returns true when identity has any privilege", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "some-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasAny, {
      identity: "some-user",
      privileges: ["user:assign:role", "nonexistent:privilege"],
    });

    expect(result).toEqual({ valid: true });
  });

  it("hasAny returns false when identity has none of the privileges", async () => {
    const t = convexTest(schema, modules);
    const roleId = await seedSystem(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("identities", {
        identity: "nobody-user",
        role: roleId as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await t.query(api.identities.hasAny, {
      identity: "nobody-user",
      privileges: ["nonexistent:a", "nonexistent:b"],
    });

    expect(result).toEqual({ valid: false });
  });
});
