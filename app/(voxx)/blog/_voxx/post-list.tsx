import type { Post } from "@prudentbird/voxx-core";
import { PostCard } from "@/components/post-card";

type PostListProps = { posts: Post[] };

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-muted-foreground">
        <p>No posts yet.</p>
        <p>
          Add a Markdown file to your content folder, or run{" "}
          <code>voxx new &quot;My post&quot;</code> to scaffold one.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex list-none flex-col p-0">
      {posts.map((post) => (
        <li key={post.slug} className="border-t border-border first:border-t-0">
          <PostCard post={post} variant="item" />
        </li>
      ))}
    </ul>
  );
}
