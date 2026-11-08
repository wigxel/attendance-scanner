import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { getConfig, setConfig } from "./config";
import { readId } from "./myFunctions";
import {
  type CheckInMode,
  checkInModeValidator,
  DEFAULT_CHECK_IN_MODE,
  isCheckInMode,
} from "./shared";

export const DEFAULT_CHECK_IN_MODE_KEY = "default_check_in_mode";

/** Unknown or missing values fall back to the safe staff-scan default. */
export function parseCheckInMode(value: string | null): CheckInMode {
  return isCheckInMode(value) ? value : DEFAULT_CHECK_IN_MODE;
}

export async function getDefaultCheckInMode(
  ctx: QueryCtx,
): Promise<CheckInMode> {
  return parseCheckInMode(await getConfig(ctx, DEFAULT_CHECK_IN_MODE_KEY));
}

/**
 * The customer's own label wins; otherwise the app-wide default applies.
 */
export async function resolveCheckInMode(
  ctx: QueryCtx,
  userId: string,
): Promise<CheckInMode> {
  const profile = await ctx.db
    .query("profile")
    .withIndex("by_user_id", (q) => q.eq("id", userId))
    .first();

  return profile?.checkInMode ?? (await getDefaultCheckInMode(ctx));
}

export const getCheckInModeDefault = query({
  args: {},
  handler: async (ctx) => await getDefaultCheckInMode(ctx),
});

export const setCheckInModeDefault = mutation({
  args: { mode: checkInModeValidator },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "settings:update");
    await setConfig(ctx, DEFAULT_CHECK_IN_MODE_KEY, args.mode);
  },
});

export const getMyCheckInMode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) return null;

    return await resolveCheckInMode(ctx, userId);
  },
});
