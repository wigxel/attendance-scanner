import { z } from 'zod';

const envSchema = z.object({
  // Paystack
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1),

  // Convex
  CONVEX_DEPLOYMENT: z.string().min(1),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),

  // App
  SETUP_SCRIPT_RAN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_LOG_LEVEL: z.string().optional(),

  // QR Code
  QR_CODE_SALT: z.string().min(1),
  QR_CODE_VI_HEX: z.string().min(1),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: z.string().min(1),
});

export function register() {
  console.log('Validating environment variables...');
  try {
    envSchema.parse(process.env);
    console.log('Environment variables are valid.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid environment variables:', error.format());
    } else {
      console.error('An unexpected error occurred during validation:', error);
    }
    throw error;
  }
}
