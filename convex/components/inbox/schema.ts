import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// App-agnostic in-app inbox: the component only knows a recipient key, never
// the app's users table or delivery transports. Nothing here is ever purged.
const notifications = defineTable({
  recipientKey: v.string(),
  title: v.string(),
  body: v.string(),
  url: v.optional(v.string()),
  dedupeKey: v.optional(v.string()),
  // absent on old rows means "info"
  severity: v.optional(
    v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
  ),
  readAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_recipient_key_and_created_at", ["recipientKey", "createdAt"])
  .index("by_dedupe_key", ["dedupeKey"]);

export default defineSchema({ notifications });
