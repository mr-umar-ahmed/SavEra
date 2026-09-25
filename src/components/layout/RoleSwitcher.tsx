"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, UserCircle2 } from "lucide-react";
import { DEMO_ACCOUNTS } from "@/lib/auth/accounts";
import { roleDefaultPath } from "@/lib/auth/roles";
import { useSessionStore } from "@/stores/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function RoleSwitcher() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const switchAccount = useSessionStore((s) => s.switchAccount);

  const handleSelect = (userId: string) => {
    switchAccount(userId);
    const target = DEMO_ACCOUNTS.find((a) => a.userId === userId);
    if (target) {
      const path = roleDefaultPath(target.role);
      router.push(path);
    }
  };

  const currentAccount = DEMO_ACCOUNTS.find((a) => a.userId === user?.id) ?? DEMO_ACCOUNTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 px-4 text-sm font-semibold"
        >
          <UserCircle2 className="size-[1.1rem] text-positive" />
          <span className="hidden max-w-[160px] truncate md:inline">{currentAccount.label}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover border-border-strong text-foreground">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.14em] text-primary font-mono">
          Switch Demo Persona
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {DEMO_ACCOUNTS.map((account) => {
          const isActive = account.userId === user?.id;
          return (
            <DropdownMenuItem
              key={account.userId}
              onClick={() => handleSelect(account.userId)}
              className={`flex flex-col items-start gap-0.5 p-2.5 cursor-pointer rounded-lg transition-colors ${
                isActive ? "bg-positive-soft text-positive" : "hover:bg-secondary text-soft"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-sm text-foreground">{account.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-positive" />}
              </div>
              <span className="text-xs text-muted-foreground">{account.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
