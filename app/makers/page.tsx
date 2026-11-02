import { heading } from "@/app/font";
import { BlogSection } from "@/components/makers/blog-section";
import { BuildSection } from "@/components/makers/build";
import { MakersHero } from "@/components/makers/hero";
import { LeadersSection } from "@/components/makers/leaders";
import { TrustedByMarquee } from "@/components/makers/marquee";
// Section 3 layout variants — swap this import to compare (export name is
// the same in all three):
//   A "the cadastre"  — @/components/makers/tribes           (square matrix)
//   B "the ledger"    — @/components/makers/tribes-variant-b (register rows)
//   C "the index"     — @/components/makers/tribes-variant-c (typographic index)
import { TribesSection } from "@/components/makers/tribes-variant-b";
import { cn } from "@/lib/utils";

const SECTION_SHELLS: ReadonlyArray<{
  id: string;
  title?: string;
  tone: "base" | "lv1";
  hidden?: boolean;
  fullBleed?: boolean;
}> = [
    { id: "tribes", title: "Tribes", tone: "lv1" },
    { id: "build", tone: "base", fullBleed: true },
    // hidden until ≥3 real artefacts are published (PRD section 5 rule),
    // nav drops the link then — no dead link.
    { id: "resources", title: "Resources", tone: "lv1", hidden: true },
    { id: "leaders", title: "Community Leaders", tone: "base" },
  ];

const toneClass = { base: "bg-background", lv1: "bg-(--background-lv1)" };

export default function MakersPage() {
  const shells = SECTION_SHELLS.filter((shell) => !shell.hidden);

  return (
    <>
      <MakersHero />
      <TrustedByMarquee />
      {shells.map((shell) => (
        <section
          key={shell.id}
          id={shell.id}
          className={cn(
            "scroll-mt-16 border-t border-(--border)",
            !shell.fullBleed && "px-4 py-16 md:py-28 bg-(--background-lv1)",
            shell.fullBleed && toneClass[shell.tone],
          )}
        >
          {shell.fullBleed ? (
            <>
              {/* section shell: resources body lands in batch D */}
              {shell.id === "tribes" && <TribesSection />}
              {shell.id === "build" && <BuildSection />}
              {shell.id === "leaders" && <LeadersSection />}
            </>
          ) : (
            <div className="container mx-auto flex flex-col gap-10 md:gap-14">
              {shell.title && (
                <h2
                  className={cn(
                    heading.className,
                    "tracking-tighter text-3xl md:text-5xl",
                  )}
                >
                  {shell.title}
                </h2>
              )}
              {/* section shell: resources body lands in batch D */}
              {shell.id === "tribes" && <TribesSection />}
              {shell.id === "build" && <BuildSection />}
              {shell.id === "leaders" && <LeadersSection />}
            </div>
          )}
        </section>
      ))}
      <BlogSection />
    </>
  );
}
