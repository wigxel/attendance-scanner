"use server";

import type { CustomerRegisterTuple } from "@/hooks/tracking";
import { createReversibleHash } from "@/layers/encryption/presets/reversible-hasher";
import { ReversibleHash } from "@/layers/encryption/reversible";
import { safeArray, safeStr } from "@/lib/data.helpers";
import { Console, Effect, pipe } from "effect";

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
