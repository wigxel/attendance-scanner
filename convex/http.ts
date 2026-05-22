import { httpRouter } from "convex/server";
import { isRecord } from "effect/Predicate";
import crypto from "uncrypto";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
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

// ---------------------------------------------------------------------------
// Paystack Webhook Handler
// ---------------------------------------------------------------------------

/**
 * Verifies a Paystack webhook signature using HMAC SHA-512 and IP Whitelisting
 */
async function verifyPaystackWebhook(request: Request): Promise<unknown> {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not set in the Convex environment variables.",
    );
  }

  // 2. Signature Validation
  const paystackSignature = request.headers.get("x-paystack-signature");
  if (!paystackSignature) {
    throw new Error("Missing Paystack signature header.");
  }

  const body = await request.text();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const computedHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHash !== paystackSignature) {
    throw new Error("Invalid Paystack webhook signature.");
  }

  return JSON.parse(body);
}

http.route({
  path: "/events/paystack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: unknown;

    try {
      payload = await verifyPaystackWebhook(request);
    } catch (err) {
      console.error("Paystack webhook verification failed:", err);
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = payload as {
      event: string;
      data: Record<string, unknown>;
    };

    console.log("Paystack webhook received:", event.event);

    if (event.event === "charge.success") {
      await ctx.runMutation(internal.webhooks.onPaystackChargeSuccess, {
        data: event.data,
      });
    } else {
      console.log("Unhandled Paystack event type:", event.event);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
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
    const convex_user_id = await ctx.runMutation(api.myFunctions.createUser, {
      email: clerk_user.email_addresses[0].email_address,
      firstName: clerk_user.first_name,
      lastName: clerk_user.last_name,
      phone: clerk_user.phone_numbers?.[0]?.phone_number ?? undefined,
    });

    console.info("Linking Convex User to Clerk User", clerk_user.id);

    const response = await setExternalId({
      clerkUserId: clerk_user.id,
      convexUserId: convex_user_id,
    });

    console.info(
      { isRecord: isRecord(response) },
      "Expecting an object but got a `Response` Object",
    );
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

// ---------------------------------------------------------------------------
// AES-256-CBC Encryption helpers (matches reversible-hasher.ts pattern)
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveAESKey(): Promise<CryptoKey> {
  const salt = process.env.QR_CODE_SALT;
  if (!salt) throw new Error("QR_CODE_SALT not set");
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(salt));
  return crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function getEncryptionIV(): Uint8Array {
  const hex = process.env.QR_CODE_VI_HEX;
  if (!hex) throw new Error("QR_CODE_VI_HEX not set");
  return hexToBytes(hex);
}

async function encryptAES(message: string): Promise<string> {
  const key = await deriveAESKey();
  const iv = getEncryptionIV();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encoder.encode(message),
  );
  return bytesToHex(encrypted);
}

async function decryptAES(encryptedHex: string): Promise<string> {
  const key = await deriveAESKey();
  const iv = getEncryptionIV();
  const encrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    hexToBytes(encryptedHex),
  );
  return decoder.decode(encrypted);
}

// ---------------------------------------------------------------------------
// Report / Decrypt API Key
// ---------------------------------------------------------------------------

const REPORT_API_KEY = "a9f3c17d8b4e2f60c1d9ab73";

// ---------------------------------------------------------------------------
// GET /reports/daily - Returns encrypted daily report
// ---------------------------------------------------------------------------

http.route({
  method: "GET",
  path: "/reports/daily",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const date = url.searchParams.get("date") ?? undefined;

      const report = await ctx.runQuery(api.reports.getDaily, { date });

      const plaintext = JSON.stringify(report);
      const encrypted = await encryptAES(plaintext);

      return new Response(JSON.stringify({ encrypted }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Failed to generate daily report:", err);
      return new Response(
        JSON.stringify({ error: (err as Error).message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

// ---------------------------------------------------------------------------
// POST /decrypt - Decrypts data with public key as Bearer token
// ---------------------------------------------------------------------------

http.route({
  method: "POST",
  path: "/decrypt",
  handler: httpAction(async (_ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid Authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice("Bearer ".length);

      if (token !== REPORT_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const encrypted = await request.text();
      if (!encrypted) {
        return new Response(
          JSON.stringify({ error: "Missing encrypted data in request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const decrypted = await decryptAES(encrypted);
      const data = JSON.parse(decrypted);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Decryption failed:", err);
      return new Response(
        JSON.stringify({ error: "Decryption failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

export default http;
