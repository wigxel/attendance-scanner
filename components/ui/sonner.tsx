"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...restProps }: ToasterProps) => {
  // useTheme() reads localStorage on the client but not on the server, so the
  // theme must not reach the first (hydration) render — it changes
  // data-sonner-theme and causes a server/client mismatch (React error #418).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={(mounted ? theme : "system") as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...restProps}
    />
  );
};

export { Toaster };
