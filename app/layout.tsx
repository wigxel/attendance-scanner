import type { Metadata } from "next";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { FlagsmithProvider } from "@/components/FlagsmithProvider";
import { QueryProvider } from "@/components/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { body, mono } from "./font";

export const metadata: Metadata = {
  title: "InSpace",
  description: "Be the best version of yourself.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scanline-root" suppressHydrationWarning>
      <body
        className={`${body.variable} ${mono.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
            appearance={{
              cssLayerName: "clerk",
            }}
          >
            <QueryProvider>
              <ConvexClientProvider>
                <FlagsmithProvider>{children}</FlagsmithProvider>
              </ConvexClientProvider>
            </QueryProvider>
          </ClerkProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
