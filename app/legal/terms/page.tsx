"use client";
import { formatDate } from "date-fns";
import "./legal.css";
import Terms from "./terms.mdx";

export default function TermsPage() {
  return (
    <section className="max-w-[50ch] px-6 pt-12 min-h-[calc(100svh-3.5rem)] font-body flex flex-col mx-auto gap-6 py-4">
      <hgroup className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold font-sans tracking-tighter">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-sm">
          Last Updated: {formatDate(new Date(2025, 7, 3), "do MMM, yy")}
        </p>
      </hgroup>

      <article className="prose lg:prose-lg">
        <Terms />
      </article>
    </section>
  );
}
