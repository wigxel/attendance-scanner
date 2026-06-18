import { createFlagsmithInstance } from "@flagsmith/flagsmith/isomorphic";
import {
  useFlags,
  useFlagsmith,
  useFlagsmithLoading,
} from "@flagsmith/flagsmith/react";
import type { IFlagsmith, IFlagsmithFeature } from "@flagsmith/flagsmith/types";
import { Either, pipe } from "effect";
import { safeStr } from "@/lib/data.helpers";

export type Flag = string;

export function createFlagsmith(): IFlagsmith {
  return createFlagsmithInstance();
}

export const hostAPI = process.env.NEXT_PUBLIC_FLAGSMITH_API ?? "";

export const environmentID =
  process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID ?? "";

export { useFlags, useFlagsmith, useFlagsmithLoading };


export const FlagsCustomerScan = {
  allow_one_tap(flag: IFlagsmithFeature): boolean {
    if (!flag.enabled) return false;

    return pipe(
      Either.try(() => JSON.parse(safeStr(flag.value))),
      Either.match({
        onLeft: () => false,
        onRight: (v) => v.allow_one_tap,
      })
    )
  }
}
