import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

/**
 * Frame for /login and /signup: one centred card, nothing to navigate away to.
 * The reassurance line under the card is deliberate — this is a civic service,
 * and people should be able to see what it will and will not do with the data
 * before they hand any over.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 px-safe">
      <Link href="/" className="focus-ring mb-8 rounded-lg">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card">
        {children}
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        Your readings stay yours. Ward figures are only ever shown as averages across ten or
        more households.
      </p>
    </div>
  );
}
