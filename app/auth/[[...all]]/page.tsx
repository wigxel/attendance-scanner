import { SignIn } from "@clerk/nextjs";
import { Posts } from "@/app/posts";
import { Footer } from "@/components/footer";

export default async function SignInPage() {
  return (
    <div className="relative">
      <section className="relative w-[calc(100svw-52px)] mt-4 mx-auto">
        <div className="scanline-container" />

        <div className="flex flex-col py-12 gap-8 w-96 mx-auto min-h-[85svh] justify-center items-center">
          <h1 className="font-semibold font-heading text-3xl tracking-[-1.5px]">
            Welcome to InSpace
          </h1>

          <p className="text-muted-foreground">Please log In to get started</p>

          <SignIn />
        </div>
      </section>

      <div className="mt-[-5svh]">
        <Posts />
      </div>

      <Footer />
    </div>
  );
}
