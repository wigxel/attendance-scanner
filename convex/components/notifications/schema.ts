import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const channel = v.union(
  v.literal("inApp"),
  v.literal("push"),
  v.literal("email"),
);

const status = v.union(
  v.literal("pending"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
);

// one row per (notification, channel). The row is the failure log: status,
// attempts and the last error live here, so a failed send is inspectable
// without a separate logs table.
const deliveries = defineTable({
  recipientKey: v.string(),
  channel,
  to: v.optional(v.string()),
  title: v.string(),
  body: v.string(),
  url: v.optional(v.string()),
  status,
  attempts: v.number(),
  error: v.optional(v.string()),
  // due time for pending rows; lease expiry for rows being sent
  nextAttemptAt: v.number(),
  dedupeKey: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  // in-app rows only: when the user opened it
  readAt: v.optional(v.number()),
})
  .index("by_status_and_next_attempt", ["status", "nextAttemptAt"])
  .index("by_dedupe_key", ["dedupeKey"])
  .index("by_recipient_key", ["recipientKey"]);

// absent row means opted in on every channel
const preferences = defineTable({
  recipientKey: v.string(),
  push: v.boolean(),
  email: v.boolean(),
  updatedAt: v.number(),
}).index("by_recipient_key", ["recipientKey"]);

export default defineSchema({ deliveries, preferences });
