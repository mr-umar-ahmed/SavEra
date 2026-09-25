"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";
import {
  Activity,
  AlertTriangle,
  Battery,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  HelpCircle,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GasComponentSpec } from "@/types/gas";

export const GAS_HARDWARE_SPECS: Record<string, GasComponentSpec> = {
  drs_skid: {
    id: "drs_skid",
    name: "District Regulating Station (DRS) Skid",
    category: "drs_station",
    manufacturer: "Pietro Fiorentini / Emerson Fisher",
    model: "Type 299H / Dival 600 Dual Stream Pressure Regulating Skid",
    serialNumber: "DRS-W24-FE-004",
    location: "Ward 24 City Gas Perimeter Skid (Gandhi Nagar Intake)",
    diameterMm: 80,
    material: "Epoxy-Coated Carbon Steel with Odorant Dosing Chamber",
    communicationProtocol: "Modbus RTU over Optical Fiber to Central SCADA",
    lastHeartbeat: "Just now (5s polling)",
    currentReading: "Inlet: 3.8 bar · Outlet: 100 mbar · Odorant: 18 mg/SCM",
    pressureMbar: 100,
    flowRateScmh: "148.5 SCMH",
    status: "normal",
    certification: "PNGRB T4S / ASME B31.8 / ISO 13623",
    description:
      "Municipal pressure reducing skid dropping medium-pressure steel feeder (4 bar) to low-pressure PE network. Integrates automated slam-shut valve and Ethyl Mercaptan odorizer.",
    installationDate: "12 Oct 2024",
  },
  pe_main_pipe: {
    id: "pe_main_pipe",
    name: "Primary Yellow PE-100 Gas Main",
    category: "main_pipe",
    manufacturer: "Supreme Industries / Georg Fischer",
    model: "PE-100 High-Density Polyethylene Gas Pipe (SDR 11, PN4)",
    serialNumber: "PE100-63MM-W24-SEC2",
    location: "Underground Spine (Rampur Road to Household Laterals)",
    diameterMm: 63,
    material: "Polyethylene PE-100 High Density (UV & Stress Crack Resistant)",
    communicationProtocol: "Acoustic Leak Detection & Pressure Telemetry",
    lastHeartbeat: "Continuous Conduit",
    currentReading: "Pressure: 98.2 mbar · Velocity: 1.4 m/s",
    pressureMbar: 98.2,
    flowRateScmh: "148.5 SCMH",
    status: "normal",
    certification: "IS 14885 / ISO 4437 / PNGRB Distribution Standard",
    description:
      "Underground yellow PE distribution main transporting odorized natural gas to residential risers with electrofusion joints and cathodic tracer wire.",
    installationDate: "28 Nov 2024",
  },
  service_riser: {
    id: "service_riser",
    name: "Building Service Riser & Secondary Regulator",
    category: "service_riser",
    manufacturer: "Raychem RPG / L&T",
    model: "GI Service Riser with B25 21 mbar Residential Regulator",
    serialNumber: "SRV-H1024-25MM",
    location: "Household H-1024 Exterior Service Wall",
    diameterMm: 25,
    material: "Heavy-Gauge Galvanized Iron (GI Class C) with Anti-Corrosion Wrap",
    communicationProtocol: "Manual Lockable Ball Valve with Tamper Latch",
    lastHeartbeat: "Passive High-Reliability Regulator",
    currentReading: "Inlet: 98 mbar · Regulated Outlet: 21.0 mbar",
    pressureMbar: 21.0,
    flowRateScmh: "0.28 SCMH",
    status: "normal",
    certification: "EN 334 / IS 15139 / PNGRB Riser Compliance",
    description:
      "External building riser taking gas from underground PE lateral, equipped with a lockable brass ball isolation valve and a secondary diaphragm regulator stepping down pressure to residential 21 mbar.",
    installationDate: "15 Jan 2025",
  },
  solenoid_valve: {
    id: "solenoid_valve",
    name: "Smart Solenoid Emergency Shut-Off Valve",
    category: "solenoid_valve",
    manufacturer: "Asco Joucomatic / Pietro Fiorentini",
    model: "Series 210 Bi-Stable Latching Solenoid Emergency Valve",
    serialNumber: "SOL-EMERG-250MS-8812",
    location: "Household Service Riser Inlet",
    diameterMm: 20,
    material: "Die-Cast Brass with NBR Gas Diaphragm",
    communicationProtocol: "Direct Hardware Interlock & LoRaWAN Remote Actuation",
    batteryLifeYears: 10,
    batteryPct: 98,
    lastHeartbeat: "Just now",
    currentReading: "Position: LATCHED OPEN (Normal)",
    pressureMbar: 21.0,
    flowRateScmh: "0.28 SCMH",
    status: "normal",
    certification: "ATEX Zone 1 / IECEx / EN 161 Automatic Shutoff Standards",
    description:
      "High-speed bi-stable solenoid safety valve capable of full shutoff within 250ms. Triggers automatically on high methane PPM, rapid line pressure drop, seismic tremor, or remote IoT authorization.",
    installationDate: "15 Jan 2025",
  },
  smart_meter_png: {
    id: "smart_meter_png",
    name: "Household Smart Ultrasonic Gas Meter",
    category: "smart_meter",
    manufacturer: "Pietro Fiorentini / Itron",
    model: "RSE 2.4 / Gallus Cyble Ultrasonic Smart Gas Meter",
    serialNumber: "GM-ITRON-ULTRASONIC-4410",
    location: "Household H-1024 Service Utility Box",
    diameterMm: 20,
    material: "Die-cast Aluminum Body with Hydrophobic Acoustic Chambers",
    communicationProtocol: "LoRaWAN 865 MHz (India Band) / NB-IoT Fallback",
    batteryLifeYears: 15,
    batteryPct: 95,
    rssiSignalDbm: -82,
    lastHeartbeat: "18s ago (Sync cycle: 60s)",
    currentReading: "142.85 SCM (Cumulative) · Flow: 0.28 SCMH",
    pressureMbar: 21.0,
    flowRateScmh: "0.28 SCMH",
    status: "normal",
    certification: "OIML R137 Class 1.5 / EN 14236 / PNGRB Smart Meter Standard",
    description:
      "Transit-time ultrasonic solid-state smart gas meter with internal PTZ temperature and pressure compensation. Integrates an optical tamper sensor, reverse-flow prevention, and bi-directional cellular/LoRaWAN telemetry.",
    installationDate: "15 Jan 2025",
  },
  smart_scale_lpg: {
    id: "smart_scale_lpg",
    name: "Sensonic Smart IoT Cylinder Tare Scale",
    category: "lpg_scale",
    manufacturer: "Sensonic Systems",
    model: "GasSense Pro IoT Domestic Cylinder Tare Ring",
    serialNumber: "LPG-TARE-IOT-9901",
    location: "Household Kitchen Utility Nook (Cylinder Base)",
    material: "Aerospace-Grade Cast Aluminum with 4x Strain-Gauge Load Cells",
    communicationProtocol: "BLE 5.2 to Savera Home Hub & LoRaWAN Gateway",
    batteryLifeYears: 4,
    batteryPct: 88,
    rssiSignalDbm: -76,
    lastHeartbeat: "30s ago",
    currentReading: "Net Gas: 9.4 kg (Gross: 24.6 kg, Tare: 15.2 kg)",
    flowRateScmh: "0.21 kg/h (Burn Rate)",
    status: "normal",
    certification: "IS 3196 / PESO Safety Approved for Zone 2 Hazardous Areas",
    description:
      "Precision strain-gauge smart ring continuously weighing domestic 14.2 kg LPG cylinders. Automatically computes remaining days, triggers auto-refill booking below 2.0 kg, and detects abnormal high-rate weight loss indicating a leak.",
    installationDate: "02 Feb 2025",
  },
  kitchen_manifold: {
    id: "kitchen_manifold",
    name: "Kitchen Brass Gas Manifold & Cocks",
    category: "kitchen_manifold",
    manufacturer: "Zoloto / Honeywell",
    model: "Multi-Port Forged Brass Isolation Manifold (PN16)",
    serialNumber: "MANIFOLD-H1024-KITCHEN",
    location: "Kitchen Under-Counter Manifold Box",
    diameterMm: 15,
    material: "Forged Brass with Chrome Plating & PTFE Seals",
    communicationProtocol: "Mechanical Quarter-Turn Cocks with Micro-Switch Feedback",
    lastHeartbeat: "Passive Distribution Manifold",
    currentReading: "Stove Port: ACTIVE · Geyser Port: STANDBY",
    pressureMbar: 20.8,
    flowRateScmh: "0.28 SCMH",
    status: "normal",
    certification: "IS 9884 / EN 331 Approved Gas Cock Standard",
    description:
      "Internal kitchen distribution manifold with independent isolation ball valves for the gas cooking hob and instant gas geyser. Sealed with Teflon and certified for combustible hydrocarbon gases.",
    installationDate: "16 Jan 2025",
  },
  methane_sniffer: {
    id: "methane_sniffer",
    name: "Smart NDIR Methane & Combustible Gas Sniffer",
    category: "methane_detector",
    manufacturer: "Sensirion / Honeywell",
    model: "SGP40 / Sensepoint Smart Methane PPM Detector",
    serialNumber: "GAS-SNIFF-NDIR-228",
    location: "Kitchen Ceiling / Wall Nook (30 cm below ceiling)",
    communicationProtocol: "Wi-Fi & LoRaWAN Telemetry with Hardwired Solenoid Relay",
    lastHeartbeat: "Just now (Continuous sampling)",
    currentReading: "Ambient Methane: 18 PPM (Safe band < 50 PPM)",
    flowRateScmh: "Atmospheric Ambient Sampling",
    status: "normal",
    certification: "EN 50194 / UL 1484 Household Gas Detector Standard",
    description:
      "Optical Non-Dispersive Infrared (NDIR) gas sensor specifically tuned to methane (CH4) and propane/butane. Triggers internal 85 dB audible siren at 200 PPM and instantly drops solenoid valve at 500 PPM.",
    installationDate: "16 Jan 2025",
  },
  smart_gas_stove: {
    id: "smart_gas_stove",
    name: "Dual-Burner Smart Gas Hob & Burners",
    category: "gas_stove",
    manufacturer: "Prestige / Glen",
    model: "Smart Flame IoT 2-Burner Toughened Glass Hob",
    serialNumber: "HOB-IOT-2B-5531",
    location: "Kitchen Main Cooking Counter",
    material: "8mm Toughened Glass & Solid Forged Brass Burners",
    communicationProtocol: "Flame Failure Device (FFD) Thermocouple & IoT State",
    lastHeartbeat: "Active Flame Telemetry",
    currentReading: "Burner 1: Active (0.28 SCMH) · Burner 2: OFF",
    pressureMbar: 20.8,
    flowRateScmh: "0.28 SCMH",
    status: "normal",
    certification: "IS 4246 Domestic Gas Cooking Appliances Standard",
    description:
      "High-efficiency brass burners engineered for 68% thermal efficiency. Features thermocouple Flame Failure Devices (FFD) that automatically cut local gas flow if the flame is blown out by draft or spilled liquid.",
    installationDate: "18 Jan 2025",
  },
  gas_geyser: {
    id: "gas_geyser",
    name: "Instant 10L Balanced-Flue Gas Geyser",
    category: "gas_geyser",
    manufacturer: "Racold / Bajaj",
    model: "EcoFlue 10L Instant Hydro-Ignition Gas Water Heater",
    serialNumber: "GEYSER-10L-BAL-882",
    location: "Utility Balcony (Exterior Wall Mount)",
    diameterMm: 15,
    material: "Oxygen-Free Copper Heat Exchanger with Room-Sealed Flue",
    communicationProtocol: "Water Flow Sensor & Overheat Thermostat Interlock",
    lastHeartbeat: "Standby (No water draw)",
    currentReading: "Burner: OFF · Flue Temp: 28°C · Water Flow: 0 L/min",
    pressureMbar: 21.0,
    flowRateScmh: "0.00 SCMH (Standby)",
    status: "normal",
    certification: "IS 15558 Instantaneous Domestic Water Heater Standard",
    description:
      "Exterior room-sealed balanced-flue instant water heater. Consumes gas only when water tap is actively turned on, eliminating thermal standby losses of electric storage geysers.",
    installationDate: "20 Jan 2025",
  },
};

interface GasNetwork3DProps {
  scenario?: string;
  onSelectComponent?: (spec: GasComponentSpec) => void;
  selectedComponentId?: string;
  valveState?: "open" | "throttled" | "closed_manual" | "closed_auto";
  linePressureMbar?: number;
  instantFlowScmh?: number;
  methanePpm?: number;
}

export function GasNetwork3D({
  scenario = "scenario_normal",
  onSelectComponent,
  selectedComponentId,
  valveState = "open",
  linePressureMbar = 21.0,
  instantFlowScmh = 0.28,
  methanePpm = 18,
}: GasNetwork3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activeComponent, setActiveComponent] = useState<GasComponentSpec>(
    GAS_HARDWARE_SPECS.smart_meter_png
  );
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Sync selected component with prop
  useEffect(() => {
    if (selectedComponentId && GAS_HARDWARE_SPECS[selectedComponentId]) {
      setActiveComponent(GAS_HARDWARE_SPECS[selectedComponentId]);
    }
  }, [selectedComponentId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(16, 14, 18);
    camera.lookAt(0, 1.5, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x241d18 : 0xfff3e6,
      isDark ? 1.4 : 1.8
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(18, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Warm amber gas glow pointlight
    const gasGlowLight = new THREE.PointLight(
      scenario === "scenario_rupture"
        ? 0xef4444
        : scenario === "scenario_micro_leak"
        ? 0xf59e0b
        : 0x3b82f6,
      2.5,
      20
    );
    gasGlowLight.position.set(2, 4, 3);
    scene.add(gasGlowLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Material definitions
    const yellowPipeMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.35,
      metalness: 0.25,
    });

    const steelSkidMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x334155 : 0x64748b,
      roughness: 0.4,
      metalness: 0.8,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.7,
    });

    const meterHousingMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x27272a : 0xf4f4f5,
      roughness: 0.3,
      metalness: 0.4,
    });

    const groundGridMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x181411 : 0xf5eee6,
      roughness: 0.9,
    });

    // 1. Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(8.5, 8.8, 0.4, 48);
    const baseMesh = new THREE.Mesh(baseGeo, groundGridMat);
    baseMesh.position.y = -0.2;
    baseMesh.receiveShadow = true;
    rootGroup.add(baseMesh);

    // Circular glowing border
    const borderGeo = new THREE.TorusGeometry(8.52, 0.05, 16, 64);
    const borderMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xd49a62 : 0x7c4d28,
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = Math.PI / 2;
    borderMesh.position.y = 0.02;
    rootGroup.add(borderMesh);

    // Grid helper
    const grid = new THREE.GridHelper(
      15,
      24,
      isDark ? 0xd97706 : 0xb45309,
      isDark ? 0x3f2d21 : 0xdecbb7
    );
    grid.position.y = 0.03;
    rootGroup.add(grid);

    // Interactive clickable meshes registry
    const clickableObjects: { mesh: THREE.Object3D; specId: string }[] = [];

    const registerClickable = (mesh: THREE.Object3D, specId: string) => {
      mesh.userData = { specId };
      clickableObjects.push({ mesh, specId });
    };

    // 2. City Gas District Regulating Station (DRS Skid)
    const drsGroup = new THREE.Group();
    drsGroup.position.set(-5.5, 0.1, -4.0);

    // Skid platform
    const skidGeo = new THREE.BoxGeometry(3.6, 0.3, 2.2);
    const skidMesh = new THREE.Mesh(skidGeo, steelSkidMat);
    skidMesh.position.y = 0.15;
    skidMesh.castShadow = true;
    drsGroup.add(skidMesh);

    // Pressure reducing regulator cylinder
    const regCylinderGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 20);
    const regMesh = new THREE.Mesh(regCylinderGeo, brassMat);
    regMesh.rotation.z = Math.PI / 2;
    regMesh.position.set(0, 0.8, 0);
    drsGroup.add(regMesh);

    // Mercaptan odorant injection vessel
    const odorantGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16);
    const odorantMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.6,
    });
    const odorantMesh = new THREE.Mesh(odorantGeo, odorantMat);
    odorantMesh.position.set(1.0, 0.75, 0.5);
    drsGroup.add(odorantMesh);

    // Pressure dial gauge
    const dialGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialMesh.rotation.x = Math.PI / 2;
    dialMesh.position.set(-0.6, 1.2, 0);
    drsGroup.add(dialMesh);

    rootGroup.add(drsGroup);
    registerClickable(skidMesh, "drs_skid");
    registerClickable(regMesh, "drs_skid");

    // 3. Yellow PE-100 Underground Distribution Gas Pipe
    const peCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.0, 0.2, -3.5),
      new THREE.Vector3(-1.5, 0.2, -1.5),
      new THREE.Vector3(1.0, 0.2, 0.2),
      new THREE.Vector3(3.2, 0.2, 1.8),
    ]);

    const pePipeGeo = new THREE.TubeGeometry(peCurve, 40, 0.12, 16, false);
    const pePipeMesh = new THREE.Mesh(pePipeGeo, yellowPipeMat);
    pePipeMesh.castShadow = true;
    rootGroup.add(pePipeMesh);
    registerClickable(pePipeMesh, "pe_main_pipe");

    // 4. Building Service Riser (Vertical GI pipe from ground to meter)
    const riserGroup = new THREE.Group();
    riserGroup.position.set(3.2, 0, 1.8);

    const verticalPipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 16);
    const riserPipeMesh = new THREE.Mesh(verticalPipeGeo, steelSkidMat);
    riserPipeMesh.position.y = 1.2;
    riserGroup.add(riserPipeMesh);
    registerClickable(riserPipeMesh, "service_riser");

    // Solenoid Safety Valve Box
    const solGeo = new THREE.BoxGeometry(0.35, 0.45, 0.3);
    const solMat = new THREE.MeshStandardMaterial({
      color:
        valveState === "open"
          ? 0x10b981
          : valveState === "throttled"
          ? 0xf59e0b
          : 0xef4444,
      roughness: 0.4,
      metalness: 0.7,
    });
    const solMesh = new THREE.Mesh(solGeo, solMat);
    solMesh.position.set(0, 1.8, 0);
    riserGroup.add(solMesh);
    registerClickable(solMesh, "solenoid_valve");

    rootGroup.add(riserGroup);

    // 5. Smart Ultrasonic Gas Meter (Household H-1024)
    const meterGroup = new THREE.Group();
    meterGroup.position.set(3.6, 2.4, 1.8);

    // Rectangular smart meter body
    const meterGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
    const meterMesh = new THREE.Mesh(meterGeo, meterHousingMat);
    meterMesh.castShadow = true;
    meterGroup.add(meterMesh);

    // Digital LCD Glass screen
    const screenGeo = new THREE.PlaneGeometry(0.45, 0.28);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x064e3b });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.15, 0.26);
    meterGroup.add(screenMesh);

    // LoRaWAN Antenna
    const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const antMesh = new THREE.Mesh(antGeo, antMat);
    antMesh.position.set(0.25, 0.6, 0);
    meterGroup.add(antMesh);

    // Pulse blinking LED
    const ledGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(-0.18, 0.15, 0.27);
    meterGroup.add(ledMesh);

    rootGroup.add(meterGroup);
    registerClickable(meterMesh, "smart_meter_png");

    // 6. Kitchen Manifold & Counter
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(4.8, 0, 3.8);

    // Counter table block
    const counterGeo = new THREE.BoxGeometry(3.2, 1.6, 1.8);
    const counterMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x27272a : 0xe4d7c3,
      roughness: 0.6,
    });
    const counterMesh = new THREE.Mesh(counterGeo, counterMat);
    counterMesh.position.set(0, 0.8, 0);
    counterMesh.receiveShadow = true;
    kitchenGroup.add(counterMesh);

    // Kitchen Gas Stove Cooktop
    const stoveGeo = new THREE.BoxGeometry(1.4, 0.1, 0.9);
    const stoveMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.15,
    });
    const stoveMesh = new THREE.Mesh(stoveGeo, stoveMat);
    stoveMesh.position.set(0, 1.65, 0);
    kitchenGroup.add(stoveMesh);
    registerClickable(stoveMesh, "smart_gas_stove");

    // Stove Burners (Brass rings)
    const burnerRingGeo = new THREE.TorusGeometry(0.14, 0.03, 12, 24);
    const burner1 = new THREE.Mesh(burnerRingGeo, brassMat);
    burner1.rotation.x = Math.PI / 2;
    burner1.position.set(-0.35, 1.72, 0);
    kitchenGroup.add(burner1);

    const burner2 = new THREE.Mesh(burnerRingGeo, brassMat);
    burner2.rotation.x = Math.PI / 2;
    burner2.position.set(0.35, 1.72, 0);
    kitchenGroup.add(burner2);

    // Animated 3D Flame Particles on Burner 1
    const flameCount = 28;
    const flameGeo = new THREE.BufferGeometry();
    const flamePositions = new Float32Array(flameCount * 3);
    const flameAngles = new Float32Array(flameCount);

    for (let i = 0; i < flameCount; i++) {
      const angle = (i / flameCount) * Math.PI * 2;
      flameAngles[i] = angle;
      flamePositions[i * 3] = -0.35 + Math.cos(angle) * 0.14;
      flamePositions[i * 3 + 1] = 1.74 + Math.random() * 0.1;
      flamePositions[i * 3 + 2] = Math.sin(angle) * 0.14;
    }

    flameGeo.setAttribute("position", new THREE.BufferAttribute(flamePositions, 3));
    const flameMat = new THREE.PointsMaterial({
      color:
        scenario === "scenario_micro_leak"
          ? 0xf59e0b // lazy incomplete yellow flame
          : scenario === "scenario_rupture"
          ? 0xef4444
          : 0x38bdf8, // vibrant stoichiometric blue flame
      size: 0.12,
      transparent: true,
      opacity: valveState === "open" ? 0.95 : 0.05,
      blending: THREE.AdditiveBlending,
    });

    const flamePoints = new THREE.Points(flameGeo, flameMat);
    kitchenGroup.add(flamePoints);

    // Methane Sniffer on Kitchen Wall
    const snifferGeo = new THREE.BoxGeometry(0.25, 0.35, 0.15);
    const snifferMat = new THREE.MeshStandardMaterial({
      color:
        methanePpm > 400
          ? 0xef4444
          : methanePpm > 100
          ? 0xf59e0b
          : 0x10b981,
      roughness: 0.3,
    });
    const snifferMesh = new THREE.Mesh(snifferGeo, snifferMat);
    snifferMesh.position.set(-1.2, 2.5, 0);
    kitchenGroup.add(snifferMesh);
    registerClickable(snifferMesh, "methane_sniffer");

    // Smart LPG Cylinder Tare Scale (Sensonic)
    const lpgScaleGeo = new THREE.CylinderGeometry(0.4, 0.42, 0.12, 24);
    const lpgScaleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const lpgScaleMesh = new THREE.Mesh(lpgScaleGeo, lpgScaleMat);
    lpgScaleMesh.position.set(-1.4, 0.06, 0.5);
    kitchenGroup.add(lpgScaleMesh);
    registerClickable(lpgScaleMesh, "smart_scale_lpg");

    // 14.2 kg LPG Red Cylinder
    const cylinderGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.1, 24);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.4,
    });
    const cylinderMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
    cylinderMesh.position.set(-1.4, 0.65, 0.5);
    kitchenGroup.add(cylinderMesh);
    registerClickable(cylinderMesh, "smart_scale_lpg");

    rootGroup.add(kitchenGroup);

    // 7. Gas Flow Particles Animation along PE Pipe
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleOffsets[i] = i / particleCount;
      const pt = peCurve.getPoint(particleOffsets[i]);
      particlePositions[i * 3] = pt.x;
      particlePositions[i * 3 + 1] = pt.y;
      particlePositions[i * 3 + 2] = pt.z;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color:
        scenario === "scenario_rupture"
          ? 0xef4444
          : scenario === "scenario_micro_leak"
          ? 0xf59e0b
          : 0xfacc15,
      size: 0.16,
      transparent: true,
      opacity: valveState === "open" ? 0.9 : 0.1,
      blending: THREE.AdditiveBlending,
    });

    const flowParticles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(flowParticles);

    // Raycasting & Mouse Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        clickableObjects.map((c) => c.mesh),
        true
      );

      if (intersects.length > 0) {
        const hit = intersects[0];
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.specId) {
          obj = obj.parent;
        }

        if (obj?.userData?.specId) {
          const specId = obj.userData.specId;
          const spec = GAS_HARDWARE_SPECS[specId];
          if (spec) {
            setHoveredName(spec.name);
            canvas.style.cursor = "pointer";
            return;
          }
        }
      }

      setHoveredName(null);
      canvas.style.cursor = "default";
    };

    const handlePointerDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        clickableObjects.map((c) => c.mesh),
        true
      );

      if (intersects.length > 0) {
        const hit = intersects[0];
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.specId) {
          obj = obj.parent;
        }

        if (obj?.userData?.specId) {
          const specId = obj.userData.specId;
          const spec = GAS_HARDWARE_SPECS[specId];
          if (spec) {
            setActiveComponent(spec);
            setIsInspectorOpen(true);
            onSelectComponent?.(spec);
          }
        }
      }
    };

    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("click", handlePointerDown);

    // Orbit Drag Controls (Pure Vanilla Three.js)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      rootGroup.rotation.y += deltaX * 0.006;
      camera.position.y = Math.max(4, Math.min(25, camera.position.y - deltaY * 0.05));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
      camera.position.clampLength(8, 45);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto-rotation
      if (autoRotate && !isDragging) {
        rootGroup.rotation.y += 0.002;
      }

      // Pulse LED blinking
      ledMat.color.setHex(Math.sin(elapsedTime * 6) > 0 ? 0x10b981 : 0x064e3b);

      // Gas flow particles motion
      const flowPos = particleGeo.attributes.position.array as Float32Array;
      const flowSpeed =
        scenario === "scenario_rupture"
          ? 0.015
          : valveState === "open"
          ? 0.005
          : 0.0005;

      for (let i = 0; i < particleCount; i++) {
        particleOffsets[i] = (particleOffsets[i] + flowSpeed) % 1.0;
        const pt = peCurve.getPoint(particleOffsets[i]);
        flowPos[i * 3] = pt.x;
        flowPos[i * 3 + 1] = pt.y + Math.sin(elapsedTime * 4 + i) * 0.02;
        flowPos[i * 3 + 2] = pt.z;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Flame jitter on stove burner
      if (valveState === "open") {
        const flamePos = flameGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < flameCount; i++) {
          const angle = flameAngles[i];
          const jitter = (Math.random() - 0.5) * 0.03;
          flamePos[i * 3] = -0.35 + Math.cos(angle) * (0.14 + jitter);
          flamePos[i * 3 + 1] = 1.74 + Math.random() * 0.12;
          flamePos[i * 3 + 2] = Math.sin(angle) * (0.14 + jitter);
        }
        flameGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("click", handlePointerDown);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [scenario, isDark, autoRotate, valveState, linePressureMbar, instantFlowScmh, methanePpm]);

  return (
    <div className="relative w-full rounded-3xl border border-border bg-card/90 overflow-hidden shadow-2xl transition-all">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[520px] sm:h-[580px] bg-gradient-to-b from-background/30 via-background/60 to-card/90"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top Floating HUD: Hardware Telemetry Status */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/90 border border-border text-xs font-mono font-bold text-foreground shadow-sm backdrop-blur-md">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              <span>City Gas 3D Network Twin · 60 FPS</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 border border-border text-2xs font-mono text-muted-foreground backdrop-blur-md">
              <Radio className="size-3 text-positive" />
              <span>LoRaWAN 865 MHz Telemetry Active</span>
            </span>
          </div>

          {/* Interactive Controls & View Reset */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
              className="h-8 px-2.5 text-xs gap-1.5 bg-card/85 backdrop-blur-md border-border text-foreground hover:bg-muted"
            >
              <RotateCcw className={`size-3.5 ${autoRotate ? "animate-spin" : ""}`} />
              <span>{autoRotate ? "Rotate: ON" : "Rotate: OFF"}</span>
            </Button>
          </div>
        </div>

        {/* Bottom Floating Hover Prompt */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-card/95 border border-border/80 px-3.5 py-2 rounded-2xl shadow-lg backdrop-blur-md">
            <Flame className="size-4 text-amber-500" />
            <div className="text-xs font-mono">
              <span className="text-muted-foreground">Focus: </span>
              <strong className="text-foreground font-bold">
                {hoveredName ?? activeComponent.name}
              </strong>
              <span className="text-2xs text-muted-foreground ml-2">
                (Click any 3D node to inspect specs)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsInspectorOpen(true)}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-md"
            >
              <Cpu className="size-3.5" />
              <span>Inspect Hardware</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-In Hardware Component Specification Drawer / Modal */}
      {isInspectorOpen && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-[440px] z-50 bg-card/98 border-l border-border shadow-2xl backdrop-blur-xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {activeComponent.category.replace("_", " ")}
                </span>
                <span className="text-2xs font-mono text-muted-foreground">
                  ID: {activeComponent.id}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mt-1">
                {activeComponent.name}
              </h3>
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Real-time Telemetry Readout */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Live Telemetry</span>
              <span className="flex items-center gap-1 text-positive font-bold">
                <span className="size-2 rounded-full bg-positive animate-pulse" />
                <span>Synchronized</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Flow Rate
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.flowRateScmh}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Line Pressure
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.pressureMbar
                    ? `${activeComponent.pressureMbar} mbar`
                    : "Nominal"}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Battery Status
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.batteryPct
                    ? `${activeComponent.batteryPct}% (Li-SOCl2)`
                    : "Mains Powered"}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Signal RSSI
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.rssiSignalDbm
                    ? `${activeComponent.rssiSignalDbm} dBm`
                    : "Fiber Direct"}
                </strong>
              </div>
            </div>
          </div>

          {/* Technical Specs Sheet */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              <Layers className="size-3.5" />
              <span>Hardware Specification & Registry</span>
            </h4>

            <dl className="space-y-2 rounded-2xl border border-border p-3.5 bg-card/60 divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Manufacturer</dt>
                <dd className="font-semibold text-foreground text-right font-mono">
                  {activeComponent.manufacturer}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Model Series</dt>
                <dd className="font-semibold text-foreground text-right font-mono">
                  {activeComponent.model}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Serial Number</dt>
                <dd className="font-mono text-positive text-right">
                  {activeComponent.serialNumber}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Location</dt>
                <dd className="font-medium text-foreground text-right">
                  {activeComponent.location}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Protocol</dt>
                <dd className="font-medium text-foreground text-right">
                  {activeComponent.communicationProtocol}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground font-mono text-2xs">Certification</dt>
                <dd className="font-medium text-foreground text-right">
                  {activeComponent.certification}
                </dd>
              </div>
            </dl>

            <p className="text-2xs text-muted-foreground leading-relaxed pt-1">
              {activeComponent.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
