import { buildSeo, serializeJsonLd } from "@prudentbird/voxx-core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConfig, getPost, getReachablePosts } from "../_voxx/data";
import { toMetadata } from "../_voxx/metadata";
import { PostPage } from "../_voxx/post-page";

type Params = { params: Promise<{ slug: string }> };

export const maxDuration = 1000 * 60 * 60 * 12;

export async function generateStaticParams() {
  const posts = await getReachablePosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPost(slug), getConfig()]);
  if (!post) return {};
  return toMetadata(buildSeo(post, config));
}

export default async function PostRoute({ params }: Params) {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPost(slug), getConfig()]);
  if (!post) notFound();

  const seo = buildSeo(post, config);

  return (
    <>
      {config.seo.jsonLd && seo.jsonLd ? (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Intentional
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(seo.jsonLd) }}
        />
      ) : null}
      <PostPage post={post} config={config} />
    </>
  );
}
