"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="size-10 opacity-60" disabled aria-label="Toggle theme">
        <Moon className="size-[1.1rem]" />
      </Button>
    );
  }

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-10 text-soft hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <Sun className="size-[1.1rem] text-amber-ink" /> : <Moon className="size-[1.1rem]" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
