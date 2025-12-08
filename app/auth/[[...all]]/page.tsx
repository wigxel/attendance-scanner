"use client";

import { SignIn, } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <h1 className="font-semibold text-3xl tracking-[-1.5px]">
        Welcome to InSpace
      </h1>

      <p>Please Log In to get started</p>

      <SignIn />
    </div>
  );
}
