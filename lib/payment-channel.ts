export const PAYMENT_CHANNELS = ["cash", "pos", "transfer"] as const;

export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

/** `unrecorded` is not stored: it is a booking whose channel is still absent. */
export type PaymentChannelFilter = PaymentChannel | "unrecorded";

export const paymentChannelLabels: Record<PaymentChannelFilter, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  unrecorded: "Unrecorded",
};
