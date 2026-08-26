import "./_voxx/voxx.css";

import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { getConfig } from "./_voxx/data";
import { ThemeToggle } from "./_voxx/theme-toggle";
import { RssIcon } from "lucide-react";
import { Logo } from "@/components/logo";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const config = await getConfig();
  return (
    <div className="voxx">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="scanline-container" />
      </div>

      <header className="voxx-header sticky z-10">
        <div className="flex gap-4 items-center justify-start">
          <Logo className="h-4" />
          <Link
            href={config.site.titleHref ?? "/"}
            className="voxx-header__title text-blue-500 tracking-tightest"
          >
            {config.site.title}
          </Link>
        </div>

        <div className="voxx-header__actions">
          {config.features.rss ? (
            <a
              className="voxx-icon-button"
              href="/blog/rss.xml"
              aria-label="RSS feed"
            >
              <RssIcon />
            </a>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      {children}

      <Footer />
    </div>
  );
}
