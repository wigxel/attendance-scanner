"use client";

import { useEffect, useState } from "react";

function greetTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

// ponytail: client-only render on purpose — the hour boundary differs between
// the SSR server (UTC) and the user's timezone, so any server-rendered text
// hydration-matches as React error #418 near noon/evening.
interface GreetingProps {
  className?: string;
}

export function Greeting({ className }: GreetingProps) {
  const [text, setText] = useState("");
  useEffect(() => setText(greetTime()), []);
  return <span className={className}>{text}</span>;
}
