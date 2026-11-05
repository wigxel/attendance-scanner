import { createFlagsmithInstance } from "@flagsmith/flagsmith/isomorphic";
import {
  useFlags,
  useFlagsmith,
  useFlagsmithLoading,
} from "@flagsmith/flagsmith/react";
import type { IFlagsmith } from "@flagsmith/flagsmith/types";

export type Flag = string;

export function createFlagsmith(): IFlagsmith {
  return createFlagsmithInstance();
}

export const hostAPI = process.env.NEXT_PUBLIC_FLAGSMITH_API ?? "";

export const environmentID =
  process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID ?? "";

export { useFlags, useFlagsmith, useFlagsmithLoading };
