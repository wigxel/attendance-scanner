import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/react-query";
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
    <QueryProvider>
      <ConvexAuthNextjsServerProvider>
        <html lang="en" className="scanline-root">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </body>
        </html>
        <Toaster />
      </ConvexAuthNextjsServerProvider>
    </QueryProvider>
  );
}
