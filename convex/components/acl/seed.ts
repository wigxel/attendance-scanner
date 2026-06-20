import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("roles").first();

    if (existing) {
      return { success: false, error: "Roles have already been seeded." };
    }

    const roleId = await ctx.db.insert("roles", {
      name: "admin",
      description: "Full system access",
      privileges: [
        "user:assign:role",
        "user:create",
        "user:read",
        "user:update",
        "user:delete",
        "attendance:read",
        "attendance:checkin",
        "attendance:checkout",
        "settings:read",
        "settings:update",
        "reports:read",
        "audit:read",
        "notification:read",
        "notification:send",
      ],
    });

    return { success: true, data: { roleId } };
  },
});

export const seedPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("permissions").first();

    if (existing) {
      return { success: false, error: "Permissions have already been seeded." };
    }

    const permissions = [
      {
        name: "user:create",
        description: "Create new user accounts",
        category: "Users",
      },
      {
        name: "user:read",
        description: "View user accounts",
        category: "Users",
      },
      {
        name: "user:update",
        description: "Edit user accounts",
        category: "Users",
      },
      {
        name: "user:delete",
        description: "Delete user accounts",
        category: "Users",
      },
      {
        name: "user:assign:role",
        description: "Assign roles to users",
        category: "Users",
      },
      {
        name: "attendance:read",
        description: "View attendance records",
        category: "Attendance",
      },
      {
        name: "attendance:checkin",
        description: "Check in members",
        category: "Attendance",
      },
      {
        name: "attendance:checkout",
        description: "Check out members",
        category: "Attendance",
      },
      {
        name: "settings:read",
        description: "View system settings",
        category: "Settings",
      },
      {
        name: "settings:update",
        description: "Update system settings",
        category: "Settings",
      },
      {
        name: "reports:read",
        description: "View reports",
        category: "Reports",
      },
      { name: "audit:read", description: "View audit logs", category: "Audit" },
      {
        name: "notification:read",
        description: "View notifications",
        category: "Notifications",
      },
      {
        name: "notification:send",
        description: "Send notifications",
        category: "Notifications",
      },
    ];

    for (const perm of permissions) {
      await ctx.db.insert("permissions", perm);
    }

    return { success: true, data: { count: permissions.length } };
  },
});
