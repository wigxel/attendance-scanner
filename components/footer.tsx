import Link from "next/link";
import { ThemeSelect } from "@/components/theme-select";

export function Footer() {
  return (
    <footer className="mt-4 p-4 flex flex-col gap-8 md:gap-2 sm:flex-row md:items-center justify-between text-xs border-t w-full text-center">
      <div className="flex justify-between md:justify-start md:inline-flex gap-4  items-center order-2">
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

      <p className="flex *:py-3 order-1 md:order-2 flex-col md:flex-row items-stretch text-start divide-y md:divide-y-0 md:divide-x md:*:py-0 md:*:px-4">
        <a href="tel:+2347012007448" className="hover:underline text-start">
          Need Help?{" "}
          <span className="whitespace-nowrap">+ (234) 701 200 7448</span>
        </a>
        <Link href="/legal/terms" className="hover:underline">
          Terms &amp; Conditions
        </Link>
      </p>
    </footer>
  );
}
