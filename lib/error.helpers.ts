import { ConvexError } from "convex/values";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return error.data;
  }

  if (typeof error === "string") {
    return error;
  }

  // @ts-expect-error for Cause
  const shortMessage = error?.cause?.shortMessage;
  if (shortMessage) return shortMessage;

  // @ts-expect-error for Description
  const desc = error?.description;
  if (desc) return desc;

  return String(error);
}
