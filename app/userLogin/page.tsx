"use client";

import React, { useState } from "react";

export default function UserLogin() {
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<"signIn">("signIn");

  return (
    <section className="w-full h-screen flex justify-center items-center relative px-5 xl:p-0">
      {/* reservation */}
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
        <header className="flex flex-col justify-center items-center">
          <h3 className="text-xl">Welcome to</h3>
          <h1 className="text-5xl font-bold my-2">INSPACE</h1>
          <span className="my-4">Please log in to get started</span>
        </header>
      </div>
    </section>
  );
}
