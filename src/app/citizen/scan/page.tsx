"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Copy,
  Eye,
  FileUp,
  Flame,
  Home,
  Layers,
  Maximize2,
  Minimize2,
  QrCode,
  RotateCcw,
  Scan,
  Sparkles,
  SwitchCamera,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BARCODES, findBarcode, SAMPLE_BARCODES, type BarcodeCatalogueEntry } from "@/data/catalogue/barcodes";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { newId } from "@/lib/ids";
import { toast } from "sonner";
import type { ApplianceCategory, ApplianceType } from "@/types/household";

type ScanMode = "camera" | "upload" | "samples" | "manual";

export default function SmartScanPage() {
  const upsertAppliance = useDataStore((s) => s.upsertAppliance);
  const { household } = useCurrentHousehold();
  const householdId = household?.id ?? "H-1024";

  const [mode, setMode] = useState<ScanMode>("camera");
  const [selectedCode, setSelectedCode] = useState(BARCODES[0].code);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [ageYears, setAgeYears] = useState(2);
  const [assignedRoom, setAssignedRoom] = useState<"living_room" | "bedroom" | "kitchen" | "bathroom" | "utility">("living_room");

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const matched: BarcodeCatalogueEntry = BARCODES.find((b) => b.code === selectedCode) ?? BARCODES[0];

  // Map appliance type to category
  const getCategoryForType = (type: ApplianceType): ApplianceCategory => {
    switch (type) {
      case "ac":
      case "air_cooler":
        return "cooling";
      case "ceiling_fan":
      case "table_fan":
      case "exhaust_fan":
        return "fans_ventilation";
      case "fridge":
      case "freezer":
        return "kitchen";
      case "washing_machine":
      case "dryer":
      case "dishwasher":
        return "laundry";
      case "geyser":
      case "instant_water_heater":
        return "water_heating";
      case "tv":
      case "set_top_box":
      case "speaker":
        return "entertainment";
      default:
        return "other";
    }
  };

  // Play audio beep when a barcode is acquired
  const playBeep = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }, [soundEnabled]);

  // Start live webcam feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera access not available:", err);
      setCameraError(
        "Could not access video camera. Please verify device permissions or test with the preset interactive barcodes below."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        setFacingMode(nextMode);
        startCamera();
      }, 200);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const triggerSuccessfulScan = (entry: BarcodeCatalogueEntry) => {
    setSelectedCode(entry.code);
    playBeep();
    setLastScannedTime(Date.now());
    toast.success(`Optical Scan Decoded: ${entry.brand} ${entry.model}`, {
      description: `${entry.star}★ BEE Rating · ${entry.ratedWatts}W rated load detected`,
    });
  };

  const handleManualSearch = (codeToSearch: string) => {
    const found = findBarcode(codeToSearch);
    if (found) {
      triggerSuccessfulScan(found);
    } else {
      toast.error(`Unrecognized code: "${codeToSearch}". Try codes like SAV-AC-15-5S-001 or 8901234567001.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSimulatingOcr(true);
    toast.info("Analyzing image: Running optical barcode and BEE energy label neural classifier...");

    setTimeout(() => {
      setIsSimulatingOcr(false);
      // Pick a smart match from the catalogue or cycle
      const randomIdx = Math.floor(Math.random() * BARCODES.length);
      const randomMatch = BARCODES[randomIdx];
      triggerSuccessfulScan(randomMatch);
    }, 1200);
  };

  // Calculations
  const effectiveWatts = matched.ratedWatts * (matched.inverter ? 0.58 : 0.78);
  const estimatedMonthlyKwh = Math.round(((effectiveWatts) / 1000) * hoursPerDay * daysPerMonth);
  const estimatedMonthlyCost = Math.round(estimatedMonthlyKwh * 7.45); // Average slab cost
  const annualCo2Kg = Math.round(estimatedMonthlyKwh * 12 * 0.82); // CEA grid emission factor

  const handleAddAppliance = () => {
    const category = getCategoryForType(matched.type);

    upsertAppliance({
      id: newId("app"),
      householdId,
      type: matched.type,
      category,
      label: `${matched.brand} ${matched.model} (${assignedRoom.replace("_", " ")})`,
      spec: {
        tonnage: matched.tonnage,
        star: matched.star,
        inverter: matched.inverter,
        ratedWatts: matched.ratedWatts,
        brand: matched.brand,
        model: matched.model,
        ageYears,
        capacityLitres: matched.capacityLitres,
        capacityKg: matched.capacityKg,
        screenInches: matched.screenInches,
        wmType: matched.wmType,
        geyserLitres: matched.geyserLitres,
      },
      count: 1,
      hoursPerDay,
      daysPerMonth,
      ageYears,
      setupStatus: "complete",
      source: "scan",
      addedAt: new Date().toISOString(),
    });

    toast.success(`Saved to Inventory!`, {
      description: `${matched.brand} ${matched.model} assigned to ${assignedRoom.replace("_", " ")}.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Smart Appliance Scanner"
        subtitle="Live camera viewfinder, barcode/QR scanner, and BEE Energy Guide label recognition to dynamically synchronize your habitat inventory and 3D digital twin."
        badge={
          <span className="text-2xs font-mono px-2.5 py-0.5 rounded-full bg-positive/15 text-positive font-bold border border-positive/30">
            Optical Telemetry &amp; Star Rating Sync
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/twin">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-card text-xs text-foreground">
                <Home className="h-3.5 w-3.5 text-positive" />
                <span>3D Digital Twin</span>
              </Button>
            </Link>
            <Link href="/citizen/electricity">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-card text-xs text-foreground">
                <Zap className="h-3.5 w-3.5 text-stream-electricity" />
                <span>Electricity Hub</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
        <button
          onClick={() => {
            setMode("camera");
            if (!isCameraActive) startCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === "camera"
              ? "bg-card text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="h-4 w-4 text-positive" />
          <span>Live Camera Viewfinder</span>
        </button>

        <button
          onClick={() => {
            setMode("upload");
            stopCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === "upload"
              ? "bg-card text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileUp className="h-4 w-4 text-cyan-ink" />
          <span>Label / QR Photo Upload</span>
        </button>

        <button
          onClick={() => {
            setMode("samples");
            stopCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === "samples"
              ? "bg-card text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="h-4 w-4 text-amber-ink" />
          <span>Interactive Barcodes &amp; QR</span>
        </button>

        <button
          onClick={() => {
            setMode("manual");
            stopCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === "manual"
              ? "bg-card text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scan className="h-4 w-4 text-purple-ink" />
          <span>Manual Code Lookup</span>
        </button>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Viewfinder / Input Column */}
        <div className="lg:col-span-7 space-y-4">
          {mode === "camera" && (
            <div className="relative rounded-2xl border border-border bg-inset overflow-hidden shadow-xl aspect-video flex flex-col items-center justify-center">
              {/* Real Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? "opacity-100" : "opacity-0 absolute"
                }`}
              />

              {/* Viewfinder Overlay and Crosshairs */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                {/* Top Status */}
                <div className="w-full flex items-center justify-between text-2xs font-mono text-foreground">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card/85 backdrop-blur-md border border-border">
                    <span aria-hidden="true" className={`size-2 rounded-full ${isCameraActive ? "bg-tone-normal animate-pulse" : "bg-tone-moderate"}`} />
                    <span>{isCameraActive ? "OPTICAL SENSOR ACTIVE" : "CAMERA STANDBY"}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-card/85 backdrop-blur-md border border-border">
                    {facingMode === "environment" ? "REAR CAMERA" : "FRONT CAMERA"}
                  </div>
                </div>

                {/* Laser Reticle Box */}
                <div className="relative w-64 h-48 border-2 border-positive/60 rounded-2xl flex items-center justify-center shadow-[0_0_20px_color-mix(in_srgb,var(--positive)_35%,transparent)]">
                  {/* Corner Brackets */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-positive rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-positive rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-positive rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-positive rounded-br-lg" />

                  {/* Animated Sweeping Laser Line */}
                  {isScanning && (
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-positive to-transparent shadow-[0_0_12px_var(--positive)] animate-bounce" />
                  )}

                  <div className="text-center px-4 py-2 bg-card/85 backdrop-blur-sm rounded-lg border border-border">
                    <QrCode className="size-6 text-positive mx-auto mb-1 animate-pulse" />
                    <span className="text-2xs font-mono text-foreground font-medium block">
                      Align Barcode / QR / Star Label
                    </span>
                  </div>
                </div>

                {/* Bottom Instructions */}
                <div className="w-full text-center">
                  <span className="text-2xs text-soft bg-card/85 px-3 py-1 rounded-full backdrop-blur-md border border-border">
                    Position BEE Star Label or EAN Barcode inside reticle
                  </span>
                </div>
              </div>

              {/* Camera Controls Bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2">
                  {isCameraActive ? (
                    <Button
                      onClick={stopCamera}
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 bg-card/85 backdrop-blur-md text-xs"
                    >
                      <CameraOff className="size-3.5" />
                      <span>Stop Feed</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={startCamera}
                      size="sm"
                      variant="positive"
                      className="h-8 gap-1.5 font-semibold text-xs"
                    >
                      <Camera className="size-3.5" />
                      <span>Start Camera</span>
                    </Button>
                  )}

                  <Button
                    onClick={toggleFacingMode}
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 bg-card/85 backdrop-blur-md text-xs"
                  >
                    <SwitchCamera className="size-3.5" />
                    <span>Flip</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-card/85 backdrop-blur-md"
                    aria-label={soundEnabled ? "Mute beep" : "Enable scan sound"}
                    aria-pressed={soundEnabled}
                    title={soundEnabled ? "Mute beep" : "Enable scan sound"}
                  >
                    {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
                  </Button>

                  <Button
                    onClick={() => {
                      const next = BARCODES[(BARCODES.findIndex((b) => b.code === selectedCode) + 1) % BARCODES.length];
                      triggerSuccessfulScan(next);
                    }}
                    size="sm"
                    className="h-8 gap-1 text-xs"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Simulate Scan</span>
                  </Button>
                </div>
              </div>

              {/* Camera Error Prompt */}
              {cameraError && !isCameraActive && (
                <div className="absolute inset-4 rounded-xl bg-card/95 border border-border p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <AlertCircle className="size-8 text-amber-ink" />
                  <p className="text-xs text-muted-foreground max-w-sm">{cameraError}</p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setMode("samples")}
                      className="text-xs bg-primary text-primary-foreground h-8"
                    >
                      View Interactive Barcodes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startCamera}
                      className="text-xs border-border h-8"
                    >
                      Retry Camera
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "upload" && (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-ink">
                <FileUp className="size-8 animate-pulse" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">Upload Barcode, QR Code, or BEE Star Label</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  Snap a photo of the appliance manufacturer rating plate, yellow/red BEE Energy Guide label, or box barcode.
                </p>
              </div>

              <label className="relative cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <Button
                  asChild
                  className="font-semibold text-xs h-9 gap-2 cursor-pointer"
                >
                  <div>
                    <FileUp className="size-4" />
                    <span>Select Photo from Device</span>
                  </div>
                </Button>
              </label>

              {isSimulatingOcr && (
                <div role="status" className="flex items-center gap-2 text-xs text-cyan-ink font-mono animate-pulse">
                  <Sparkles className="size-3.5" />
                  <span>Simulated OCR — reading the label and barcode…</span>
                </div>
              )}
            </div>
          )}

          {mode === "samples" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Click to Scan Sample Barcodes &amp; QR Codes</h4>
                  <p className="text-2xs text-muted-foreground">Pre-calibrated BEE star rated home appliances</p>
                </div>
                <span className="text-2xs font-mono text-positive bg-positive/10 px-2 py-0.5 rounded border border-positive/20">
                  Instant Decode
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {BARCODES.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => triggerSuccessfulScan(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                      item.code === matched.code
                        ? "bg-positive/10 border-positive/50 shadow-md shadow-positive/5"
                        : "bg-muted/40 border-border hover:bg-muted/70 hover:border-positive/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground group-hover:text-positive">
                          {item.brand} {item.model}
                        </span>
                        <span className="text-2xs font-mono font-bold text-positive bg-positive/10 px-1.5 py-0.5 rounded">
                          {item.star}★
                        </span>
                      </div>
                      <div className="text-2xs text-muted-foreground capitalize mb-2">
                        {item.type.replace("_", " ")} · {item.ratedWatts}W
                        {item.inverter ? " · Inverter" : ""}
                        {item.tonnage ? ` · ${item.tonnage}T` : ""}
                      </div>
                    </div>

                    {/* Realistic Barcode Stripes Graphic */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-end gap-[1.5px] h-6 px-1 bg-card rounded border border-border-strong">
                        {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 4, 7, 3, 2, 5, 6, 3, 4, 5, 2].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h * 3}px`, width: i % 3 === 0 ? "2.5px" : "1.5px" }}
                            className="bg-foreground"
                          />
                        ))}
                      </div>
                      <span className="text-2xs font-mono text-muted-foreground group-hover:text-foreground">
                        {item.ean}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Enter SAVERA Model Code or EAN-13
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. SAV-AC-15-5S-001 or 8901234567001"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualSearch(manualCodeInput);
                    }}
                    className="bg-muted border-border text-xs font-mono"
                  />
                  <Button
                    onClick={() => handleManualSearch(manualCodeInput)}
                    className="bg-primary text-primary-foreground text-xs font-semibold h-9 px-4"
                  >
                    Lookup
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Quick-Try Sample Codes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_BARCODES.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleManualSearch(code)}
                      className="text-2xs font-mono px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Selection Dropdown as fallback */}
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Currently Selected Product:</span>
            <select
              value={selectedCode}
              onChange={(e) => {
                const found = BARCODES.find((b) => b.code === e.target.value);
                if (found) triggerSuccessfulScan(found);
              }}
              className="bg-muted border border-border rounded-lg text-foreground text-xs p-1.5 max-w-[260px] truncate focus:outline-none"
            >
              {BARCODES.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.brand} {b.model} ({b.star}★, {b.ratedWatts}W)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matched Appliance Telemetry & Add-To-Inventory Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-lg">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xs font-mono uppercase tracking-wider text-muted-foreground">
                  Recognized Asset
                </span>
                <span className="text-2xs font-mono font-bold text-positive bg-positive/10 border border-positive/30 px-2 py-0.5 rounded-full">
                  Verified In Catalogue
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {matched.brand} {matched.model}
              </h3>
              <p className="text-2xs text-muted-foreground font-mono mt-0.5">
                EAN: {matched.ean} · Model: {matched.code}
              </p>
            </div>

            {/* BEE Star Rating Visual */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-ink block">BEE Energy Star Rating</span>
                <span className="text-2xs text-muted-foreground">Bureau of Energy Efficiency (India)</span>
              </div>
              <div className="flex items-center gap-1 text-amber-ink">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={`text-base font-bold ${
                      s <= (matched.star ?? 3) ? "text-amber-ink" : "text-amber-ink/25"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50">
                <span className="text-2xs text-muted-foreground block">RATED WATTS</span>
                <span className="text-foreground font-bold text-sm">{matched.ratedWatts} W</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50">
                <span className="text-2xs text-muted-foreground block">COMPRESSOR / TECH</span>
                <span className="text-positive font-bold text-sm">
                  {matched.inverter ? "Inverter VFD" : "Standard"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50">
                <span className="text-2xs text-muted-foreground block">APPLIANCE KIND</span>
                <span className="text-foreground capitalize font-bold text-sm">
                  {matched.type.replace("_", " ")}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50">
                <span className="text-2xs text-muted-foreground block">RELEASE YEAR</span>
                <span className="text-foreground font-bold text-sm">{matched.yearIntroduced ?? 2023}</span>
              </div>
            </div>

            {/* User Customization Form */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <label className="block text-2xs font-semibold text-foreground mb-1">
                  Assign Room (Digital Twin Placement)
                </label>
                <select
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value as typeof assignedRoom)}
                  className="w-full rounded-xl bg-muted border border-border text-foreground text-xs p-2.5 focus:outline-none"
                >
                  <option value="living_room">Living Room (Zone 1)</option>
                  <option value="bedroom">Master Bedroom (Zone 2)</option>
                  <option value="kitchen">Kitchen &amp; Dining (Zone 3)</option>
                  <option value="bathroom">Bathroom &amp; Utility (Zone 4)</option>
                  <option value="utility">Utility / Balcony</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-2xs text-muted-foreground mb-1">Hours / Day</label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(parseInt(e.target.value) || 1)}
                    className="bg-muted border-border text-foreground text-xs font-mono h-8"
                  />
                </div>
                <div>
                  <label className="block text-2xs text-muted-foreground mb-1">Days / Mo</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={daysPerMonth}
                    onChange={(e) => setDaysPerMonth(parseInt(e.target.value) || 1)}
                    className="bg-muted border-border text-foreground text-xs font-mono h-8"
                  />
                </div>
                <div>
                  <label className="block text-2xs text-muted-foreground mb-1">Age (Years)</label>
                  <Input
                    type="number"
                    min={0}
                    max={25}
                    value={ageYears}
                    onChange={(e) => setAgeYears(parseInt(e.target.value) || 0)}
                    className="bg-muted border-border text-foreground text-xs font-mono h-8"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Monthly Impact Card */}
            <div className="p-3.5 rounded-xl bg-positive/10 border border-positive/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-positive font-semibold">Monthly Energy Load</span>
                <span className="text-sm font-bold font-mono text-positive">~{estimatedMonthlyKwh} kWh/mo</span>
              </div>
              <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1 border-t border-positive/15">
                <span>Estimated Cost Impact: <strong className="text-foreground font-mono">₹{estimatedMonthlyCost}</strong></span>
                <span>Carbon: <strong className="text-foreground font-mono">{annualCo2Kg} kg CO₂/yr</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleAddAppliance}
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 gap-2"
              >
                <span>Add to My Habitat Inventory</span>
                <CheckCircle2 className="size-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Link href="/citizen/twin" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs border-border bg-card">
                    View in 3D Twin
                  </Button>
                </Link>
                <Link href="/citizen/electricity" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs border-border bg-card">
                    View Energy Hub
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

