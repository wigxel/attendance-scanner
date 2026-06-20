import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  roles: defineTable({
    name: v.string(),
    description: v.string(),
    privileges: v.array(v.string()),
  }).index("by_name", ["name"]),

  identities: defineTable({
    identity: v.string(),
    role: v.id("roles"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_identity", ["identity"])
    .index("by_role", ["role"]),

  permissions: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),
});

export default schema;
