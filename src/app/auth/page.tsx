"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Droplet,
  Flame,
  Globe,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { DEMO_ACCOUNTS, DEMO_OTP, DEMO_PASSWORD } from "@/lib/auth/accounts";
import { roleDefaultPath } from "@/lib/auth/roles";
import { useSessionStore } from "@/stores/session";
import { SEED_USERS } from "@/data/seed/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Role } from "@/types";

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Please enter your email or mobile number"),
  password: z.string().min(1, "Please enter your password"),
});

type SelectedRoleCategory = "citizen" | "supervisor" | "gov";

export default function AuthPage() {
  const router = useRouter();
  const currentUser = useSessionStore((s) => s.user);
  const login = useSessionStore((s) => s.login);
  const verifyOtp = useSessionStore((s) => s.verifyOtp);
  const switchAccount = useSessionStore((s) => s.switchAccount);

  const [step, setStep] = useState<"login" | "otp">("login");
  const [selectedRole, setSelectedRole] = useState<SelectedRoleCategory>("citizen");
  const [govDept, setGovDept] = useState<"electricity" | "water" | "gas">("electricity");
  const [citizenVariant, setCitizenVariant] = useState<"primary" | "abnormal">("primary");

  const [identifier, setIdentifier] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  // 6-box OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["1", "2", "3", "4", "5", "6"]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemoTable, setShowDemoTable] = useState(false);

  // Pre-fill credentials based on selected role card
  const handleSelectRoleCard = (role: SelectedRoleCategory) => {
    setSelectedRole(role);
    setError(null);
    setStep("login");

    if (role === "citizen") {
      const acc = citizenVariant === "abnormal" ? DEMO_ACCOUNTS[1] : DEMO_ACCOUNTS[0];
      setIdentifier(acc.email);
      setPassword(DEMO_PASSWORD);
    } else if (role === "supervisor") {
      const acc = DEMO_ACCOUNTS[2];
      setIdentifier(acc.email);
      setPassword(DEMO_PASSWORD);
    } else if (role === "gov") {
      let acc = DEMO_ACCOUNTS[3];
      if (govDept === "water") acc = DEMO_ACCOUNTS[4];
      if (govDept === "gas") acc = DEMO_ACCOUNTS[5];
      setIdentifier(acc.email);
      setPassword(DEMO_PASSWORD);
    }
  };

  const handleCitizenVariantChange = (variant: "primary" | "abnormal") => {
    setCitizenVariant(variant);
    const acc = variant === "abnormal" ? DEMO_ACCOUNTS[1] : DEMO_ACCOUNTS[0];
    setIdentifier(acc.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const handleGovDeptChange = (dept: "electricity" | "water" | "gas") => {
    setGovDept(dept);
    const targetUserId =
      dept === "water"
        ? "u-gov-water"
        : dept === "gas"
        ? "u-gov-gas"
        : "u-gov-electricity";
    const acc = DEMO_ACCOUNTS.find((a) => a.userId === targetUserId);
    if (acc) {
      setIdentifier(acc.email);
      setPassword(DEMO_PASSWORD);
    }
    setError(null);
  };

  const handleQuickLogin = (userId: string) => {
    switchAccount(userId);
    const target = DEMO_ACCOUNTS.find((a) => a.userId === userId);
    const targetUser = SEED_USERS.find((u) => u.id === userId);
    if (target) {
      toast.success(`Signed in as ${target.label}`);
      router.push(roleDefaultPath(target.role, targetUser?.department));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Please check credentials");
      return;
    }

    setLoading(true);
    const res = login(identifier.trim(), password);
    setLoading(false);

    if (!res.ok) {
      if (
        res.error?.toLowerCase().includes("not found") ||
        res.error?.toLowerCase().includes("account")
      ) {
        setError("We couldn't find that account. Use one of the demo accounts below.");
      } else if (res.error?.toLowerCase().includes("password")) {
        setError("Incorrect password. Demo password is savera.");
      } else {
        setError(res.error || "Authentication failed");
      }
      return;
    }

    // Advance to OTP verification
    setStep("otp");
    // Pre-populate demo OTP for convenience
    setOtpDigits(["1", "2", "3", "4", "5", "6"]);
  };

  // OTP box change handler with auto-advance
  const handleOtpBoxChange = (index: number, val: string) => {
    setError(null);
    const char = val.slice(-1); // Only take latest char
    if (char && !/^\d$/.test(char)) return; // Only allow digits

    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    // Auto focus next box if character was entered
    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      const split = pasted.split("");
      setOtpDigits(split);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit OTP code.");
      return;
    }

    setLoading(true);
    const res = verifyOtp(fullCode);
    setLoading(false);

    if (!res.ok) {
      if (
        res.error?.toLowerCase().includes("invalid") ||
        res.error?.toLowerCase().includes("otp") ||
        res.error?.toLowerCase().includes("code")
      ) {
        setError("That code didn't match. Demo code is 123456.");
      } else {
        setError(res.error || "Invalid OTP code");
      }
      return;
    }

    const user = useSessionStore.getState().user;
    if (user) {
      toast.success(`Welcome back, ${user.name}`);
      router.push(roleDefaultPath(user.role, user.department));
    }
  };

  const handleResendOtp = () => {
    toast.success("Code resent (demo)");
    setOtpDigits(["1", "2", "3", "4", "5", "6"]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#050B08] text-white flex flex-col justify-between selection:bg-emerald-500/30">
      {/* Header */}
      <header className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#050B08]/80 backdrop-blur-md sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 text-[#050B08]" />
          </div>
          <span className="font-extrabold tracking-wider text-base text-white">
            SAV<span className="text-emerald-400">ERA</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Auth &amp; Access
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 font-mono hidden sm:inline-block">
            Raichur Municipal Demonstration
          </span>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white text-xs h-8">
              &larr; Back to Landing
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
        {/* Active Session Notification */}
        {currentUser && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    Active Session Detected
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  Logged in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.email})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => router.push(roleDefaultPath(currentUser.role, currentUser.department))}
                className="bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold h-8 w-full sm:w-auto gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <span>Continue to Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Headline */}
        <div className="mb-8 text-center">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Civic Identification Layer
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
            Access SAVERA Portal
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto mt-2">
            Select your administrative role or choose a seeded demonstration persona below.
          </p>
        </div>

        {/* 4.1 Role Cards (Verbatim copy from §4.1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 1. Citizen Role Card */}
          <button
            type="button"
            onClick={() => handleSelectRoleCard("citizen")}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "citizen"
                ? "border-emerald-500 bg-emerald-500/[0.08] shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole === "citizen"
                    ? "bg-emerald-500 text-black font-bold"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                <Zap className="h-5 w-5" />
              </div>
              {selectedRole === "citizen" && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Selected
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors mb-1.5">
              Citizen
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              &ldquo;Digitise your home, understand your electricity, water and LPG, and earn your Green Score.&rdquo;
            </p>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-emerald-400/80">
              <span>H-1024 / H-1088</span>
              <span>Ward 24</span>
            </div>
          </button>

          {/* 2. Area Supervisor Role Card */}
          <button
            type="button"
            onClick={() => handleSelectRoleCard("supervisor")}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "supervisor"
                ? "border-teal-500 bg-teal-500/[0.08] shadow-lg shadow-teal-500/10 ring-1 ring-teal-500"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole === "supervisor"
                    ? "bg-teal-500 text-black font-bold"
                    : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                }`}
              >
                <Users className="h-5 w-5" />
              </div>
              {selectedRole === "supervisor" && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Selected
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors mb-1.5">
              Area Supervisor (Councillor)
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              &ldquo;Monitor your ward, review AI-grouped alerts, verify on the ground and coordinate with departments.&rdquo;
            </p>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-teal-400/80">
              <span>Ward 24 Oversight</span>
              <span>4 Colonies</span>
            </div>
          </button>

          {/* 3. Government Department Role Card */}
          <button
            type="button"
            onClick={() => handleSelectRoleCard("gov")}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "gov"
                ? "border-cyan-500 bg-cyan-500/[0.08] shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole === "gov"
                    ? "bg-cyan-500 text-black font-bold"
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}
              >
                <Globe className="h-5 w-5" />
              </div>
              {selectedRole === "gov" && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Selected
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors mb-1.5">
              Government Department
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              &ldquo;City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas.&rdquo;
            </p>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-cyan-400/80">
              <span>City of Raichur</span>
              <span>3 Departments</span>
            </div>
          </button>
        </div>

        {/* Sub-variant Pills for Citizen and Gov Roles */}
        {selectedRole === "citizen" && (
          <div className="max-w-md mx-auto mb-6 flex items-center justify-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              type="button"
              onClick={() => handleCitizenVariantChange("primary")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                citizenVariant === "primary"
                  ? "bg-emerald-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Primary (H-1024, Priya)
            </button>
            <button
              type="button"
              onClick={() => handleCitizenVariantChange("abnormal")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                citizenVariant === "abnormal"
                  ? "bg-emerald-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Abnormal LPG (H-1088, Amit)
            </button>
          </div>
        )}

        {selectedRole === "gov" && (
          <div className="max-w-md mx-auto mb-6 flex items-center justify-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              type="button"
              onClick={() => handleGovDeptChange("electricity")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                govDept === "electricity"
                  ? "bg-amber-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Electricity</span>
            </button>
            <button
              type="button"
              onClick={() => handleGovDeptChange("water")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                govDept === "water"
                  ? "bg-teal-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Droplet className="h-3 w-3" />
              <span>Water Board</span>
            </button>
            <button
              type="button"
              onClick={() => handleGovDeptChange("gas")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                govDept === "gas"
                  ? "bg-rose-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>LPG Cell</span>
            </button>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="max-w-md mx-auto rounded-3xl border border-white/15 bg-[#070D0A]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          {/* Credentials Chip Banner */}
          <div className="mb-6 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                Demo
              </span>
              <span className="text-white/70 truncate">{identifier}</span>
              <span className="text-white/30">/</span>
              <span className="text-emerald-400 font-bold">{DEMO_PASSWORD}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${identifier} / ${DEMO_PASSWORD}`);
                toast.success("Credentials copied");
              }}
              title="Copy credentials"
              className="text-white/40 hover:text-white shrink-0 p-1"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === "login" ? (
            /* 4.2 Login Form */
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs pl-9 h-10 rounded-xl focus:border-emerald-500"
                    required
                  />
                  <Mail className="h-4 w-4 text-white/40 absolute left-3 top-3 pointer-events-none" />
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs pl-9 h-10 rounded-xl focus:border-emerald-500"
                    required
                  />
                  <Lock className="h-4 w-4 text-white/40 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-10 rounded-xl mt-3 shadow-lg shadow-emerald-500/20"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </form>
          ) : (
            /* 4.3 Demo 2FA OTP Form */
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="text-center">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-inner">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Enter the 6-digit code sent to your registered mobile.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-medium">
                  <span>Demo · code 123456</span>
                </div>
              </div>

              {/* 6 Individual Box Inputs */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 text-center">
                  Verification Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 sm:w-11 h-12 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-center text-lg font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-10 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                <span>Verify</span>
                <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
              </Button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-white/60 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Resend code (demo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setError(null);
                  }}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  &larr; Back to login
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                1-Click Demo Personas (Instant Access)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Bypass OTP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.userId}
                  type="button"
                  onClick={() => handleQuickLogin(acc.userId)}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-left text-xs transition-all group flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-white group-hover:text-emerald-300 truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">{acc.description}</div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-white/30 group-hover:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible Demo Accounts Table (§5 Reference) */}
        <div className="max-w-3xl mx-auto mt-8">
          <button
            type="button"
            onClick={() => setShowDemoTable(!showDemoTable)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors text-xs"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">Full Demo Accounts Table (§5 Reference)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                6 Personas
              </span>
            </div>
            {showDemoTable ? (
              <ChevronUp className="h-4 w-4 text-white/60" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/60" />
            )}
          </button>

          {showDemoTable && (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#070D0A]/90 p-4 animate-in fade-in">
              <table className="w-full text-left text-xs text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 font-mono text-[11px]">
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Login Identifier</th>
                    <th className="pb-3 font-semibold">Password</th>
                    <th className="pb-3 font-semibold">OTP</th>
                    <th className="pb-3 font-semibold">Scope</th>
                    <th className="pb-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <tr key={acc.userId} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans font-medium text-white">{acc.label}</td>
                      <td className="py-3 text-white/70">{acc.email}</td>
                      <td className="py-3 text-emerald-400">{acc.password}</td>
                      <td className="py-3 text-teal-400">{acc.otp}</td>
                      <td className="py-3 font-sans text-white/60 text-[10px]">{acc.description}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleQuickLogin(acc.userId)}
                          className="h-7 px-2.5 text-[10px] bg-white/10 hover:bg-emerald-500 hover:text-black font-semibold rounded-lg"
                        >
                          1-Click Login
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/5 text-center text-[11px] text-white/40 font-mono">
        SAVERA Hackathon Demonstration Prototype · Pure deterministic client simulation · Raichur
      </footer>
    </div>
  );
}
