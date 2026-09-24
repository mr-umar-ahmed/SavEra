"use client";

import { LogOut, MapPin, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authErrorMessage, createClient } from "@/lib/supabase/client";

export interface AccountMenuProps {
  name: string | null;
  email: string;
  wardName: string | null;
  role?: string;
}

/** Two letters for the avatar: initials when we have a name, else the email. */
export function initialsFor(name: string | null, email: string): string {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]!.toUpperCase()).join("");
  }
  return email.slice(0, 2).toUpperCase();
}

export function AccountMenu({ name, email, wardName, role }: AccountMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (err) {
      toast.error(authErrorMessage(err));
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="focus-ring touch-target rounded-full"
          aria-label="Your account"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary">
              {initialsFor(name, email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate font-semibold">{name ?? "Your household"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
          {wardName ? (
            <p className="flex items-center gap-1 pt-1 text-xs font-normal text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {wardName}
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden />
            Profile &amp; appliances
          </Link>
        </DropdownMenuItem>
        {role === "supervisor" || role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/supervisor">
              <Shield aria-hidden />
              Supervisor dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
          <LogOut aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
