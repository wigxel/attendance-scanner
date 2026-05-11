const safeEnv = (value: string | undefined, message: string): string => {
  if (value === undefined || value === null || value.trim() === "") {
    throw new Error(`Missing required environment variable. ${message}`);
  }
  return value;
};

export const CONFIG = {
  paystackPublicKey: safeEnv(
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    "No Paystack Key",
  ),
  convexUrl: safeEnv(process.env.NEXT_PUBLIC_CONVEX_URL, "No Convex URL"),
};
