"use client";

import { MonitorIcon, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  // useTheme() reads localStorage on the client but not on the server, so the
  // stored theme must not reach the first (hydration) render — it causes a
  // server/client mismatch (React error #418). See next-themes docs.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Select value={mounted ? theme : undefined} onValueChange={setTheme}>
      <SelectTrigger className="h-7 w-fit gap-1 border-none px-2 text-[1em] shadow-none">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="light">
          <Sun className="mr-2 h-4 w-4" />
          Light
        </SelectItem>
        <SelectItem value="dark">
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </SelectItem>
        <SelectItem value="system">
          <MonitorIcon className="mr-2 h-4 w-4" />
          System
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
