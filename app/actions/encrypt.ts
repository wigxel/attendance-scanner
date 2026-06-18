"use server";

import { Console, Effect, pipe } from "effect";
import type { CustomerRegisterTuple } from "@/hooks/tracking";
import { createReversibleHash } from "@/layers/encryption/presets/reversible-hasher";
import { ReversibleHash } from "@/layers/encryption/reversible";
import { safeArray, safeStr } from "@/lib/data.helpers";

const HasherLive = createReversibleHash({
  salt: safeStr(process.env.QR_CODE_SALT),
  hex: safeStr(process.env.QR_CODE_VI_HEX),
});

export async function encodeQRCodeData(any: unknown[]): Promise<string> {
  const program = pipe(
    Effect.gen(function* () {
      const hash = yield* ReversibleHash;
      return yield* hash.encrypt(JSON.stringify(any));
    }),
    Effect.tap(Console.log),
    Effect.provide(HasherLive),
    Effect.runPromise,
  );

  return await program;
}

export async function decodeQRCodeData(
  encoded: string | "none",
): Promise<CustomerRegisterTuple> {
  if (encoded === "none") {
    throw new Error("Invalid QR Code data.");
  }

  return pipe(
    Effect.gen(function* () {
      const hash = yield* ReversibleHash;
      return yield* hash.decrypt(encoded);
    }),
    Effect.map((e) => safeArray(JSON.parse(e)) as CustomerRegisterTuple),
    Effect.provide(HasherLive),
    Effect.runPromise,
  );
}


export async function generateQRToken(adminId: string): Promise<string> {
  const payload = JSON.stringify({ adminId, t: Date.now() });

  return pipe(
    Effect.gen(function* () {
      const hash = yield* ReversibleHash;
      return yield* hash.encrypt(payload);
    }),
    Effect.provide(HasherLive),
    Effect.runPromise,
  );
}

export async function verifyQRToken(
  token: string,
): Promise<{ adminId: string; timestamp: number }> {
  const raw = await pipe(
    Effect.gen(function* () {
      const hash = yield* ReversibleHash;
      return yield* hash.decrypt(token);
    }),
    Effect.provide(HasherLive),
    Effect.runPromise,
  );

  const parsed = JSON.parse(raw);
  const adminId = parsed?.adminId;
  const timestamp = parsed?.t;

  if (typeof adminId !== "string" || typeof timestamp !== "number") {
    throw new Error("Invalid QR token.");
  }

  const elapsed = Date.now() - timestamp;
  if (elapsed > 5 * 60 * 1000) {
    throw new Error("QR code has expired. Please scan a fresh code.");
  }

  return { adminId, timestamp };
}
