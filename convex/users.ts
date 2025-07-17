import { query } from "./_generated/server";
import { v } from "convex/values";

// single users fetch
export const getUsers = query({
    args: {userId: v.id('users')},
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId)
    }
})

// all users fetch
export const getAllUsers = query({
    handler: async (ctx) => {
        return await ctx.db.query('users')
            .order('asc')
            .collect();
    }
})
