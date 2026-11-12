import { getPosts } from "@prudentbird/voxx-core";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { DateParse } from "@/lib/date.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { CommunityAnimation } from "./community-animation";
import { TopArticlesSection } from "./top-articles-section";

const LATEST_COUNT = 4;

export async function BlogSection() {
  const posts = await getPosts({ collection: "blog" });

  const latest = [...posts]
    .sort((a, b) => timestamp(b.date) - timestamp(a.date))
    .slice(0, LATEST_COUNT);

  return (
    <div>
      <WeeklyLogSection />
      <TopArticlesSection posts={latest} />
    </div>
  );
}

function timestamp(date: string) {
  return pipe(
    DateParse.try(date),
    O.map((d) => d.getTime()),
    O.getOrElse(() => 0),
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
              "font-heading tracking-tighter text-3xl font-black md:text-6xl",
            )}
          >
            <Balancer>
              Inside The Build: <span className="font-light">Weekly Logs</span>
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
