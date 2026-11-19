"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileMenu, useMobileMenu } from "@/components/mobile-menu";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { id: "Makers", label: "Makers", href: "/makers" },
  { id: "Co-working", label: "Booking", href: "/reserve" },
  { id: "Blog", label: "Blog", href: "/blog" },
] as const;

export function MakersNav() {
  const current = usePathname();

  return (
    <MobileMenu>
      <header className={cn("sticky top-0 z-40 bg-background hide-at-footer")}>
        <nav
          aria-label="Inspace Makers"
          className="container mx-auto flex h-16 items-center justify-between gap-2 px-4"
        >
          <BrandLogo />

          <div className="hidden items-center gap-8 text-sm lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                aria-current={current === link.href ? "true" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  current === link.href && "text-foreground underline",
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      </header>
    </MobileMenu>
  );
}

function BrandLogo() {
  return (
    <Link href="/" className="font-bold">
      <Image
        src="/logo.svg"
        width={40}
        alt="InSpace brand identity"
        height={40}
        className="mix-blend-exclusion apply-dodge apply-dodge-fixed"
      />
    </Link>
  );
}

// current is implicit: whatever the URL hash says
function useCurrentHashId(): string {
  const [hashId, setHashId] = useState(() =>
    typeof window !== "undefined" ? window.location.hash.slice(1) : "",
  );

  useEffect(() => {
    const onHash = () => setHashId(window.location.hash.slice(1));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return hashId;
}

// anchor links close the sheet — the target section must be visible
function MakersMenuLinks({
  links,
}: {
  links: ReadonlyArray<{ id: string; label: string }>;
}) {
  const { setOpen } = useMobileMenu();
  const current = useCurrentHashId();

  return (
    <ul className="flex flex-1 flex-col justify-center divide-y divide-(--border) px-4 pb-32">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={`/#${link.id}`}
            aria-current={current === link.id ? "true" : undefined}
            className={cn(
              "flex items-center py-4 font-mono text-muted-foreground hover:text-foreground",
              current === link.id && "text-foreground underline",
            )}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
