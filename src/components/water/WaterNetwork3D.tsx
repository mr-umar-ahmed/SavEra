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
  Droplet,
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
  Waves,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WaterComponentSpec {
  id: string;
  name: string;
  category: "bulk_meter" | "pressure_sensor" | "pipeline" | "valve" | "household_meter";
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  diameterMm?: number;
  material?: string;
  communicationProtocol: string;
  batteryLifeYears?: number;
  batteryPct?: number;
  rssiSignalDbm?: number;
  lastHeartbeat: string;
  currentReading: string;
  pressureBar?: number;
  flowRate: string;
  status: "normal" | "warning" | "critical" | "offline";
  certification: string;
  description: string;
  installationDate: string;
}

export const HARDWARE_SPECS: Record<string, WaterComponentSpec> = {
  bulk_meter: {
    id: "bulk_meter",
    name: "Zone Bulk Electromagnetic Flow Meter",
    category: "bulk_meter",
    manufacturer: "ABB / Siemens",
    model: "WaterMaster FEW400 / SITRANS FUS380",
    serialNumber: "WM-DN200-IND-88419",
    location: "Ward 24 Feeder 4 Entry Chamber (Rampur Road)",
    diameterMm: 200,
    material: "Epoxy-Coated Ductile Iron (Class C Lining)",
    communicationProtocol: "Modbus RS485 to Cellular 4G SCADA Gateway",
    lastHeartbeat: "Just now (10s polling)",
    currentReading: "42.50 m³/h (1,020 m³/day)",
    flowRate: "42.50 m³/h",
    pressureBar: 3.4,
    status: "normal",
    certification: "ISO 4064 Class 1 / OIML R49 / MoHUA Urban Water Standard",
    description:
      "High-precision electromagnetic bulk meter monitoring primary raw-to-treated water transfer into Ward 24 DMA. Dual-direction ultrasonic sensors detect reverse hydraulic surge.",
    installationDate: "14 Jan 2025",
  },
  pressure_inlet: {
    id: "pressure_inlet",
    name: "Zone Entry Pressure Transmitter",
    category: "pressure_sensor",
    manufacturer: "Danfoss",
    model: "MBS 3000 Smart Piezoresistive Transmitter",
    serialNumber: "DF-MBS-3000-0914",
    location: "Feeder 4 Main Sluice Chamber",
    communicationProtocol: "4–20 mA Current Loop to Municipal RTU",
    lastHeartbeat: "12s ago",
    currentReading: "3.40 bar (49.3 PSI)",
    pressureBar: 3.4,
    flowRate: "Continuous Pressure Monitoring",
    status: "normal",
    certification: "EN 61326-1 / IP67 Hermetically Sealed",
    description:
      "Measures baseline supply pressure at DMA boundary to verify hydraulic head from Master Balancing Reservoir before distribution into colony branches.",
    installationDate: "20 Feb 2025",
  },
  main_pipe: {
    id: "main_pipe",
    name: "Primary Distribution Feeder 4",
    category: "pipeline",
    manufacturer: "Tata Metaliks / Jindal SAW",
    model: "Ductile Iron (DI) K9 Class Centrifugally Cast",
    serialNumber: "PIPE-DI-K9-250-W24",
    location: "Ward 24 Central Spine (Rampur Road to Gandhi Nagar)",
    diameterMm: 250,
    material: "Centrifugally Cast Ductile Iron with Portland Cement Mortar Lining",
    communicationProtocol: "Acoustic Noise Sensor Telemetry",
    lastHeartbeat: "Active Hydraulic Conduit",
    currentReading: "Flow: 42.5 m³/h · Velocity: 0.96 m/s",
    pressureBar: 3.3,
    flowRate: "42.50 m³/h",
    status: "normal",
    certification: "IS 8329:2000 / ISO 2531 Standard",
    description:
      "250mm K9 ductile iron transmission conduit delivering pressurized potable supply to XYZ Colony and ABC Colony distribution bifurcations.",
    installationDate: "05 Nov 2024",
  },
  branch_a_pipe: {
    id: "branch_a_pipe",
    name: "Branch A Distribution Pipeline (XYZ Colony)",
    category: "pipeline",
    manufacturer: "Supreme Industries",
    model: "PE-100 High-Density Polyethylene (HDPE) PN16",
    serialNumber: "PIPE-HDPE-110-BA",
    location: "XYZ Colony Lateral Sub-Feeder (Serves H-1024 & H-1025)",
    diameterMm: 110,
    material: "PE-100 Grade High Density Polyethylene (SDR 11)",
    communicationProtocol: "Branch Hydro-Pressure Node Monitoring",
    lastHeartbeat: "Continuous Conduit",
    currentReading: "Flow: 19.8 m³/h · Pressure: 2.75 bar",
    pressureBar: 2.75,
    flowRate: "19.80 m³/h",
    status: "normal",
    certification: "IS 4984 / ISO 4427",
    description:
      "110mm lateral branch distribution line serving 48 residential households including H-1024 (Ramesh Patil) and H-1025 (Priya Sharma).",
    installationDate: "12 Dec 2024",
  },
  branch_b_pipe: {
    id: "branch_b_pipe",
    name: "Branch B Distribution Pipeline (ABC Colony)",
    category: "pipeline",
    manufacturer: "Supreme Industries",
    model: "PE-100 High-Density Polyethylene (HDPE) PN16",
    serialNumber: "PIPE-HDPE-110-BB",
    location: "ABC Colony Lateral Sub-Feeder (Serves H-1026 & H-1027)",
    diameterMm: 110,
    material: "PE-100 Grade High Density Polyethylene (SDR 11)",
    communicationProtocol: "Branch Hydro-Pressure Node Monitoring",
    lastHeartbeat: "Continuous Conduit",
    currentReading: "Flow: 18.4 m³/h · Pressure: 2.80 bar",
    pressureBar: 2.8,
    flowRate: "18.40 m³/h",
    status: "normal",
    certification: "IS 4984 / ISO 4427",
    description:
      "110mm lateral branch serving 42 residential households in ABC Colony including H-1026 and H-1027.",
    installationDate: "15 Dec 2024",
  },
  smart_meter_1024: {
    id: "smart_meter_1024",
    name: "Smart Household Ultrasonic Water Meter (H-1024)",
    category: "household_meter",
    manufacturer: "Kamstrup",
    model: "flowIQ 2200 Ultrasonic Smart Water Meter",
    serialNumber: "KM-IQ22-IND-10247",
    location: "Household H-1024 Riser (Ramesh Patil · Ward 24)",
    diameterMm: 15,
    material: "Polyphenylene Sulfide (PPS) Composite Body",
    communicationProtocol: "LoRaWAN 865–867 MHz (India Frequency Band)",
    batteryLifeYears: 16,
    batteryPct: 94,
    rssiSignalDbm: -78,
    lastHeartbeat: "45s ago (LoRaWAN Class A packet)",
    currentReading: "12.8 L/min (0.77 m³/h) · Cumulative: 48.3 m³",
    pressureBar: 2.65,
    flowRate: "12.8 L/min",
    status: "normal",
    certification: "ISO 4064 Class C (R800) / OIML R49 / IP68 Submersible",
    description:
      "Static ultrasonic residential meter with no moving parts. Features integrated acoustic leak detection monitoring pipe vibrations to detect pinhole bursts and running toilets.",
    installationDate: "10 Feb 2025",
  },
  smart_meter_1025: {
    id: "smart_meter_1025",
    name: "Smart Household Ultrasonic Water Meter (H-1025)",
    category: "household_meter",
    manufacturer: "Kamstrup",
    model: "flowIQ 2200 Ultrasonic Smart Water Meter",
    serialNumber: "KM-IQ22-IND-10258",
    location: "Household H-1025 Riser (Priya Sharma · Ward 24)",
    diameterMm: 15,
    material: "Polyphenylene Sulfide (PPS) Composite Body",
    communicationProtocol: "LoRaWAN 865–867 MHz",
    batteryLifeYears: 16,
    batteryPct: 89,
    rssiSignalDbm: -82,
    lastHeartbeat: "1m 10s ago",
    currentReading: "9.4 L/min (0.56 m³/h) · Cumulative: 39.1 m³",
    pressureBar: 2.68,
    flowRate: "9.4 L/min",
    status: "normal",
    certification: "ISO 4064 Class C / IP68",
    description:
      "Ultrasonic meter transmitting consumption packets and tamper flags every 15 minutes over municipal LoRaWAN gateway.",
    installationDate: "11 Feb 2025",
  },
  smart_meter_1026: {
    id: "smart_meter_1026",
    name: "Smart Household Water Meter (H-1026)",
    category: "household_meter",
    manufacturer: "Sensus / Xylem",
    model: "iPERL High-Dynamic Smart Residential Meter",
    serialNumber: "SN-IPERL-IND-10269",
    location: "Household H-1026 Riser (Sunil Verma · Ward 24)",
    diameterMm: 15,
    material: "Composite Lead-Free Hydro-Polymer",
    communicationProtocol: "NB-IoT / LoRaWAN Hybrid Radio",
    batteryLifeYears: 15,
    batteryPct: 91,
    rssiSignalDbm: -80,
    lastHeartbeat: "2m ago",
    currentReading: "10.2 L/min (0.61 m³/h) · Cumulative: 52.4 m³",
    pressureBar: 2.7,
    flowRate: "10.2 L/min",
    status: "normal",
    certification: "OIML R49 / ISO 4064 Class D",
    description:
      "Electromagnetic solid-state measuring meter providing continuous low-flow detection starting from 1 L/h.",
    installationDate: "12 Feb 2025",
  },
  smart_meter_1027: {
    id: "smart_meter_1027",
    name: "Smart Household Water Meter (H-1027)",
    category: "household_meter",
    manufacturer: "Sensus / Xylem",
    model: "iPERL High-Dynamic Smart Residential Meter",
    serialNumber: "SN-IPERL-IND-10270",
    location: "Household H-1027 Riser (Kavita Rao · Ward 24)",
    diameterMm: 15,
    material: "Composite Lead-Free Hydro-Polymer",
    communicationProtocol: "NB-IoT / LoRaWAN",
    batteryLifeYears: 15,
    batteryPct: 96,
    rssiSignalDbm: -75,
    lastHeartbeat: "30s ago",
    currentReading: "8.1 L/min (0.49 m³/h) · Cumulative: 44.0 m³",
    pressureBar: 2.72,
    flowRate: "8.1 L/min",
    status: "normal",
    certification: "OIML R49 / ISO 4064 Class D",
    description:
      "Solid-state smart residential meter with reverse flow alarm and burst leak detection.",
    installationDate: "14 Feb 2025",
  },
  sluice_valve: {
    id: "sluice_valve",
    name: "Motorized DMA Control Sluice Valve",
    category: "valve",
    manufacturer: "AVK Valves",
    model: "Series 756 / Rotork Electric Actuator",
    serialNumber: "AVK-756-DN200-ROT",
    location: "Ward 24 Distribution Bifurcation Chamber",
    diameterMm: 200,
    material: "Resilient Seated Ductile Iron Valve",
    communicationProtocol: "Modbus RTU over RS485",
    lastHeartbeat: "Active Position: 100% Fully Open",
    currentReading: "Position: 100% Open · Pressure Drop: 0.05 bar",
    pressureBar: 3.35,
    flowRate: "42.5 m³/h Controlled Flow",
    status: "normal",
    certification: "BS EN 1074-1 & 2 / WRAS Approved",
    description:
      "Electric actuator valve modulating inlet pressure to manage pressure transients and isolate District Metered Area during repairs.",
    installationDate: "18 Jan 2025",
  },
};

interface WaterNetwork3DProps {
  scenarioId?: string;
  onSelectComponent?: (spec: WaterComponentSpec) => void;
  selectedComponentId?: string | null;
  flowVelocityMultiplier?: number;
}

export function WaterNetwork3D({
  scenarioId = "scenario_normal",
  onSelectComponent,
  selectedComponentId,
  flowVelocityMultiplier = 1,
}: WaterNetwork3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Active scenario flags
  const isHouseholdLeak = scenarioId === "scenario_household_leak";
  const isPipelineLoss = scenarioId === "scenario_pipeline_leak";
  const isSensorOffline = scenarioId === "scenario_sensor_offline";
  const isResolved = scenarioId === "scenario_resolved";

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Dimensions
    const width = container.clientWidth || 800;
    const height = 440;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 26);
    camera.lookAt(0, 1, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.error("WebGL failed to initialize:", e);
      return;
    }

    const isDark = resolvedTheme === "dark";
    const waterColor = isPipelineLoss ? 0xe58e26 : 0x0ea5e9;
    const pipeColor = isDark ? 0x223242 : 0x7c98b3;
    const groundColor = isDark ? 0x141a20 : 0xf2ece4;

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x90a4ae : 0xffffff,
      isDark ? 0.9 : 1.3
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 1.5, 30);
    blueLight.position.set(-10, 5, 0);
    scene.add(blueLight);

    // Ground Plane with grid
    const groundGeo = new THREE.PlaneGeometry(36, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(
      36,
      36,
      isDark ? 0x2d3e50 : 0xd1c4b2,
      isDark ? 0x1b2734 : 0xe5dcd1
    );
    gridHelper.position.y = -0.48;
    scene.add(gridHelper);

    // Raycasting group for click inspection
    const clickableObjects: THREE.Object3D[] = [];

    // Helper to create pipe segments
    const pipeMaterial = new THREE.MeshStandardMaterial({
      color: pipeColor,
      metalness: 0.5,
      roughness: 0.35,
      transparent: true,
      opacity: 0.82,
    });

    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.2,
    });

    const warningPipeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.3,
    });

    // 1. Water Treatment Plant / Reservoir Tank (Supplier Station)
    const tankGroup = new THREE.Group();
    tankGroup.position.set(-14, 0, 0);

    const tankBaseGeo = new THREE.CylinderGeometry(2.5, 2.7, 5, 24);
    const tankBaseMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x2a3b4c : 0xa0b2c6,
      metalness: 0.4,
      roughness: 0.4,
    });
    const tankBase = new THREE.Mesh(tankBaseGeo, tankBaseMat);
    tankBase.position.y = 2.5;
    tankBase.castShadow = true;
    tankGroup.add(tankBase);

    // Water level inside reservoir (glass cutout)
    const tankLevelGeo = new THREE.CylinderGeometry(2.35, 2.35, 3.8, 20);
    const tankLevelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
    });
    const tankLevel = new THREE.Mesh(tankLevelGeo, tankLevelMat);
    tankLevel.position.y = 2.0;
    tankGroup.add(tankLevel);

    // Supplier label ring
    const ringGeo = new THREE.TorusGeometry(2.6, 0.12, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4.8;
    tankGroup.add(ring);

    tankGroup.userData = { componentId: "bulk_meter" };
    clickableObjects.push(tankGroup);
    scene.add(tankGroup);

    // 2. Zone Bulk Electromagnetic Flow Meter (DN200)
    const meterGroup = new THREE.Group();
    meterGroup.position.set(-9.5, 0.4, 0);

    const meterFlangeGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16);
    meterFlangeGeo.rotateZ(Math.PI / 2);
    const meterMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.7,
      roughness: 0.25,
    });
    const meterBody = new THREE.Mesh(meterFlangeGeo, meterMat);
    meterGroup.add(meterBody);

    // Transmitter head box (Electronics / Display)
    const boxGeo = new THREE.BoxGeometry(0.7, 0.9, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0x334155,
      metalness: 0.3,
      roughness: 0.5,
    });
    const transmitterBox = new THREE.Mesh(boxGeo, boxMat);
    transmitterBox.position.set(0, 1.1, 0);
    meterGroup.add(transmitterBox);

    // Digital LCD display screen on transmitter
    const screenGeo = new THREE.PlaneGeometry(0.45, 0.3);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.1, 0.31);
    meterGroup.add(screen);

    meterGroup.userData = { componentId: "bulk_meter" };
    clickableObjects.push(meterGroup);
    scene.add(meterGroup);

    // 3. Zone Entry Pressure Sensor (Danfoss MBS 3000)
    const pressureGroup = new THREE.Group();
    pressureGroup.position.set(-6.5, 0.5, 0);

    const sensorStemGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.15,
    });
    const sensorStem = new THREE.Mesh(sensorStemGeo, sensorMat);
    sensorStem.position.y = 0.5;
    pressureGroup.add(sensorStem);

    const sensorCapGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12);
    const sensorCapMat = new THREE.MeshStandardMaterial({ color: 0xe11d48 });
    const sensorCap = new THREE.Mesh(sensorCapGeo, sensorCapMat);
    sensorCap.position.y = 1.0;
    pressureGroup.add(sensorCap);

    pressureGroup.userData = { componentId: "pressure_inlet" };
    clickableObjects.push(pressureGroup);
    scene.add(pressureGroup);

    // 4. Main Feeder Pipeline: from Reservoir (-14) to Junction (-1.5)
    const mainPipeGeo = new THREE.CylinderGeometry(0.45, 0.45, 12, 16);
    mainPipeGeo.rotateZ(Math.PI / 2);
    const mainPipe = new THREE.Mesh(mainPipeGeo, pipeMaterial);
    mainPipe.position.set(-7.5, 0.4, 0);
    mainPipe.castShadow = true;
    mainPipe.userData = { componentId: "main_pipe" };
    clickableObjects.push(mainPipe);
    scene.add(mainPipe);

    // 5. Bifurcation Junction (J-01) with Sluice Valve
    const valveGroup = new THREE.Group();
    valveGroup.position.set(-1.5, 0.4, 0);

    const valveJuncGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const valveJuncMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      metalness: 0.6,
      roughness: 0.3,
    });
    const valveJunc = new THREE.Mesh(valveJuncGeo, valveJuncMat);
    valveGroup.add(valveJunc);

    // Handwheel / Actuator stem
    const valveStemGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12);
    const valveStem = new THREE.Mesh(valveStemGeo, sensorMat);
    valveStem.position.y = 0.7;
    valveGroup.add(valveStem);

    const wheelGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.y = 1.2;
    valveGroup.add(wheel);

    valveGroup.userData = { componentId: "sluice_valve" };
    clickableObjects.push(valveGroup);
    scene.add(valveGroup);

    // 6. Branch A Pipeline (Heading towards Z = -4.5, XYZ Colony)
    const branchAPipeGeo = new THREE.CylinderGeometry(0.3, 0.3, 10, 16);
    branchAPipeGeo.rotateZ(Math.PI / 2);
    const branchAPipeMat = isPipelineLoss ? warningPipeMaterial : pipeMaterial;
    const branchAPipe = new THREE.Mesh(branchAPipeGeo, branchAPipeMat);
    branchAPipe.position.set(4, 0.4, -4.5);
    branchAPipe.userData = { componentId: "branch_a_pipe" };
    clickableObjects.push(branchAPipe);
    scene.add(branchAPipe);

    // Connector pipe from valve to Branch A
    const connectorAGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.8, 16);
    connectorAGeo.rotateX(Math.PI / 2);
    const connectorA = new THREE.Mesh(connectorAGeo, branchAPipeMat);
    connectorA.position.set(-1.5, 0.4, -2.3);
    scene.add(connectorA);

    // 7. Branch B Pipeline (Heading towards Z = +4.5, ABC Colony)
    const branchBPipeGeo = new THREE.CylinderGeometry(0.3, 0.3, 10, 16);
    branchBPipeGeo.rotateZ(Math.PI / 2);
    const branchBPipe = new THREE.Mesh(branchBPipeGeo, pipeMaterial);
    branchBPipe.position.set(4, 0.4, 4.5);
    branchBPipe.userData = { componentId: "branch_b_pipe" };
    clickableObjects.push(branchBPipe);
    scene.add(branchBPipe);

    // Connector pipe from valve to Branch B
    const connectorBGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.8, 16);
    connectorBGeo.rotateX(Math.PI / 2);
    const connectorB = new THREE.Mesh(connectorBGeo, pipeMaterial);
    connectorB.position.set(-1.5, 0.4, 2.3);
    scene.add(connectorB);

    // 8. Residential Households & Smart Water Meters
    const housesMeta = [
      {
        id: "smart_meter_1024",
        name: "H-1024",
        owner: "Ramesh Patil",
        pos: [8, 0, -6.5],
        branch: "A",
        warning: isHouseholdLeak,
      },
      {
        id: "smart_meter_1025",
        name: "H-1025",
        owner: "Priya Sharma",
        pos: [12, 0, -6.5],
        branch: "A",
        warning: false,
      },
      {
        id: "smart_meter_1026",
        name: "H-1026",
        owner: "Sunil Verma",
        pos: [8, 0, 6.5],
        branch: "B",
        warning: isSensorOffline,
      },
      {
        id: "smart_meter_1027",
        name: "H-1027",
        owner: "Kavita Rao",
        pos: [12, 0, 6.5],
        branch: "B",
        warning: false,
      },
    ];

    housesMeta.forEach((h) => {
      const houseGroup = new THREE.Group();
      houseGroup.position.set(h.pos[0], h.pos[1], h.pos[2]);

      // House main volume
      const houseBodyGeo = new THREE.BoxGeometry(2.4, 2.2, 2.4);
      const houseBodyMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x273648 : 0xdfd3c3,
        roughness: 0.6,
      });
      const houseBody = new THREE.Mesh(houseBodyGeo, houseBodyMat);
      houseBody.position.y = 1.1;
      houseBody.castShadow = true;
      houseGroup.add(houseBody);

      // Sloped Roof
      const roofGeo = new THREE.ConeGeometry(2.1, 1.2, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x7c2d12 : 0x9a3412,
        roughness: 0.4,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 2.8;
      houseGroup.add(roof);

      // Smart Water Meter Riser outside the house
      const meterRiserGroup = new THREE.Group();
      const zOffset = h.branch === "A" ? 1.8 : -1.8;
      meterRiserGroup.position.set(0, 0, zOffset);

      // Vertical copper/brass riser pipe
      const riserPipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
      const riserMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        metalness: 0.8,
        roughness: 0.3,
      });
      const riserPipe = new THREE.Mesh(riserPipeGeo, riserMat);
      riserPipe.position.y = 0.6;
      meterRiserGroup.add(riserPipe);

      // Smart Ultrasonic Meter unit (flowIQ / iPERL)
      const meterBoxGeo = new THREE.BoxGeometry(0.35, 0.3, 0.25);
      const meterBoxMat = new THREE.MeshStandardMaterial({
        color: h.warning ? 0xf59e0b : 0x059669,
        metalness: 0.5,
        roughness: 0.3,
      });
      const meterUnit = new THREE.Mesh(meterBoxGeo, meterBoxMat);
      meterUnit.position.y = 0.8;
      meterRiserGroup.add(meterUnit);

      // Pulsing LoRaWAN antenna / beacon sphere
      const beaconGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: h.warning ? 0xf59e0b : 0x38bdf8,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 1.15;
      meterRiserGroup.add(beacon);

      // Connect lateral line from branch pipe to household riser
      const latLineGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8);
      latLineGeo.rotateX(Math.PI / 2);
      const latLine = new THREE.Mesh(latLineGeo, pipeMaterial);
      latLine.position.set(0, 0.1, zOffset / 2);
      houseGroup.add(latLine);

      houseGroup.add(meterRiserGroup);
      houseGroup.userData = { componentId: h.id };
      clickableObjects.push(houseGroup);
      scene.add(houseGroup);
    });

    // 9. Animated Water Flow Particles along the pipelines
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Initialize along main pipe [-14 to -1.5]
      particlePositions[i * 3] = -14 + Math.random() * 26;
      particlePositions[i * 3 + 1] = 0.4 + (Math.random() - 0.5) * 0.15;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      particleSpeeds[i] = (0.05 + Math.random() * 0.04) * flowVelocityMultiplier;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color: waterColor,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Interactive Raycaster for Clicks & Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        // Find ancestor with componentId
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && !curr.userData?.componentId) {
          curr = curr.parent;
        }
        if (curr && curr.userData?.componentId) {
          const compId = curr.userData.componentId;
          const spec = HARDWARE_SPECS[compId];
          if (spec && onSelectComponent) {
            onSelectComponent(spec);
          }
        }
      }
    };

    const onPointerMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && !curr.userData?.componentId) {
          curr = curr.parent;
        }
        if (curr && curr.userData?.componentId) {
          const spec = HARDWARE_SPECS[curr.userData.componentId];
          setHoveredLabel(spec?.name || null);
          canvas.style.cursor = "pointer";
          return;
        }
      }
      setHoveredLabel(null);
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);

    // Orbit Drag Controls (Manual lightweight Euler orbit)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = 0;
    let cameraHeight = 16;
    const cameraRadius = 26;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraAngle -= deltaX * 0.006;
      cameraHeight = Math.max(8, Math.min(25, cameraHeight - deltaY * 0.04));

      camera.position.x = Math.sin(cameraAngle) * cameraRadius;
      camera.position.z = Math.cos(cameraAngle) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(0, 1, 0);

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Flow particle animation
      const posArray = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += particleSpeeds[i];
        if (posArray[i * 3] > 14) {
          posArray[i * 3] = -14;
        }

        // Branch bifurcation splitting
        if (posArray[i * 3] > -1.5) {
          // split half to Z = -4.5 and half to Z = +4.5
          const branchTargetZ = i % 2 === 0 ? -4.5 : 4.5;
          posArray[i * 3 + 2] = THREE.MathUtils.lerp(
            posArray[i * 3 + 2],
            branchTargetZ,
            0.08
          );
        } else {
          posArray[i * 3 + 2] = THREE.MathUtils.lerp(
            posArray[i * 3 + 2],
            0,
            0.1
          );
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Pulsing effect on warning pipeline or leak
      if (isPipelineLoss) {
        warningPipeMaterial.emissiveIntensity =
          0.6 + Math.sin(time * 5) * 0.4;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.dispose();
    };
  }, [resolvedTheme, scenarioId, flowVelocityMultiplier, isHouseholdLeak, isPipelineLoss, isSensorOffline]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-border bg-card/60 backdrop-blur-md shadow-inner">
      {/* 3D Canvas element */}
      <div ref={containerRef} className="relative w-full h-[440px]">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />

        {/* Orbit hint & active scenario status overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-background/85 border border-border backdrop-blur-md text-foreground shadow-sm flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-cyan-ink animate-pulse" />
            <span>Supplier-to-Receiver 3D SCADA Pipeline</span>
          </div>

          {hoveredLabel && (
            <div className="px-3 py-1 rounded-full text-xs font-mono bg-primary text-primary-foreground shadow-md transition-all">
              {hoveredLabel}
            </div>
          )}
        </div>

        {/* Flow Legend & Interaction Guide */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground bg-background/80 px-3 py-1.5 rounded-xl border border-border/80 backdrop-blur-sm shadow-sm">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              <span>Bulk Zone Inflow</span>
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-stream-water" />
              <span>DI K9 Feeder</span>
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-positive" />
              <span>Household Smart Meters</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground bg-background/80 px-3 py-1.5 rounded-xl border border-border/80 backdrop-blur-sm shadow-sm">
            Drag to Rotate 3D Angle · Click any component to inspect specs
          </div>
        </div>
      </div>
    </div>
  );
}
