"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { CircularButton } from "@/components/circular-button";
import type { Post } from "@/components/post-card";
import { PostCard } from "@/components/post-card";

type TopArticlesSectionProps = {
  posts: Post[];
};

export function TopArticlesSection({ posts }: TopArticlesSectionProps) {
  if (posts.length === 0) return null;

  return (
    <div id="blog" className="overflow-x-clip bg-background">
      <div className="container mx-auto py-24 [--heading-height:4.12rem] px-4">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6">
            <div className="grid grid-cols-6 bottom-0 items-end sticky top-0 w-full h-screen">
              <h3 className="col-span-3 self-start sticky top-(--sticky-top) font-heading z-20 text-6xl font-black">
                <Balancer>
                  <span>Stories For&nbsp;</span>
                  <br />
                  <span className="text-cyan-500">True Makers</span>
                </Balancer>
              </h3>

              <Link
                href="/blog"
                className="inline-block z-5 relative bottom-0 translate-y-8/12 col-span-3"
              >
                <CircularButton
                  text="see more exploration"
                  className="transition-default"
                  variant="outline"
                />
              </Link>
            </div>
          </div>

          <div className="grid gap-(--post-gap) [--post-gap:--spacing(12)] grid-cols-1 relative grid-rows-1 col-span-6">
            <motion.div
              className="*:flex-1 flex *:pt-0!"
              initial={{ opacity: 0, y: "12.5%" }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <PostCard variant="item" post={posts[0]} />
            </motion.div>

            <motion.ul
              className="flex flex-col gap-(--post-gap) [&>li>*]:pt-0!"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                visible: {
                  transition: { staggerChildren: 0.15, delayChildren: 0.15 },
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
                      showImage={true}
                      number={posts.length - index}
                      isLast={false}
                    />
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        </div>
      </div>
    </div>
  );
}
