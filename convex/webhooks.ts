import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Paystack charge.success wrapper:
 * Processes successful payments. Equivalent logic to `api.payments.confirm`.
 */
export const onPaystackChargeSuccess = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    // Paystack payload references usually live in data.reference
    const reference = data.reference as string;
    if (!reference) {
      console.warn("Paystack charge.success missing reference.");
      return;
    }

  },
});
