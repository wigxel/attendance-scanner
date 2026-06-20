/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedSystem(t: ReturnType<typeof convexTest>) {
  const { data: { roleId } } = (await t.mutation(api.seed.seedRoles)) as {
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

describe("roles", () => {
  it("getRoles returns empty for unregistered caller", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.roles.getRoles, {
      callerId: "unknown",
    });

    expect(result).toEqual([]);
  });

  it("getRoles returns roles for registered caller", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.query(api.roles.getRoles, {
      callerId: "admin",
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("privileges");
  });

  it("createRole creates a new role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.mutation(api.roles.createRole, {
      callerId: "admin",
      name: "moderator",
      description: "Moderator role",
      privileges: ["user:read", "attendance:read"],
    });

    expect(result).toMatchObject({
      success: true,
      data: { roleId: expect.any(String) },
    });
  });

  it("createRole rejects duplicate name", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const result = await t.mutation(api.roles.createRole, {
      callerId: "admin",
      name: "admin",
      description: "Duplicate",
      privileges: [],
    });

    expect(result).toEqual({
      success: false,
      error: "A role with this name already exists.",
    });
  });

  it("createRole rejects unregistered caller", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.roles.createRole, {
      callerId: "unknown",
      name: "moderator",
      description: "Should not create",
      privileges: [],
    });

    expect(result.success).toBe(false);
  });

  it("updateRole updates an existing role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const roleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "editor",
        description: "Editor role",
        privileges: ["user:read"],
      });
    });

    const result = await t.mutation(api.roles.updateRole, {
      callerId: "admin",
      roleId,
      name: "senior-editor",
      description: "Senior editor",
      privileges: ["user:read", "user:update"],
    });

    expect(result).toMatchObject({
      success: true,
      data: { roleId },
    });
  });

  it("updateRole returns error for non-existent role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("roles", {
        name: "temp:role",
        description: "Temporary",
        privileges: [],
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.roles.updateRole, {
      callerId: "admin",
      roleId: deletedId,
      name: "updated",
      description: "Should not exist",
      privileges: [],
    });

    expect(result).toEqual({ success: false, error: "Role not found." });
  });

  it("updateRole rejects duplicate name on different role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const firstRoleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "role:first",
        description: "First",
        privileges: [],
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("roles", {
        name: "role:second",
        description: "Second",
        privileges: [],
      });
    });

    const result = await t.mutation(api.roles.updateRole, {
      callerId: "admin",
      roleId: firstRoleId,
      name: "role:second",
      description: "Updated",
      privileges: [],
    });

    expect(result).toEqual({
      success: false,
      error: "A role with this name already exists.",
    });
  });

  it("deleteRole deletes a role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const roleId = await t.run(async (ctx) => {
      return await ctx.db.insert("roles", {
        name: "temp:delete",
        description: "To delete",
        privileges: [],
      });
    });

    const result = await t.mutation(api.roles.deleteRole, {
      callerId: "admin",
      roleId,
    });

    expect(result).toEqual({
      success: true,
      data: { roleId },
    });
  });

  it("deleteRole prevents deleting a role assigned to an identity", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const roleId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("roles", {
        name: "protected",
        description: "Protected role",
        privileges: [],
      });
      await ctx.db.insert("identities", {
        identity: "some-user",
        role: id as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return id;
    });

    const result = await t.mutation(api.roles.deleteRole, {
      callerId: "admin",
      roleId,
    });

    expect(result).toEqual({
      success: false,
      error:
        "Cannot delete a role that is assigned to one or more identities.",
    });
  });

  it("deleteRole returns error for non-existent role", async () => {
    const t = convexTest(schema, modules);
    await seedSystem(t);

    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("roles", {
        name: "temp:delete2",
        description: "Temp",
        privileges: [],
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.mutation(api.roles.deleteRole, {
      callerId: "admin",
      roleId: deletedId,
    });

    expect(result).toEqual({ success: false, error: "Role not found." });
  });
});
