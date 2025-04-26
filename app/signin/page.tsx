"use client";

import { useState } from "react";
import SignInForm from "../../components/SignInForm";
import SignUpForm from "../../components/SignUpForm";

export default function SignIn() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  const toggleFlow = () => setFlow(flow === "signIn" ? "signUp" : "signIn");

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <h1 className="font-semibold text-3xl tracking-[-1.5px]">
        Welcome to InSpace
      </h1>

      <p>
        Please Log In to get started
      </p>

      {flow === "signIn" ? (
        <SignInForm onError={setError} onToggleFlow={toggleFlow} />
      ) : (
        <SignUpForm onError={setError} onToggleFlow={toggleFlow} />
      )}
    </div>
  );
}
