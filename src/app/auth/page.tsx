"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Flame,
  Globe,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_OTP, DEMO_PASSWORD } from "@/lib/auth/accounts";
import { roleDefaultPath } from "@/lib/auth/roles";
import { useSessionStore } from "@/stores/session";
import { SEED_USERS } from "@/data/seed/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);
  const verifyOtp = useSessionStore((s) => s.verifyOtp);
  const switchAccount = useSessionStore((s) => s.switchAccount);

  const [step, setStep] = useState<"login" | "otp">("login");
  const [identifier, setIdentifier] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [otp, setOtp] = useState(DEMO_OTP);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (userId: string) => {
    switchAccount(userId);
    const target = DEMO_ACCOUNTS.find((a) => a.userId === userId);
    const targetUser = SEED_USERS.find((u) => u.id === userId);
    if (target) {
      router.push(roleDefaultPath(target.role, targetUser?.department));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = login(identifier, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Authentication failed");
      return;
    }

    setStep("otp");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = verifyOtp(otp);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Invalid OTP code");
      return;
    }

    const user = useSessionStore.getState().user;
    if (user) {
      router.push(roleDefaultPath(user.role, user.department));
    }
  };

  return (
    <div className="min-h-screen bg-[#050B08] text-white flex flex-col justify-between selection:bg-emerald-500/30">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-4 w-4 text-[#050B08]" />
          </div>
          <span className="font-extrabold tracking-wider text-base text-white">
            SAV<span className="text-emerald-400">ERA</span>
          </span>
        </Link>
        <span className="text-xs text-white/50 font-mono">Demo Environment · Raichur</span>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        {/* Role Cards Overview */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Access Portal</h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto">
            Select a verified persona or authenticate with your municipal credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
              <Zap className="h-4 w-4" />
              <span>Citizen</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Digitise your home, understand your electricity, water and LPG, and earn your Green Score.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm mb-1">
              <Users className="h-4 w-4" />
              <span>Area Supervisor (Councillor)</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Monitor your ward, review AI-grouped alerts, verify on the ground and coordinate with departments.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
              <Globe className="h-4 w-4" />
              <span>Government Department</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas.
            </p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. citizen@savera.demo or 9000000001"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs pl-9"
                    required
                  />
                  <Mail className="h-4 w-4 text-white/40 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs pl-9"
                    required
                  />
                  <Lock className="h-4 w-4 text-white/40 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] text-white/40 mt-1">Default demo password: <span className="font-mono text-emerald-400">savera</span></p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 mt-2"
              >
                <span>Continue with 2FA</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Enter Demo 2FA Code</h3>
                <p className="text-xs text-white/50 mt-0.5">Two-factor verification simulation</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5 text-center">
                  Verification Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-center font-mono text-lg tracking-widest h-11"
                  required
                />
                <p className="text-[11px] text-center text-white/40 mt-1.5">
                  Demo 2FA OTP code: <span className="font-mono font-bold text-emerald-400">123456</span>
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9"
              >
                <span>Verify & Enter Portal</span>
                <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
              </Button>

              <button
                type="button"
                onClick={() => setStep("login")}
                className="w-full text-center text-[11px] text-white/50 hover:text-white transition-colors"
              >
                ← Back to credentials
              </button>
            </form>
          )}

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-2.5">
              1-Click Demo Personas (Instant Bypass)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.userId}
                  type="button"
                  onClick={() => handleQuickLogin(acc.userId)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/5 text-left text-xs transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-white group-hover:text-emerald-300 truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">{acc.description}</div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-white/40 group-hover:text-emerald-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 text-center text-[11px] text-white/40">
        SAVERA Hackathon Demonstration Prototype · Pure deterministic client simulation
      </div>
    </div>
  );
}
