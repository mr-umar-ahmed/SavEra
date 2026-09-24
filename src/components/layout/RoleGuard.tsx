"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types";
import { useSessionStore } from "@/stores/session";
import { canAccessRole } from "@/lib/auth/roles";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  role: Role;
  children: React.ReactNode;
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const mounted = useHasMounted();

  const isAuthorized = canAccessRole(user, role);

  useEffect(() => {
    if (mounted && !isAuthorized) {
      router.replace("/auth");
    }
  }, [mounted, isAuthorized, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground animate-pulse text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Validating access credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-rose-500/10 p-4 mb-4 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          This portal section requires a <span className="capitalize font-semibold text-emerald-400">{role}</span> profile. Redirecting to authentication...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
