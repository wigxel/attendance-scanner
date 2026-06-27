import "server-only";
import {
  getPosts as coreGetPosts,
  loadConfig as coreLoadConfig,
  findPost,
  type Post,
  type VoxxConfig,
} from "@prudentbird/voxx-core";
import { cacheLife } from "next/cache";
import { CONTENT_VERSION } from "./content-version";

async function getPostsCached(version: number): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  void version;
  return coreGetPosts({ collection: "blog" });
}

export async function getPosts(): Promise<Post[]> {
  return getPostsCached(CONTENT_VERSION);
}

async function getReachablePostsCached(version: number): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  void version;
  return coreGetPosts({ ...{ collection: "blog" }, reachable: true });
}

export async function getReachablePosts(): Promise<Post[]> {
  return getReachablePostsCached(CONTENT_VERSION);
}

async function getConfigCached(version: number): Promise<VoxxConfig> {
  "use cache";
  cacheLife("max");
  void version;
  return coreLoadConfig();
}

export async function getConfig(): Promise<VoxxConfig> {
  return getConfigCached(CONTENT_VERSION);
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getReachablePosts();
  return findPost(posts, slug) ?? null;
}
