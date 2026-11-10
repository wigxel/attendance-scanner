import { getPosts } from "@prudentbird/voxx-core";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { heading } from "@/app/font";
import { DateParse } from "@/lib/date.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { CommunityAnimation } from "./community-animation";

export async function BlogSection() {
  const posts = await getPosts({ collection: "blog" });

  const timestamp = (date: (typeof posts)[number]["date"]) => {
    return pipe(
      DateParse.try(date),
      O.map((d) => d.getTime()),
      O.getOrElse(() => 0),
    );
  };

  const latest = [...posts]
    .sort((a, b) => timestamp(b.date) - timestamp(a.date))
    .slice(0, 3);

  if (latest.length === 0) return null;

  return (
    <section
      id="blog"
      className="scroll-mt-16 border-t border-border bg-background-lv1 px-4 py-16 md:py-28"
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

        <ul className="flex flex-col divide-y divide-border">
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
      </div>

      <WeeklyLogSection />
    </section>
  );
}

function WeeklyLogSection() {
  return (
    <div className="grid gap-5 grid-cols-12 container px-4 mx-auto">
      <div />

      <section className="col-span-10 py-24 justify-between flex gap-4">
        <div className="basis-1/2 flex flex-col gap-7 py-24">
          <h4
            className={cn(
              "font-heading uppercase tracking-tighter text-3xl font-black md:text-6xl",
            )}
          >
            <Balancer>
              Inside the Build: <span className="font-light">Weekly logs</span>
            </Balancer>
          </h4>

          <p className="max-w-[45ch] text-muted-foreground text-2xl font-thin mb-8">
            Explore the real-world problems our community is solving across
            software, AI, hardware and games.
          </p>

          <Link
            href="/makers/logs"
            className="w-fit text-xl inline-flex gap-1 items-center font-mono text-brand-maker underline underline-offset-4 hover:text-foreground"
          >
            <span>View weekly logs</span>
            <ArrowRight size="1em" />
          </Link>
        </div>

        <CommunityAnimation />
      </section>
    </div>
  );
}
