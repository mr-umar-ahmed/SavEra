"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  FileCheck,
  Flame,
  Globe,
  KeyRound,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DataIntegrationPage() {
  const [connected, setConnected] = useState({
    gescom: true,
    water: false,
    lpg: true,
  });

  const handleConnect = (key: keyof typeof connected) => {
    setConnected((prev) => ({ ...prev, [key]: true }));
    toast.success("Consent authenticated! Simulated data successfully synchronized.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Consent-Based Data Integration"
        subtitle="Secure, consent-driven synchronization with municipal utility portals and domestic smart meters."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="simulation" label="Integration-Ready · Simulated" />
            <span className="text-xs font-mono text-muted-foreground">DigiLocker / API Setu Model</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Electricity Board */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-ink mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Electricity Department (Raichur)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Imports 12-month billing history, meter serial number, and sanctioned load tier.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60">
            {connected.gescom ? (
              <div className="flex items-center gap-1.5 text-xs text-positive font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Connected (Consumer #90042)</span>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect("gescom")}
                className="w-full bg-muted hover:bg-secondary text-foreground text-xs h-8"
              >
                Connect Account
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Water Board */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-ink mb-4">
              <Droplet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Water Supply Board</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Syncs ward feeder schedule, pipeline maintenance alerts, and municipal water tax status.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60">
            {connected.water ? (
              <div className="flex items-center gap-1.5 text-xs text-positive font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Connected (Ward 24 Feeder)</span>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect("water")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold h-8"
              >
                Grant Consent & Connect
              </Button>
            )}
          </div>
        </div>

        {/* Card 3: LPG Provider */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-ink mb-4">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">LPG Distributor (Indane)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Syncs domestic booking history, SV consumer number, and booking confirmation status.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60">
            {connected.lpg ? (
              <div className="flex items-center gap-1.5 text-xs text-positive font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Connected (LPG-00918)</span>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect("lpg")}
                className="w-full bg-muted hover:bg-secondary text-foreground text-xs h-8"
              >
                Connect Account
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/60 bg-muted/60 text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-positive shrink-0" />
        <span>
          Data governance note: All connectors operate within a simulated DigiLocker sandbox. No actual production credentials or third-party APIs are contacted.
        </span>
      </div>
    </div>
  );
}
