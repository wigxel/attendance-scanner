import { BlogSection } from "@/components/makers/blog-section";
import { BuildSection } from "@/components/makers/build";
import { MakersHero } from "@/components/makers/hero";
import { LeadersSection } from "@/components/makers/leaders";
import { TrustedByMarquee } from "@/components/makers/marquee";
import { TribesSection } from "@/components/makers/tribes-variant-b";
import { cn } from "@/lib/utils";
import { TestimonySection } from "./testimony";
import "./maker.css";

type SectionShell = {
  id: string;
  title?: string;
  tone: "base" | "lv1";
  hidden?: boolean;
  fullBleed?: boolean;
};

const SECTION_SHELLS: ReadonlyArray<SectionShell> = [
  { id: "build", tone: "base", fullBleed: true },
  // hidden until ≥3 real artefacts are published (PRD section 5 rule),
  // nav drops the link then — no dead link.
  { id: "resources", title: "Resources", tone: "lv1", hidden: true },
];

const toneClass = {
  base: "bg-background",
  lv1: "bg-background-lv1",
};

export default function MakersPage() {
  const shells = SECTION_SHELLS.filter((shell) => !shell.hidden);

  return (
    <>
      <MakersHero />

      {/*<TrustedByMarquee />*/}

      <LeadersSection />

      <BlogSection />

      <TestimonySection />
    </>
  );
}
