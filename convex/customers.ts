import { query } from "./_generated/server";

// Query to
export const countCustomers = query({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("profile").collect();

    return customers.length;
  },
});
