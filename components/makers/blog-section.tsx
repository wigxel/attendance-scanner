import { getPosts } from "@prudentbird/voxx-core";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { CircularButton } from "@/components/circular-button";
import { PostCard } from "@/components/post-card";
import { DateParse } from "@/lib/date.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { CommunityAnimation } from "./community-animation";

export async function BlogSection() {
  return (
    <div>
      <TopArticlesSection />

      <section className="scroll-mt-16 border-t border-border bg-background-lv1 px-4 py-16 md:py-28">
        <WeeklyLogSection />
      </section>
    </div>
  );
}

async function TopArticlesSection() {
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
    .slice(0, 4);

  if (latest.length === 0) return null;

  return (
    <div id="blog" className="overflow-x-clip bg-background">
      <div className="container mx-auto py-24 [--heading-height:4.12rem] px-4">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-1" />

          <h3 className="font-heading text-8xl font-black relative col-span-11">
            WHAT WE
            <span className="text-cyan-500 text-8xl tracking-wider absolute inset-bs-0 inset-s-0 rotate-90 origin-top-left translate-y-32 -translate-x-8">
              SHIPPED
            </span>
          </h3>

          <div className="col-span-1" />

          <div className="grid gap-10 grid-cols-[1fr_0.6fr] relative grid-rows-1 col-span-10">
            {/* full post card */}
            <div className="*:flex-1 flex *:pt-0!">
              <PostCard variant="item" post={latest[0]} />
            </div>

            {/* compact posts */}
            <div className="flex flex-col gap-4 *:pt-0!">
              {latest.slice(1).map((post, index) => {
                return (
                  <PostCard
                    key={post.slug}
                    variant="compact"
                    post={post}
                    number={latest.length - index}
                  />
                );
              })}
            </div>

            <div className="absolute inset-e-0 inset-be-0 translate-y-1/2 translate-x-1/2">
              <CircularButton
                text="see more exploration"
                className="animate-spin animation-duration-[120s] transition-default"
                variant="outline"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyLogSection() {
  return (
    <div className="grid gap-5 grid-cols-12 container px-4 mx-auto">
      <div />

      <section className="col-span-10 py-24 justify-between flex gap-4">
        <CommunityAnimation />

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
      </section>
    </div>
  );
}
