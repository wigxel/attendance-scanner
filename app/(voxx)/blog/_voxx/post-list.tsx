import type { Post, VoxxConfig } from "@prudentbird/voxx-core";
import { formatDate } from "@prudentbird/voxx-core";
import Image from "next/image";
import Link from "next/link";

export function PostList({
  posts,
  config,
}: {
  posts: Post[];
  config: VoxxConfig;
}) {
  if (posts.length === 0) {
    return (
      <div className="voxx-empty">
        <p>No posts yet.</p>
        <p>
          Add a Markdown file to your content folder, or run{" "}
          <code>voxx new &quot;My post&quot;</code> to scaffold one.
        </p>
      </div>
    );
  }

  return (
    <ul className="">
      {posts.map((post) => (
        <li key={post.slug} className="voxx-postcard">
          <Link href={post.url} className="voxx-postcard__link z-20 relative">
            {post.image ? (
              <Image
                src={post.image}
                alt={`${post.title} cover`}
                width={200}
                height={200}
                className="w-full mb-6 rounded"
              />
            ) : null}

            <div className="flex gap-4">
              <div className="basis-3/7 shrink-0">
                <h2 className="voxx-postcard__title mt-8">{post.title}</h2>
                <p className="voxx-postcard__meta text-xs md:text-sm">
                  <time dateTime={post.date}>
                    {formatDate(post.date, config.site.locale)}
                  </time>
                  {config.features.readingTime ? (
                    <span>{` · ${post.readingTimeMinutes} min read`}</span>
                  ) : null}
                </p>
              </div>

              <div className="basis-4/7 flex-shrink-0">
                {post.excerpt ? (
                  <p className="voxx-postcard__excerpt text-xs md:text-sm max-w-[45ch]">
                    {post.excerpt}
                  </p>
                ) : null}

                {config.features.tags && post.tags.length > 0 ? (
                  <ul className="voxx-tags">
                    {post.tags.map((tag) => (
                      <li key={tag} className="voxx-tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
