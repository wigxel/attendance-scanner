import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Reads a value from the `config` table by key.
 * Returns `null` if the key does not exist.
 */
export async function getConfig(
  ctx: MutationCtx | QueryCtx,
  key: string,
): Promise<string | null> {
  const record = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return record?.value ?? null;
}

/**
 * Upserts a value in the `config` table.
 * Creates the record if it doesn't exist, patches it if it does.
 */
export async function setConfig(
  ctx: MutationCtx,
  key: string,
  value: string,
): Promise<void> {
  const existing = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("config", { key, value });
  }
}

/**
 * Deletes a key from the `config` table if it exists.
 * No-ops silently if the key is not present.
 */
export async function deleteConfig(
  ctx: MutationCtx,
  key: string,
): Promise<void> {
  const existing = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing) await ctx.db.delete(existing._id);
}
