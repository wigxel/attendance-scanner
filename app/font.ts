import { Geist, Geist_Mono } from "next/font/google";

export const body = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
