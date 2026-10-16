import { MakersFooter } from "@/components/makers/footer";
import { MakersNav } from "@/components/makers/nav";

// Shared chrome for the makers routes: /makers and /makers/tribes.
// The Makers nav is makers-specific (PRD section 1), so it does not use
// the shared app Header — that header belongs to the auth-gated pages.
export default function MakersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <title>Inspace Makers</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-2 relative">
        {/* first focusable element, per PRD */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2 focus:text-foreground"
        >
          Skip to content
        </a>
        <MakersNav />

        <main id="content">{children}</main>

        <MakersFooter />
      </div>
    </>
  );
}
