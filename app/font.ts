import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

export const body = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const heading = localFont({
  src: [
    { path: "../public/fonts/EyesforSerifs-Regular.woff2", weight: "400" },
    { path: "../public/fonts/EyesforSerifs-Bold.woff2", weight: "700" },
  ],
  variable: "--font-heading",
})
