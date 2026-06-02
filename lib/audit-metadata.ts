import { z } from "zod";
import { currencyFormatter } from "./currency.helpers";

export const bookingDeletedSchema = z
  .object({
    amount: z.number(),
    seatIds: z.array(z.string()),
    duration: z.number(),
    durationType: z.string(),
  })
  .partial();

export type BookingDeletedMetadata = z.infer<typeof bookingDeletedSchema>;

export function formatMetadataParts(parsed: BookingDeletedMetadata): string[] {
  const parts: string[] = [];

  if (parsed.amount !== undefined) {
    const amount =
      typeof parsed.amount === "number"
        ? currencyFormatter.format(parsed.amount / 100)
        : String(parsed.amount);
    parts.push(amount);
  }

  if (parsed.seatIds !== undefined) {
    const count = Array.isArray(parsed.seatIds) ? parsed.seatIds.length : 1;
    parts.push(`${count} seat${count !== 1 ? "s" : ""}`);
  }

  if (parsed.duration !== undefined) {
    parts.push(`${parsed.duration} ${parsed.durationType ?? "days"}`);
  }

  return parts;
}
