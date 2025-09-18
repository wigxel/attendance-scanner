import { mutation } from "./_generated/server";
import { v } from "convex/values";

// populate initial seat data
export const seedSeats = mutation({
  args: {
    numberOfSeats: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if seats already exist
    const existingSeats = await ctx.db.query("seats").collect();

    if (existingSeats.length > 0) {
      throw new Error("Seats already exist.");
    }

    // Create seats
    const seats = [];
    for (let i = 1; i <= args.numberOfSeats; i++) {
      const seatId = await ctx.db.insert("seats", {
        seatNumber: i,
        isOccupied: false,
        createdAt: Date.now(),
      });
      seats.push(seatId);
    }

    return { message: `Created ${args.numberOfSeats} seats`, seatIds: seats };
  },
});
