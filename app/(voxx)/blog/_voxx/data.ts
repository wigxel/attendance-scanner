import "server-only";
import {
  getPosts as coreGetPosts,
  loadConfig as coreLoadConfig,
  findPost,
  type Post,
  type VoxxConfig,
} from "@prudentbird/voxx-core";
import { cache } from "react";
import { CONTENT_VERSION } from "./content-version";

const getPostsCached = cache(async function getPostsCached(
  version: number,
): Promise<Post[]> {
  void version;
  return coreGetPosts({ collection: "blog" });
});

export async function getPosts(): Promise<Post[]> {
  return getPostsCached(CONTENT_VERSION);
}

const getReachablePostsCached = cache(async function getReachablePostsCached(
  version: number,
): Promise<Post[]> {
  void version;
  return coreGetPosts({ ...{ collection: "blog" }, reachable: true });
});

export async function getReachablePosts(): Promise<Post[]> {
  return getReachablePostsCached(CONTENT_VERSION);
}

const getConfigCached = cache(async function getConfigCached(
  version: number,
): Promise<VoxxConfig> {
  void version;
  return coreLoadConfig();
});

export async function getConfig(): Promise<VoxxConfig> {
  return getConfigCached(CONTENT_VERSION);
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getReachablePosts();
  return findPost(posts, slug) ?? null;
}
