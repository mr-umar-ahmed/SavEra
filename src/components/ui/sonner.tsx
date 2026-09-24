"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Theme-aware sonner toaster in the SAVERA glass style. Mounted once in the root layout. */
function Toaster({ toastOptions, ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const theme: ToasterProps["theme"] = resolvedTheme === "light" ? "light" : "dark";

  return (
    <Sonner
      theme={theme}
      richColors
      closeButton
      position="top-right"
      className="toaster group"
      toastOptions={{
        ...toastOptions,
        className: "glass rounded-2xl font-sans shadow-2xl",
        classNames: {
          title: "font-semibold",
          description: "text-muted-foreground",
          actionButton: "rounded-full font-bold",
          cancelButton: "rounded-full",
          ...toastOptions?.classNames,
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "1.5rem",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
