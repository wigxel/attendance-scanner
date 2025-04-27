import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({})],
  callbacks: {
    // `args` are the same the as for `createOrUpdateUser` but include `userId`
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      { userId, profile, existingUserId },
    ) {
      if (existingUserId) return;

      await ctx.db.insert("profile", {
        id: userId,
        firstName: "",
        lastName: "",
        email: profile.email,
        phoneNumber: profile.phone,
        occupation: "None",
        role: "user",
      });
    },
  },
});
