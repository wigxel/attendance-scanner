"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { CircularButton } from "@/components/circular-button";
import type { Post } from "@/components/post-card";
import { PostCard } from "@/components/post-card";

type TopArticlesSectionProps = {
  /** Newest first; only the first four are shown. */
  posts: Post[];
};

export function TopArticlesSection({ posts }: TopArticlesSectionProps) {
  if (posts.length === 0) return null;

  return (
    <div id="blog" className="overflow-x-clip bg-background">
      <div className="container mx-auto py-24 [--heading-height:4.12rem] px-4">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-1" />

          <h3 className="font-heading text-6xl font-black relative col-span-11">
            <span>Stories For The</span>
            <motion.div
              initial={{ opacity: 0, x: "-15%" }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 1 }}
              className="text-cyan-500 absolute inset-bs-0 inset-s-0 rotate-90 origin-top-left translate-y-24 -translate-x-8"
            >
              Builders
            </motion.div>
          </h3>

          <div className="col-span-1" />

          <div className="grid gap-10 grid-cols-[1fr_0.6fr] relative grid-rows-1 col-span-10">
            <motion.div
              className="*:flex-1 flex *:pt-0!"
              initial={{ opacity: 0, y: "12.5%" }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 1 }}
            >
              <PostCard variant="item" post={posts[0]} />
            </motion.div>

            <motion.ul
              className="flex flex-col gap-4 [&>li>*]:pt-0!"
              initial="hidden"
              whileInView="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.15, delayChildren: 3 },
                },
              }}
            >
              {posts.slice(1).map((post, index) => {
                return (
                  <motion.li
                    key={post.slug}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.6, ease: "easeOut" },
                      },
                    }}
                  >
                    <PostCard
                      variant="compact"
                      post={post}
                      number={posts.length - index}
                      isLast={posts.length - 2 === index}
                    />
                  </motion.li>
                );
              })}
            </motion.ul>

            <div className="absolute inset-e-0 inset-be-0 translate-y-1/2 translate-x-1/2">
              <Link href="/blog" className="inline-block">
                <CircularButton
                  text="see more exploration"
                  className="animate-spin animation-duration-[120s] transition-default"
                  variant="outline"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
