import type { Post } from "@prudentbird/voxx-core";
import Image from "next/image";
import Link from "next/link";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";

export type { Post };

type PostCardProps = {
  post: Post;
  /** Reverse index shown by the `numbered` variant. */
  number?: number;
  /** `numbered` is the editorial row; `item` is the blog-index card. */
  variant?: "numbered" | "item" | "compact";
};

export function PostCard({
  post,
  number = 0,
  variant = "numbered",
}: PostCardProps) {
  if (variant === "item") return <PostItem post={post} />;

  if (variant === "compact") return <PostCompact post={post} />;

  return (
    <Link href={post.url}>
      <section className="group relative pt-4">
        <div className="grid grid-cols-12">
          <span className="font-bold flex pointer-events-none group-hover:opacity-25 leading-[1ex] pt-2 font-mono -tracking-[0.8svw] select-none text-[12svw] top opacity-5 col-span-3">
            {String(number).padStart(2, "0")}
          </span>

          <div className="col-span-9">
            <h2 className="text-lg text-foreground font-medium group-hover:underline">
              {post.title}
            </h2>

            <p className="text-base text-pretty md:text-lg mb-3 text-muted-foreground">
              {post.description}
            </p>
          </div>
        </div>

        <div className="border-t border-(--border) my-4" />

        <div className="grid grid-cols-12">
          <div className="col-span-3" />

          <p className="flex col-span-9 gap-3 text-xs mb-2 justify-start text-muted-foreground w-full">
            <span className="font-mono">
              {DateParse.presets
                .dateOnly(post.date)
                .pipe(O.getOrElse(() => "--"))}
            </span>
            <span>•</span>
            <span className="font-mono">{post.category}</span>
          </p>
        </div>
      </section>
    </Link>
  );
}

type PostItemProps = { post: Post };

function PostItem({ post }: PostItemProps) {
  return (
    <Link href={post.url} className="group block py-6 text-inherit">
      {post.image ? (
        <Image
          src={post.image}
          alt={`${post.title} cover`}
          quality={100}
          width={200}
          height={200}
          unoptimized
          className="mb-6 w-full rounded"
        />
      ) : null}

      <div className="flex gap-4">
        <div className="basis-3/7 shrink-0">
          <h2 className="mb-1.5 text-xl font-semibold tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h2>

          <p className="mb-2 text-xs text-muted-foreground md:text-sm">
            <time dateTime={post.date}>
              {DateParse.presets
                .dateOnly(post.date)
                .pipe(O.getOrElse(() => "--"))}
            </time>
            {` · ${post.readingTimeMinutes} min read`}
          </p>
        </div>

        <div className="basis-4/7 shrink-0">
          {post.excerpt ? (
            <p className="mb-3 max-w-[45ch] text-xs leading-relaxed text-muted-foreground md:text-sm">
              {post.excerpt}
            </p>
          ) : null}

          {post.tags.length > 0 ? (
            <ul className="flex list-none flex-wrap gap-1.5 p-0">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full text-xs before:opacity-75 before:content-['#']"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PostCompact({ post }: PostCardProps) {
  return (
    <Link
      href={post.url}
      className="group py-6 text-inherit flex flex-col gap-8"
    >
      <div className="flex flex-col">
        <div className="basis-3/7 shrink-0">
          <h2 className="mb-1.5 text-xl font-semibold tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h2>
        </div>

        <div className="basis-4/7 shrink-0">
          {post.excerpt ? (
            <p className="mb-3 max-w-[45ch] text-xs leading-relaxed text-muted-foreground md:text-sm line-clamp-2">
              {post.excerpt}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="group-last:hidden border-[0.5px] [--b-color:#575771] w-full border-transparent"
        style={{
          borderImage: `repeating-linear-gradient(
            to right,
            var(--b-color) 0,
            var(--b-color) 13px,
            transparent 10px,
            transparent calc(13px + 7px)
          )
          1`,
        }}
      />
    </Link>
  );
}
