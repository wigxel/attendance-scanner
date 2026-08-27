import "./_voxx/voxx.css";

import type { ReactNode } from "react";
import PublicHeader from "@/app/auth/_components/public-header";
import { Footer } from "@/components/footer";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="voxx">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="scanline-container" />
      </div>

      <PublicHeader />

      {children}

      <Footer />
    </div>
  );
}
