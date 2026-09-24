"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * Thin next-themes wrapper. The root layout mounts it with
 * `attribute="class" defaultTheme="dark" enableSystem={false}`.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export type { ThemeProviderProps };
