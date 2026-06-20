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
  await t.mutation(api.seed.seedPermissions);

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

describe("permissions", () => {
  it("listPermissions returns empty for unregistered caller", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.permissions.listPermissions, {
      callerId: "unknown",
    });

    expect(result).toEqual([]);
  });

  it("listPermissions returns all permissions after seeding", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.query(api.permissions.listPermissions, {
      callerId: "admin",
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("description");
    expect(result[0]).toHaveProperty("category");
  });

  it("listPermissionsByCategory groups permissions", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.query(api.permissions.listPermissionsByCategory, {
      callerId: "admin",
    });

    expect(result).toHaveProperty("Users");
    expect(result).toHaveProperty("Attendance");
    expect(Array.isArray(result.Users)).toBe(true);
  });

  it("createPermission creates a new permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "admin",
      name: "test:action",
      description: "A test permission",
      category: "Test",
    });

    expect(result).toMatchObject({
      success: true,
      data: { permissionId: expect.any(String) },
    });
  });

  it("createPermission rejects duplicate name", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    await t.mutation(api.permissions.createPermission, {
      callerId: "admin",
      name: "test:action",
      description: "First",
      category: "Test",
    });

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "admin",
      name: "test:action",
      description: "Duplicate",
      category: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "A permission with this name already exists.",
    });
  });

  it("updatePermission updates an existing permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const permId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("permissions", {
        name: "test:action",
        description: "Original",
        category: "Test",
      });
      return id;
    });

    const result = await t.mutation(api.permissions.updatePermission, {
      callerId: "admin",
      permissionId: permId,
      name: "test:updated",
      description: "Updated",
      category: "Updated",
    });

    expect(result).toMatchObject({
      success: true,
      data: { permissionId: permId },
    });

    const perms = (await t.query(api.permissions.listPermissions, {
      callerId: "admin",
    })) as any[];
    const updated = perms.find((p) => p._id === permId);
    expect(updated?.name).toBe("test:updated");
  });

  it("updatePermission returns error for non-existent permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("permissions", {
        name: "temp:delete",
        description: "Temp",
        category: "Temp",
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.permissions.updatePermission, {
      callerId: "admin",
      permissionId: deletedId,
      name: "test:action",
      description: "Desc",
      category: "Cat",
    });

    expect(result).toEqual({ success: false, error: "Permission not found." });
  });

  it("updatePermission rejects duplicate name on different permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const permOneId = await t.run(async (ctx) => {
      return await ctx.db.insert("permissions", {
        name: "perm:one",
        description: "First",
        category: "Test",
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("permissions", {
        name: "perm:two",
        description: "Second",
        category: "Test",
      });
    });

    const result = await t.mutation(api.permissions.updatePermission, {
      callerId: "admin",
      permissionId: permOneId,
      name: "perm:two",
      description: "Updated",
      category: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "A permission with this name already exists.",
    });
  });

  it("deletePermission deletes a permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const permId = await t.run(async (ctx) => {
      return await ctx.db.insert("permissions", {
        name: "test:delete",
        description: "To delete",
        category: "Test",
      });
    });

    const result = await t.mutation(api.permissions.deletePermission, {
      callerId: "admin",
      permissionId: permId,
    });

    expect(result).toEqual({
      success: true,
      data: { permissionId: permId },
    });
  });

  it("deletePermission returns error for non-existent permission", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("permissions", {
        name: "temp:delete2",
        description: "Temp",
        category: "Temp",
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.permissions.deletePermission, {
      callerId: "admin",
      permissionId: deletedId,
    });

    expect(result).toEqual({ success: false, error: "Permission not found." });
  });

  it("createPermission rejects unregistered caller", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.permissions.createPermission, {
      callerId: "unknown",
      name: "test:action",
      description: "Should not create",
      category: "Test",
    });

    expect(result.success).toBe(false);
  });
});
