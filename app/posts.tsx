"use server";
import { getPosts } from "@prudentbird/voxx-core";
import Link from "next/link";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";
import { heading } from "./font";

export async function Posts() {
  const items = await getPosts({
    collection: "blog",
  });

  return (
    <section className={"flex flex-col pb-64 px-8 container mx-auto"}>
      <div className="container mx-auto">
        <hgroup className="flex-col flex gap-8 md:gap-12">
          <h2 className={`${heading.className} tracking-tighter md:grid grid-cols-12 leading-[2ex] text-5xl md:text-[7vw] font-bold`}>
            <span className="col-span-5" />
            <span className="col-span-7">Inspiration For&nbsp;</span>
            <span className="col-span-7">The Makers.</span>
            <span />
          </h2>

          <p className="text-lg md:text-2xl text-muted-foreground text-balance">
            To be a Maker, one must think like different. <br />
            <span>Enlighten your mindset.</span>
          </p>
        </hgroup>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="col-span-5" />
          <div className="col-span-7 mt-24 md:mt-32 relative">
            <ul className="flex flex-col gap-12">
              {items.map((e, index) => {
                return (
                  <Link
                    key={e.title}
                    href={e.url}>

                    <section
                      className="group relative pt-4"
                    >
                      <div className="grid grid-cols-12">
                        <span className="font-bold flex pointer-events-none group-hover:opacity-25 leading-[1ex] pt-2 font-mono -tracking-[0.8svw] select-none text-[12svw] top opacity-5 col-span-3">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <div className="col-span-9">
                          <h2 className="text-lg text-foreground font-medium group-hover:underline">
                            {e.title}
                          </h2>

                          <p className="text-base text-pretty md:text-lg mb-3 text-muted-foreground">
                            {e.description}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-(--border) my-4" />

                      <div className="grid grid-cols-12">
                        <div className="col-span-3" />

                        <p className="flex col-span-9 gap-3 text-xs mb-2 justify-start text-muted-foreground w-full">
                          <span className="font-mono">
                            {DateParse.presets
                              .dateOnly(e.date)
                              .pipe(O.getOrElse(() => "--"))}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{e.category}</span>
                        </p>
                      </div>

                    </section>
                  </Link>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
