import { components, internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { getConfig } from "./config";

// Subset of inventory's StockLevel. Kept local (not imported from
// inventory.ts) so api.d.ts type inference stays acyclic.
type StockLevel = {
  name: string;
  quantity: number;
  reorderLevel: number;
};

// Daily low-stock digest. An hourly cron sweep (crons.ts) finds the products
// that are at or under their reorder level and sends each staff member one
// digest for the local day; the per-user dedupeKey makes later sweeps that
// day no-ops. Per-user, never broadcast: a broadcast key would give every
// recipient one shared read state on the bell (see convex/notifications.ts).

const DEFAULT_TIMEZONE = "Africa/Lagos";
const PRIVILEGES = ["inventory:manage", "inventory:sell"] as const;

// Products with no reorder level never trigger; otherwise low matches the
// bead's definition, quantity at or under the level (out of stock included).
const isLow = (level: StockLevel) =>
  level.reorderLevel > 0 && level.quantity <= level.reorderLevel;

export const lowProducts = internalQuery({
  args: {},
  handler: async (ctx): Promise<StockLevel[]> => {
    const levels = (await ctx.runQuery(
      components.inventory.stockMovements.levels,
      {},
    )) as StockLevel[];
    return levels.filter(isLow);
  },
});

export const digestRecipients = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const audiences = (await Promise.all(
      PRIVILEGES.map((privilege) =>
        ctx.runQuery(
          components.wigxel_acl.identities.listIdentitiesByPrivilege,
          {
            privilege,
          },
        ),
      ),
    )) as Array<Array<{ identity: string }>>;

    // either privilege qualifies; ACL roles can hold both
    return [
      ...new Set(audiences.flat().map((entry) => `user:${entry.identity}`)),
    ];
  },
});

export const sweep = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ sent: number }> => {
    const timezone = (await getConfig(ctx, "timezone")) ?? DEFAULT_TIMEZONE;
    const dayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: timezone,
    });

    const low = (await ctx.runQuery(
      internal.lowStockDigest.lowProducts,
      {},
    )) as StockLevel[];
    if (low.length === 0) return { sent: 0 };

    const recipients = await ctx.runQuery(
      internal.lowStockDigest.digestRecipients,
      {},
    );

    for (const recipientKey of recipients) {
      await ctx.runMutation(internal.notifications.send, {
        recipientKey,
        channels: ["inapp", "push"],
        title: `Low stock: ${low.length} ${low.length === 1 ? "product" : "products"} to reorder`,
        body: low
          .map((level) => `${level.name}: ${level.quantity} left`)
          .join("\n"),
        url: "/admin/inventory",
        dedupeKey: `low-stock-digest:${recipientKey}:${dayKey}`,
        severity: "warning",
      });
    }

    return { sent: recipients.length };
  },
});
