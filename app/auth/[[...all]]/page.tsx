import { SignIn } from "@clerk/nextjs";
import { Posts } from "@/app/posts";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SignInPage() {
  return (
    <div className="relative">
      <section className="relative md:w-[calc(100svw-52px)] pt-12 md:pt-0 md:mt-4 mx-auto">
        <div className="scanline-container" />

        <div className="flex flex-col py-12 gap-8 w-full max-w-96 mx-auto min-h-[85svh] justify-center items-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-semibold font-heading text-xl">
              InSpace Co-work
            </h1>

            <p className="text-muted-foreground">Sign in to get started</p>
          </div>

          <SignIn fallback={<Skeleton className="max-w-[402px] w-full aspect-[402/479]"></Skeleton>} />
        </div>
      </section>

      <div className="mt-[-5svh]">
        <Posts />
      </div>

      <Footer />
    </div>
  );
}
