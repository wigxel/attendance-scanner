"use client";

import { redirect } from "next/navigation";

export default function SSOCallback() {
  redirect("/auth");

  return (
    <div className="text-center">
      <p>Authenticating user</p>
    </div>
  );
}
