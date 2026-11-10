"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileMenu, useMobileMenu } from "@/components/mobile-menu";
import { Button } from "@/components/ui/button";
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
      <header className={cn("sticky top-0 z-40 bg-background")}>
        <nav
          aria-label="Inspace Makers"
          className="container mx-auto flex h-16 items-center justify-between gap-2 px-4"
        >
          <a href="#content" className="font-bold">
            Inspace Makers
          </a>
          <div className="hidden items-center gap-8 font-mono text-sm lg:flex">
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
          {/* mr on mobile leaves room for the floating menu trigger */}
          <Button asChild variant="outline" className="mr-11 lg:mr-0">
            <a href="#tribes">Apply to join</a>
          </Button>
        </nav>
      </header>
    </MobileMenu>
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
