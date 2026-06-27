"use server";
import { getPosts } from "@prudentbird/voxx-core";
import Link from "next/link";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";

export async function Posts() {
  const items = await getPosts({
    collection: "blog",
  });

  return (
    <section className={"flex flex-col pt-12 pb-64 bg-[beige]"}>
      <div className="container mx-auto">
        <hgroup className=" flex-col flex gap-12 w-6/12">
          <h2 className="tracking-tighter leading-[2ex] text-[10ch] font-[Eyes_For_Serif] font-bold">
            Content for the <br /> Makers.
          </h2>
          <p className="text-3xl">
            To be a Maker, one must think like different. <br />
            <span>Enlighten your mindset.</span>
          </p>
        </hgroup>

        <div className="grid grid-cols-12">
          <div className="col-span-5" />
          <div className="col-span-7 mt-32 relative">
            <span className="font-bold pointer-events-none select-none translate-x-[-75%] translate-y-[-50%] text-[10svw] absolute top opacity-5">
              #
            </span>

            <ul className="flex flex-col gap-12">
              {items.map((e) => {
                return (
                  <section
                    key={e.title}
                    className="group border-t border-black/16 "
                  >
                    <p className="flex gap-3 mb-2">
                      <span className="font-mono">
                        {DateParse.presets
                          .dateOnly(e.date)
                          .pipe(O.getOrElse(() => "--"))}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{e.category}</span>
                    </p>

                    <Link href={e.url}>
                      <h2 className="text-lg font-medium group-hover:underline">
                        {e.title}
                      </h2>
                    </Link>

                    <p className="text-lg mb-3 text-black">{e.description}</p>
                  </section>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
