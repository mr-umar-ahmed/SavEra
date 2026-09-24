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
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-50" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full border border-white/10 hover:bg-white/10 text-white/80 hover:text-white"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-emerald-400" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
