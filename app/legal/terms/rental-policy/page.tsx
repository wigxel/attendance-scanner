"use client";
import { formatDate } from "date-fns";
import "../legal.css";
import Rental from "../rental-policy.mdx";

export default function TermsPage() {
  return (
    <section className="max-w-[50ch] lg:max-w-[60ch] px-6 pt-12 min-h-[calc(100svh-3.5rem)] font-body flex flex-col mx-auto gap-6 py-4">
      <hgroup className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold font-sans tracking-tighter">
          Rental Service Policy
        </h1>

        <p className="text-muted-foreground text-sm">
          Last Updated: {formatDate(new Date(2026, 1, 2), "do MMM, yy")} <br />
          Policy version: 1.0
        </p>
      </hgroup>

      <article className="prose lg:prose-lg">
        <Rental />
      </article>
    </section>
  );
}
