import { getPosts } from "@prudentbird/voxx-core";
import { PostCard } from "@/components/post-card";
import { heading } from "./font";

export async function Posts() {
  const items = await getPosts({
    collection: "blog",
  });

  return (
    <section className={"flex flex-col pb-64 px-8 container mx-auto"}>
      <div className="container mx-auto">
        <hgroup className="flex-col flex gap-8 md:gap-12">
          <h2
            className={`${heading.className} tracking-tighter md:grid grid-cols-12 leading-[2ex] text-5xl md:text-[7vw] font-bold`}
          >
            <span className="col-span-5" />
            <span className="col-span-7">Inspiration For&nbsp;</span>
            <span className="col-span-7">The Makers.</span>
            <span />
          </h2>

          <p className="text-lg text-muted-foreground text-balance">
            To be a Maker, one must think differently. <br />
            <span>Enlighten your mindset.</span>
          </p>
        </hgroup>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="col-span-5" />
          <div className="col-span-7 mt-24 md:mt-32 relative">
            <ul className="flex flex-col gap-12">
              {items.map((post, index) => (
                <PostCard
                  key={post.title}
                  post={post}
                  number={items.length - index}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
