"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { AreaMap } from "@/components/maps";
import { AREAS } from "@/data/geo/raichur";
import { getWaterPipelinePolylines, getWaterInfrastructureMarkers } from "@/data/geo/waterPipelines";

export default function SupervisorWaterDashboard() {
  const areas = [
    {
      id: "area-xyz",
      name: "XYZ Colony",
      status: "High",
      tone: "danger" as const,
      reports: 78,
      stage: "Pending",
      caseId: "case-xyz-001",
    },
    {
      id: "area-abc",
      name: "ABC Colony",
      status: "Moderate",
      tone: "warning" as const,
      reports: 34,
      stage: "In Progress",
      caseId: "case-abc-001",
    },
    {
      id: "area-def",
      name: "DEF Colony",
      status: "Normal",
      tone: "normal" as const,
      reports: 12,
      stage: "Verified",
      caseId: "case-def-001",
    },
    {
      id: "area-ghi",
      name: "GHI Colony",
      status: "High",
      tone: "danger" as const,
      reports: 56,
      stage: "Pending",
      caseId: "case-ghi-001",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Water Operations"
        subtitle="Monitor area supply schedules, triage AI-grouped citizen pressure reports, and coordinate field verification teams."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-ink bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
              Ward 24
            </span>
            <span className="text-xs font-mono text-muted-foreground">4 Localities Under Watch</span>
          </div>
        }
        actions={
          <Link href="/supervisor/water/verified">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border bg-muted hover:bg-secondary text-xs text-teal-ink rounded-xl"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-ink" />
              <span>Verified Reports &amp; Dept Updates</span>
            </Button>
          </Link>
        }
      />

      {/* 6.1 Exact KPIs matching §6.1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Assigned Areas"
          value="12"
          subtitle="Ward 24 coverage"
          badge={<StatusBadge status="normal" label="Covered" />}
        />
        <KpiCard
          title="Active Water Concerns"
          value="5"
          subtitle="Grouped supply issues"
          badge={<StatusBadge status="warning" label="Active" />}
        />
        <KpiCard
          title="Pending Verification"
          value="3"
          subtitle="Awaiting field assignment"
          badge={<StatusBadge status="warning" label="Pending" />}
        />
        <KpiCard
          title="Field Teams Available"
          value="6"
          subtitle="GPS-enabled assistants"
          badge={<StatusBadge status="normal" label="Available" />}
        />
        <KpiCard
          title="Reports Verified Today"
          value="8"
          subtitle="Validated on ground"
          badge={<StatusBadge status="complete" label="Verified" />}
        />
      </div>

      {/* Ward 24 Real Water Pipeline & SCADA Map Visualizer */}
      <div className="rounded-3xl border border-border bg-card p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-teal-400 animate-pulse" />
              <h3 className="text-base font-bold text-foreground">
                Ward 24 Water Supply Pipeline Grid &amp; Pressure Telemetry Map
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live geographic visualization: Feeders 4A–4D from OHT Gandhi Nagar (2.2 ML) to local distribution mains.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono px-2.5 py-1 rounded-full bg-destructive/15 text-destructive font-bold border border-destructive/30 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="size-3" />
              <span>DM-4B: 0.4 bar Incident Active</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border shadow-inner">
          <AreaMap
            features={AREAS.filter((a) => a.wardId === "ward-24").map((a) => ({
              id: a.id,
              name: a.name,
              polygon: a.polygon,
              tone: a.id === "area-xyz" ? "critical" : a.id === "area-ghi" ? "moderate" : "normal",
              label:
                a.id === "area-xyz"
                  ? "78 Reports · Depressurized Line"
                  : a.id === "area-ghi"
                  ? "56 Reports · Field Verification Active"
                  : "Normal Supply Window",
              value: a.id === "area-xyz" ? "0.4 bar" : a.id === "area-ghi" ? "1.1 bar" : "2.1 bar",
              href: `/supervisor/water/areas/${a.id}`,
            }))}
            polylines={getWaterPipelinePolylines(true)}
            markers={[
              ...getWaterInfrastructureMarkers(true),
              {
                id: "fa-arif-pos",
                position: [16.166, 77.381],
                tone: "moderate",
                label: "Field Assistant Arif (GPS On)",
                value: "GHI Colony 4th Cross",
                details: "Inspecting distribution valve & pressure gauge.",
                radius: 7,
              },
            ]}
            center={[16.173, 77.376]}
            zoom={14}
            height={380}
            showLayerToggle
            legend={[
              { tone: "critical", label: "Critical Depressurization: Line 4B / Case XYZ-001 (0.4 bar)" },
              { tone: "moderate", label: "Moderate Drop: Line 4D / Case GHI-001 (1.1 bar)" },
              { tone: "normal", label: "Normal Delivery Pressure (2.0–2.4 bar)" },
              { tone: "optimal", label: "Optimal Delivery Head (2.5+ bar)" },
            ]}
          />
        </div>
      </div>

      {/* Area Table matching §6.1 */}
      <div className="rounded-3xl border border-border bg-card p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Ward Localities &amp; Report Triage</h3>
            <p className="text-xs text-muted-foreground">Aggregates and counts only — no household data.</p>
          </div>
          <span className="text-xs font-mono text-faint">4 Key Sectors</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-soft">
            <thead>
              <tr className="border-b border-border text-faint font-mono text-xs">
                <th className="pb-3 font-semibold">Area</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Citizen Reports</th>
                <th className="pb-3 text-right font-semibold">Stage</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {areas.map((a) => (
                <tr key={a.id} className="hover:bg-muted/60">
                  <td className="py-3.5 font-sans font-bold text-foreground">
                    <Link
                      href={`/supervisor/water/areas/${a.id}`}
                      className="hover:text-teal-ink transition-colors"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={a.tone} label={a.status} />
                  </td>
                  <td className="py-3.5 text-right font-bold text-foreground">{a.reports}</td>
                  <td className="py-3.5 text-right text-soft">{a.stage}</td>
                  <td className="py-3.5 text-right">
                    <Link href={`/supervisor/water/areas/${a.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-teal-ink hover:text-teal-ink font-semibold"
                      >
                        Area Report &rarr;
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6.2 AI Water Supply Alerts matching §6.2 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-ink" />
            <span>AI Water Supply Alerts</span>
          </h3>
          <span className="text-xs font-mono text-muted-foreground">Human in the Loop</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 🔴 HIGH · XYZ Colony */}
          <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/[0.03] backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-rose-ink uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>🔴 HIGH · XYZ Colony</span>
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-ink">
                  78 households
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="text-soft">
                  Planned supply: <strong className="font-mono text-foreground">7:00–8:00 AM</strong> · Availability significantly below expected · Frequency: High · Historical: Below normal.
                </p>
                <div className="p-3 rounded-xl bg-inset border border-border/60 text-xs text-rose-ink/90 leading-relaxed font-mono">
                  AI assessment: Possible supply-demand gap. Field verification required.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center gap-3">
              <Link href="/supervisor/water/cases/case-xyz-001" className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-9 rounded-xl">
                  Open Case
                </Button>
              </Link>
              <Link href="/supervisor/water/areas/area-xyz">
                <Button
                  variant="outline"
                  className="border-border-strong bg-muted hover:bg-secondary text-xs text-foreground h-9 rounded-xl px-4"
                >
                  View Area Report
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: 🔴 HIGH · GHI Colony */}
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-muted/60 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-rose-ink uppercase tracking-wider">
                  🔴 HIGH · GHI Colony
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-secondary text-soft">
                  56 households
                </span>
              </div>
              <p className="text-xs text-soft">
                Planned supply: 6:30–7:30 AM · Field verification assigned to <strong className="text-foreground">Arif Khan</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-faint font-mono">Status: Verification Assigned</span>
              <Link href="/supervisor/water/cases/case-ghi-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-teal-ink">
                  Open Case &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 3: 🟡 MODERATE · ABC Colony */}
          <div className="p-6 rounded-3xl border border-amber-500/20 bg-muted/60 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-amber-ink uppercase tracking-wider">
                  🟡 MODERATE · ABC Colony
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-secondary text-soft">
                  34 households
                </span>
              </div>
              <p className="text-xs text-soft">
                Planned supply: 7:30–8:30 AM · Field verification in progress with <strong className="text-foreground">Suresh M</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-faint font-mono">Status: In Progress</span>
              <Link href="/supervisor/water/cases/case-abc-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-teal-ink">
                  Open Case &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 4: 🟢 NORMAL · DEF Colony */}
          <div className="p-6 rounded-3xl border border-positive/20 bg-muted/60 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-positive uppercase tracking-wider">
                  🟢 NORMAL · DEF Colony
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-secondary text-soft">
                  12 households
                </span>
              </div>
              <p className="text-xs text-soft">
                Planned supply: 8:00–9:00 AM · Full pressure confirmed on ground.
              </p>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-positive font-mono">Status: Verified</span>
              <Link href="/supervisor/water/cases/case-def-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-positive">
                  View Log &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
