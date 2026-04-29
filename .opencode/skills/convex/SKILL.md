---
name: convex
description: Convex backend-as-a-service development rules and patterns
---

# Convex Skill

## Project Structure
- Backend functions: `convex/`
- Schema: `convex/schema.ts`
- Generated types: `convex/_generated/`

## Function Syntax
Use the new function syntax:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { arg: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return args.arg;
  },
});
```

## Function Types
- **query**: Public read operations - use for fetching data
- **mutation**: Public write operations - use for creating/updating/deleting
- **action**: Side effects, external APIs - no direct database access
- **internalQuery/internalMutation/internalAction**: Private functions, callable only from other Convex functions

## Database
```typescript
// Insert
const id = await ctx.db.insert("table", { field: "value" });

// Get
const doc = await ctx.db.get(id);

// Query with index
const docs = await ctx.db.query("table").withIndex("by_field").collect();

// Update
await ctx.db.patch(id, { field: "new_value" });

// Delete
await ctx.db.delete(id);
```

## Pagination
```typescript
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query("messages").paginate(args.paginationOpts);
  },
});
```

## Validators
- `v.string()`, `v.number()`, `v.boolean()`
- `v.id("table")` - Reference to document
- `v.array(T)` - Array of type T
- `v.object({...})` - Object type
- `v.union(...)` - Discriminated union
- `v.optional(T)` - Optional type
- `v.int64()` - 64-bit integer (not bigint)
- `v.record(k, v)` - Key-value record

## Schema
```typescript
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  users: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),
});
```

## File Organization
- Group related functions in the same file
- Use `api.filename.functionName` to call public functions
- Use `internal.filename.functionName` to call internal functions

## HTTP Actions
```typescript
import { httpRouter, httpAction } from "convex/server";

const http = httpRouter();
http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response("ok");
  }),
});

export default http;
```

## Scheduled Jobs
```typescript
import { cronJobs } from "convex/server";

const crons = cronJobs();
crons.interval("task name", { hours: 1 }, internal.module.func, {});

export default crons;
```
