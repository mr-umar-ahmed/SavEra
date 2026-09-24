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
          className="h-8 gap-2 border-white/10 bg-[#0A0F0D] text-xs font-medium text-white/90 hover:bg-white/10 rounded-full px-3"
        >
          <UserCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="max-w-[130px] truncate">{currentAccount.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-[#0A0F0D]/95 border-white/15 backdrop-blur-xl text-white">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-emerald-400 font-mono">
          Switch Demo Persona
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {DEMO_ACCOUNTS.map((account) => {
          const isActive = account.userId === user?.id;
          return (
            <DropdownMenuItem
              key={account.userId}
              onClick={() => handleSelect(account.userId)}
              className={`flex flex-col items-start gap-0.5 p-2.5 cursor-pointer rounded-lg transition-colors ${
                isActive ? "bg-emerald-500/15 text-emerald-300" : "hover:bg-white/10 text-white/80"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs text-white">{account.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <span className="text-[11px] text-white/50">{account.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
