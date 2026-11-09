const NIGERIAN_DIAL_CODE = "+234";

/**
 * Reduces a phone number to E.164-ish form. Returns null when the input has no
 * usable digits.
 *
 * Local Nigerian numbers (`0803…`, `803…`) are promoted to `+234…`. Anything
 * already written with a leading `+` is kept as-is so non-Nigerian numbers
 * still dial.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) return `+${digits}`;

  if (digits.length === 11 && digits.startsWith("0")) {
    return `${NIGERIAN_DIAL_CODE}${digits.slice(1)}`;
  }

  if (digits.length === 10) return `${NIGERIAN_DIAL_CODE}${digits}`;

  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;

  return null;
}

/**
 * Nigerian mobile numbers start with 7, 8 or 9 after the country code. Other
 * international numbers are accepted on their digit count alone — the app has
 * no country selector to validate against.
 */
export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  if (!normalized) return false;

  if (normalized.startsWith(NIGERIAN_DIAL_CODE)) {
    return /^\+234[789]\d{9}$/.test(normalized);
  }

  return /^\+\d{8,15}$/.test(normalized);
}

/** Formats a number for display; unparseable input is returned untouched. */
export function formatPhone(input: string): string {
  const trimmed = input.trim();
  const normalized = normalizePhone(trimmed);
  if (!normalized) return trimmed;

  if (normalized.startsWith(NIGERIAN_DIAL_CODE) && normalized.length === 14) {
    const subscriber = normalized.slice(NIGERIAN_DIAL_CODE.length);
    return `${NIGERIAN_DIAL_CODE} ${subscriber.slice(0, 3)} ${subscriber.slice(3, 6)} ${subscriber.slice(6)}`;
  }

  return normalized;
}
