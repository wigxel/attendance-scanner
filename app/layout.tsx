import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/react-query";
import { ClerkProvider } from '@clerk/nextjs'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InSpace",
  description: "Learn and upskill in the diversity of tech",
  icons: {
    icon: "/convex.svg",
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
        cssLayerName: 'clerk',
      }}
    >
      <QueryProvider>
        <html lang="en" className="scanline-root">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </body>
        </html>
      </QueryProvider>
    </ClerkProvider>
  );
}
