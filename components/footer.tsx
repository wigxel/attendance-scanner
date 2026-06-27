import Link from "next/link";
import { ThemeSelect } from "@/components/theme-select";

export function Footer() {
  return (
    <footer className="mt-4 p-4 flex flex-col gap-2 sm:flex-row items-center justify-between text-xs border-t w-full text-center">
      <div className="inline-flex gap-4 items-center">
        <p className="order-3 sm:order-0 text-start sm:text-center ">
          Designed & Crafted by{" "}
          <a
            href="https://wigxel.io"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Wigxel
          </a>
        </p>

        <ThemeSelect />
      </div>

      <p className="flex gap-6">
        <a href="tel:7045965937" className="hover:underline text-start">
          Need Help?{" "}
          <span className="whitespace-nowrap">+ (234) 913 055 4887</span>
        </a>
        <span>•</span>
        <Link href="/legal/terms" className="hover:underline">
          Terms &amp; Conditions
        </Link>
        <span>•</span>
      </p>
    </footer>
  );
}
