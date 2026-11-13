export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

const ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Home",
  "End",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

/** Keyboard filter for amount fields: digits, one decimal point, and navigation. */
export function isAmountKey(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  if (/^\d$/.test(event.key)) return true;
  return event.key === "." || ALLOWED_KEYS.has(event.key);
}

/** Keeps digits and the first decimal point so intermediate typing survives. */
export function sanitizeAmountInput(input: string): string {
  const [whole, ...fraction] = input.replace(/[^\d.]/g, "").split(".");
  return fraction.length ? `${whole}.${fraction.join("")}` : whole;
}

/** Turns whatever survived the keyboard filter into a money value. */
export function parseAmountInput(input: string): number {
  const value = Number(sanitizeAmountInput(input));

  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Money taken at the till, in kobo, never more than the sale is worth. */
export function depositKobo(naira: string, totalKobo: number): number {
  return Math.min(Math.round(parseAmountInput(naira) * 100), totalKobo);
}
