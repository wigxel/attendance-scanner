import { getPosts } from "@prudentbird/voxx-core";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { heading } from "@/app/font";
import { DateParse } from "@/lib/date.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";

// Blog section — the latest 3 posts before the footer. Rows on desktop
// (date | title | description share one hairline row), single column on
// mobile. Hidden while there is nothing to show — no empty shell.
export async function BlogSection() {
  const posts = await getPosts({ collection: "blog" });

  const timestamp = (date: (typeof posts)[number]["date"]) =>
    pipe(
      DateParse.try(date),
      O.map((d) => d.getTime()),
      O.getOrElse(() => 0),
    );

  // newest first, capped at 3 — sort own copy, never the source order
  const latest = [...posts]
    .sort((a, b) => timestamp(b.date) - timestamp(a.date))
    .slice(0, 3);

  if (latest.length === 0) return null;

  return (
    <section
      id="blog"
      className="scroll-mt-16 border-t border-(--border) bg-(--background-lv1) px-4 py-16 md:py-28"
    >
      <div className="container mx-auto flex flex-col gap-10 md:gap-14">
        <h2
          className={cn(
            heading.className,
            "tracking-tighter text-3xl md:text-5xl",
          )}
        >
          What we shipped
        </h2>

        <ul className="flex flex-col divide-y divide-(--border)">
          {latest.map((post) => (
            <li key={post.slug}>
              <Link
                href={post.url}
                className="group grid gap-x-8 gap-y-1 py-4 md:grid-cols-[16ch_20rem_1fr] md:items-baseline"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {pipe(
                    DateParse.presets.dateOnly(post.date),
                    O.getOrElse(() => "--"),
                  )}
                </span>
                <h3 className="font-medium underline-offset-4 group-hover:underline">
                  {post.title}
                </h3>
                <p className="max-w-[70ch] text-muted-foreground">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/blog"
          className="w-fit font-mono text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          See more articles
        </Link>

        <div className="flex gap-12 border py-24 px-16">
          <section className="flex gap-4">
            <div className="basis-5/12 grow">
              <h4
                className={cn(
                  heading.className,
                  "tracking-tighter text-3xl md:text-5xl",
                )}
              >
                <Balancer>Inside the Build: Weekly logs</Balancer>
              </h4>
            </div>

            <div className="flex flex-col gap-8 basis-5/12">
              <p className="max-w-[45ch] text-muted-foreground">
                Explore the real-world problems our community is solving across
                software, AI, hardware and games.
              </p>

              <Link
                href="/makers/logs"
                className="w-fit text-sm font-mono text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Browse logs
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
