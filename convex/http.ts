import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import crypto from "uncrypto";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Reads all authUsers, fetches their user data, and syncs to Clerk.
 */
const syncConvexUsers = httpAction(async (ctx) => {
  // 1. Get all authUsers
  const authUsers = await ctx.runQuery(api.myFunctions.getAllProfiles); // Adjust to your query method

  for await (const entry of authUsers) {
    const user = entry.profile;

    if (!user) continue;

    const email_addr = entry.user.email ?? entry.profile?.email;

    if (!email_addr) continue;

    // 3. Prepare Clerk payload
    const payload = {
      first_name: user.firstName,
      last_name: user.lastName,
      email_address: [email_addr],
      password: crypto.randomUUID(),
      external_id: entry.profile?.id,
      username: `${user.firstName}_${user.lastName}`.toLowerCase(),
    };

    // 4. POST to Clerk
    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLERK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const res = response.json();

    // @ts-expect-error Nothing really more like the movement
    const errors: { message: string }[] = res.errors ?? [];

    const account_already_exists = errors.map((e) => {
      return e.message.includes("That email address is taken");
    });

    if (account_already_exists) {
      console.log(`Account(${payload.username}) already exists. `);
      continue;
    }

    if (!response.ok) {
      console.error(
        `Failed to sync user ${payload.username}: ${response.statusText}`,
      );
    }
  }

  return Response.json({ message: "OK" });
});

http.route({
  method: "POST",
  path: "/sync/users",
  handler: syncConvexUsers,
});

// http.route({
//   method: "POST",
//   path: "/sync/users",
//   handler: syncConvexUsers,
// });

// Add any custom HTTP routes here if needed in the future
export default http;
