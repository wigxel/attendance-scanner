import type { Metadata } from "next";
import "./globals.css";

import ConvexClientProvider from "@/components/ConvexClientProvider";
import { QueryProvider } from "@/components/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        cssLayerName: "clerk",
      }}
    >
      <QueryProvider>
        <html lang="en" className="scanline-root">
          <body
            className={`${body.variable} ${mono.variable} antialiased font-sans`}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </body>
        </html>
      </QueryProvider>
    </ClerkProvider>
  );
}
