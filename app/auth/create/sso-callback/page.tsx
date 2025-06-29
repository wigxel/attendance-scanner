"use client";

import { redirect } from "next/navigation";

export default function SSOCallback() {
  redirect('/auth');

  return null;
}
