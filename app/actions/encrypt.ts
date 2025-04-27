"use server";

import { createReversibleHash } from "@/layers/encryption/presets/reversible-hasher";
import { ReversibleHash } from "@/layers/encryption/reversible";
import { safeStr } from "@/lib/data.helpers";
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
