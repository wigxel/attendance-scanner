import { httpRouter } from "convex/server";
import { isRecord } from 'effect/Predicate';
import crypto from "uncrypto";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { httpAction, internalAction } from "./_generated/server";
import { setExternalId } from "./clerk";

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

const writeTx = httpAction(async (ctx, res) => {
  console.log("#### >>", res.body);

  return Response.json({ message: "OK" });
});

const updateUserRole = internalAction(async (ctx, res) => { });

http.route({
  method: "POST",
  path: "/integrations/payments",
  handler: writeTx,
});

const schema = z.object({
  id: z.string().refine((e) => e.startsWith("user_")),
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  email_addresses: z
    .array(z.object({ email_address: z.string().email() }))
    .min(1),
  phone_numbers: z.array(
    z.object({
      phone_number: z.string().min(10).max(20),
    }),
  ),
});

const handleEvents = httpAction(async (ctx, res) => {
  const event = await res.json();

  if (event.type === "user.created") {
    console.info("User signed up");
    const clerk_user = await schema.parseAsync(event?.data);

    console.info("Updating Convex user database");
    const convex_user_id = await ctx.runMutation(
      internal.myFunctions.createUser,
      {
        email: clerk_user.email_addresses[0].email_address,
        firstName: clerk_user.first_name,
        lastName: clerk_user.last_name,
        phone: clerk_user.phone_numbers?.[0]?.phone_number ?? undefined,
      },
    );

    console.info("Linking Convex User to Clerk User", clerk_user.id);
    const response = await setExternalId({
      clerkUserId: clerk_user.id,
      convexUserId: convex_user_id,
    });

    console.assert(isRecord(response), "Expecting an object but got a `Response` Object");
    console.info("Linked Convex User to Clerk User");
    return Response.json({ message: "OK", data: "User linking complete" });
  }

  return Response.json({ message: "OK" });
});

http.route({
  method: "POST",
  path: "/events/convex",
  handler: handleEvents,
});

// Add any custom HTTP routes here if needed in the future
export default http;
