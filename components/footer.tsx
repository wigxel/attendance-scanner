import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-4 p-4 flex flex-col gap-2 sm:flex-row justify-between text-xs border-t w-full text-center">
      <p className="order-3 sm:order-0 text-start sm:text-center ">
        Designed & Crafted by{" "}
        <a className="underline" href="https://wigxel.io">
          Wigxel
        </a>
      </p>

      <p className="flex gap-6">
        <a href="tel:7045965937" className="hover:underline text-start">
          Need Help?{" "}
          <span className="whitespace-nowrap">+ (234) 704 596 5937</span>
        </a>
        <span>•</span>
        <Link href="/legal/terms" className="hover:underline">
          Terms &amp; Conditions
        </Link>
      </p>
    </footer>
  );
}
