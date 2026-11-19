import { BlogSection } from "@/components/makers/blog-section";
import { MakersHero } from "@/components/makers/hero";
import { LeadersSection } from "@/components/makers/leaders";
import { TribesSection } from "@/components/makers/tribes";
import { TestimonySection } from "./testimony";
import "./maker.css";

export default function MakersPage() {
  return (
    <>
      <MakersHero />

      <TribesSection />

      <LeadersSection />

      <BlogSection />

      <TestimonySection />
    </>
  );
}
