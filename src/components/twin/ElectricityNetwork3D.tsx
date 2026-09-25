"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";
import {
  Activity,
  AirVent,
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Fan,
  HelpCircle,
  Layers,
  Lightbulb,
  MapPin,
  Power,
  Radio,
  RefreshCw,
  Refrigerator,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Tv,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTwinStore } from "@/stores/twinStore";
import type { TwinDeviceId } from "@/types";

export interface ElectricityComponentSpec {
  id: string;
  name: string;
  category:
    | "substation"
    | "solar_pv"
    | "smart_meter"
    | "mcb_panel"
    | "appliance_ac"
    | "appliance_geyser"
    | "appliance_fridge"
    | "appliance_fan"
    | "appliance_lights"
    | "appliance_tv"
    | "appliance_washer"
    | "appliance_pump"
    | "appliance_ev";
  twinDeviceId?: TwinDeviceId;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  voltageV: number;
  currentA?: number;
  powerFactor?: number;
  ratedKw: number;
  activeKw: number;
  frequencyHz?: number;
  status: "active" | "standby" | "off" | "solar_exporting";
  communicationProtocol: string;
  certification: string;
  description: string;
  installationDate: string;
}

export const ELECTRICITY_SPECS: Record<string, ElectricityComponentSpec> = {
  substation_transformer: {
    id: "substation_transformer",
    name: "11 kV / 415 V Municipal Distribution Substation",
    category: "substation",
    manufacturer: "ABB / Siemens",
    model: "Cast Resin Dry-Type 500 kVA Step-Down Transformer",
    serialNumber: "TX-11KV-W24-SEC2-09",
    location: "Ward 24 Feeder 4 Intake Substation (Gandhi Nagar)",
    voltageV: 415,
    frequencyHz: 50.0,
    ratedKw: 500,
    activeKw: 342,
    status: "active",
    communicationProtocol: "IEC 61850 / SCADA Modbus TCP over Optical Fiber",
    certification: "IS 1180 (Part 1):2014 / IEC 60076 / CEA Grid Standards",
    description:
      "Municipal distribution transformer stepping down 11 kV grid feeder to 415 V 3-phase (230 V single-phase). Telemetry continuously measures substation load, power factor, and voltage sag/swell.",
    installationDate: "10 Oct 2024",
  },
  solar_pv_array: {
    id: "solar_pv_array",
    name: "Rooftop Solar PV Array & Hybrid Inverter",
    category: "solar_pv",
    manufacturer: "Tata Power Solar / Fronius",
    model: "3.2 kWp Monocrystalline PERC Array + Primo GEN24 3.0 kW Inverter",
    serialNumber: "SOLAR-PV-3200-TP",
    location: "Household H-1024 Main Roof (15° South Tilt)",
    voltageV: 230,
    ratedKw: 3.2,
    activeKw: 2.4,
    powerFactor: 0.99,
    status: "solar_exporting",
    communicationProtocol: "Wi-Fi & Modbus SunSpec to Savera Home Hub",
    certification: "IEC 61215 / IEC 61730 / MNRE Approved Tier-1",
    description:
      "High-efficiency monocrystalline solar array generating clean power for daytime household loads and exporting surplus to the municipal grid under net-metering regulations.",
    installationDate: "12 Nov 2024",
  },
  smart_meter_electric: {
    id: "smart_meter_electric",
    name: "Bi-Directional Smart Net Energy Meter",
    category: "smart_meter",
    manufacturer: "Schneider Electric / L&T Smart Meters",
    model: "Acuvim II / Gen-4 Bi-Directional DLMS Smart Energy Meter",
    serialNumber: "SM-LT-DLMS-88402",
    location: "Household H-1024 Exterior Meter Enclosure",
    voltageV: 231.4,
    currentA: 5.1,
    powerFactor: 0.97,
    frequencyHz: 50.02,
    ratedKw: 10.0,
    activeKw: 1.15,
    status: "active",
    communicationProtocol: "LoRaWAN 865 MHz (India Band) & DLMS/COSEM HDLC",
    certification: "IS 16444:2015 / IS 15959 / OIML R46 Class 1.0",
    description:
      "4-quadrant bi-directional solid-state smart meter recording active import/export energy, reactive power, power factor, and voltage harmonics with automated load-disconnect contactor.",
    installationDate: "15 Jan 2025",
  },
  mcb_panel: {
    id: "mcb_panel",
    name: "Main Distribution Board (MDB) & Smart Contactor",
    category: "mcb_panel",
    manufacturer: "Hager / Legrand",
    model: "Optiline 12-Way Consumer Unit with 30mA RCD & IoT Relays",
    serialNumber: "MDB-H1024-MAIN",
    location: "Entrance Foyer Utility Recess",
    voltageV: 230,
    ratedKw: 12.0,
    activeKw: 1.15,
    status: "active",
    communicationProtocol: "Zigbee 3.0 / OpenADR 2.0b Shedding Protocol",
    certification: "IS 13032 / IEC 61439-3 Standard",
    description:
      "Residential distribution board equipped with Type-A 30mA Residual Current Device (RCD), surge protection devices, and smart DIN-rail contactors for autonomous demand response.",
    installationDate: "15 Jan 2025",
  },
  appliance_ac: {
    id: "appliance_ac",
    twinDeviceId: "ac",
    name: "Split AC 1.5 T (5-Star Inverter)",
    category: "appliance_ac",
    manufacturer: "Daikin / Panasonic",
    model: "FTKM50 1.5 Ton Variable Speed Inverter AC (R32)",
    serialNumber: "AC-15T-INV-4412",
    location: "Living Room (Zone A)",
    voltageV: 230,
    currentA: 5.0,
    ratedKw: 1.5,
    activeKw: 1.15,
    powerFactor: 0.95,
    status: "active",
    communicationProtocol: "Matter over Wi-Fi / IR Transceiver Interlock",
    certification: "BEE 5-Star (ISEER 5.4) / IS 1391 Standard",
    description:
      "Variable-speed rotary compressor air conditioner. Features dynamic setpoint optimization: shifting setpoint from 24°C to 26°C reduces duty cycle by 24%, saving up to ₹340/month.",
    installationDate: "20 Jan 2025",
  },
  appliance_geyser: {
    id: "appliance_geyser",
    twinDeviceId: "geyser",
    name: "Storage Geyser 15 L (2.0 kW)",
    category: "appliance_geyser",
    manufacturer: "AO Smith / Racold",
    model: "HSE-SGS-015 Blue Diamond Glass-Lined 2 kW Geyser",
    serialNumber: "GEYSER-15L-2KW-881",
    location: "Bath & Utility (Zone C)",
    voltageV: 230,
    currentA: 8.7,
    ratedKw: 2.0,
    activeKw: 0.0,
    powerFactor: 0.99,
    status: "standby",
    communicationProtocol: "Smart Heavy-Duty 16A IoT Plug with Power Metrology",
    certification: "BEE 5-Star / IS 2082 Domestic Water Heater Standard",
    description:
      "High-power 2.0 kW storage water heater. Autonomous policy disconnects daytime standby heating to prevent cyclic thermal loss, saving ₹230/month.",
    installationDate: "22 Jan 2025",
  },
  appliance_fridge: {
    id: "appliance_fridge",
    twinDeviceId: "fridge",
    name: "Inverter Refrigerator 260 L",
    category: "appliance_fridge",
    manufacturer: "Samsung / LG",
    model: "Smart Inverter Double Door Frost-Free Refrigerator",
    serialNumber: "FRIDGE-260L-INV-339",
    location: "Kitchen & Dining (Zone B)",
    voltageV: 230,
    currentA: 0.35,
    ratedKw: 0.15,
    activeKw: 0.065,
    powerFactor: 0.92,
    status: "active",
    communicationProtocol: "Smart Diagnosis / Internal Power Management",
    certification: "BEE 5-Star / IS 15750 Energy Efficiency Standard",
    description:
      "Continuous baseline domestic appliance with variable-frequency linear compressor running 24/7. Modulates chilling rate during high-ambient daytime hours.",
    installationDate: "18 Jan 2025",
  },
  appliance_fan: {
    id: "appliance_fan",
    twinDeviceId: "fan",
    name: "BLDC Energy-Saving Ceiling Fans (x4)",
    category: "appliance_fan",
    manufacturer: "Atomberg / Havells",
    model: "Renesa 1200mm Brushless DC 28W Smart Motor Fans",
    serialNumber: "BLDC-FAN-4X-SET",
    location: "Living Room & Bedrooms",
    voltageV: 230,
    ratedKw: 0.3,
    activeKw: 0.11,
    powerFactor: 0.98,
    status: "active",
    communicationProtocol: "RF Remote & Zigbee Ceiling Rose",
    certification: "BEE 5-Star Super-Efficient Equipment Program (SEEP)",
    description:
      "Brushless DC motor ceiling fans drawing only 28W per unit compared to 75W traditional induction fans, cutting continuous ventilation energy by 65%.",
    installationDate: "15 Jan 2025",
  },
  appliance_lights: {
    id: "appliance_lights",
    twinDeviceId: "lights",
    name: "Architectural LED Fixtures (x8 Zones)",
    category: "appliance_lights",
    manufacturer: "Philips Hue / Wipro",
    model: "Smart Tunable White Architectural LED Downlights (9W each)",
    serialNumber: "LED-ARCH-8Z-PHILIPS",
    location: "Habitat Living, Dining & Bedrooms",
    voltageV: 230,
    ratedKw: 0.08,
    activeKw: 0.08,
    powerFactor: 0.95,
    status: "active",
    communicationProtocol: "Zigbee Light Link Mesh / Automated Daylight Harvesting",
    certification: "IS 16102 LED Standard / RoHS Compliant",
    description:
      "High-CRI architectural LED illumination with automatic ambient daylight sensing, dimming interior lighting as natural solar irradiance increases.",
    installationDate: "15 Jan 2025",
  },
  appliance_tv: {
    id: "appliance_tv",
    twinDeviceId: "tv",
    name: '55" 4K Smart OLED TV & Media Hub',
    category: "appliance_tv",
    manufacturer: "Sony / LG",
    model: 'Bravia XR 55" OLED 4K HDR Television & Surround Receiver',
    serialNumber: "OLED-55-4K-SONY",
    location: "Living Room (Zone A)",
    voltageV: 230,
    ratedKw: 0.1,
    activeKw: 0.1,
    powerFactor: 0.94,
    status: "active",
    communicationProtocol: "Matter over Thread / CEC Bus",
    certification: "BEE Energy Standard / Eco-Standby Mode Certified",
    description:
      "Home entertainment media hub. Smart vampire-load auto-kill isolates phantom 18W standby draw when television remains inactive.",
    installationDate: "25 Jan 2025",
  },
  appliance_washing_machine: {
    id: "appliance_washing_machine",
    twinDeviceId: "washing_machine",
    name: "Front Load Inverter Washer (7 kg)",
    category: "appliance_washer",
    manufacturer: "Bosch / IFB",
    model: "Series 6 EcoSilence Drive Inverter 7 kg Front-Loader",
    serialNumber: "WASHER-7KG-BOSCH",
    location: "Bath & Utility (Zone C)",
    voltageV: 230,
    ratedKw: 1.8,
    activeKw: 0.0,
    powerFactor: 0.95,
    status: "standby",
    communicationProtocol: "Home Connect Wi-Fi / Solar-Run Automation",
    certification: "A+++ European Energy Rating / BEE 5-Star",
    description:
      "Intelligent inverter motor washing machine with solar-matching logic that initiates heavy wash and spin cycles automatically when solar generation exceeds 2.0 kW.",
    installationDate: "28 Jan 2025",
  },
  appliance_water_pump: {
    id: "appliance_water_pump",
    twinDeviceId: "water_pump",
    name: "Booster Water Pump 0.5 HP",
    category: "appliance_pump",
    manufacturer: "Crompton / Kirloskar",
    model: "Mini Master Plus 0.5 HP Self-Priming Regenerative Pump",
    serialNumber: "PUMP-05HP-CROM",
    location: "Ground Utility Pump Pit",
    voltageV: 230,
    ratedKw: 0.37,
    activeKw: 0.0,
    powerFactor: 0.88,
    status: "standby",
    communicationProtocol: "Float Switch Relay & Smart DIN Contactor",
    certification: "IS 8472 / BEE 4-Star Certified",
    description:
      "Domestic water lifting pump scheduled during morning off-peak hours to replenish overhead water tank without conflicting with evening electrical peak tariff hours.",
    installationDate: "16 Jan 2025",
  },
  appliance_ev_charger: {
    id: "appliance_ev_charger",
    twinDeviceId: "ev_charger",
    name: "Smart Level 2 EV Wallbox Charger (7.4 kW)",
    category: "appliance_ev",
    manufacturer: "Schneider Electric / ABB",
    model: "EVlink Home Smart 32A Single-Phase Wallbox with OCPP 1.6J",
    serialNumber: "EV-WALLBOX-7KW-SCH",
    location: "Driveway Carport Nook",
    voltageV: 230,
    currentA: 0.0,
    ratedKw: 7.4,
    activeKw: 0.0,
    powerFactor: 0.99,
    status: "standby",
    communicationProtocol: "OCPP 1.6J over Wi-Fi / Dynamic Load Balancing (DLB)",
    certification: "IEC 61851-1 / CE / ARAI Approved",
    description:
      "High-power residential EV charging station with dynamic load balancing that curtails charging during 18:00–22:00 peak hours and maximizes solar excess charging on weekends.",
    installationDate: "05 Feb 2025",
  },
};

interface ElectricityNetwork3DProps {
  onSelectComponent?: (spec: ElectricityComponentSpec) => void;
  selectedComponentId?: string;
}

export function ElectricityNetwork3D({
  onSelectComponent,
  selectedComponentId,
}: ElectricityNetwork3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { devices, setDevice, setAcTemp, toggleDevice } = useTwinStore();

  const [activeComponent, setActiveComponent] = useState<ElectricityComponentSpec>(
    ELECTRICITY_SPECS.smart_meter_electric
  );
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Sync selected component with prop
  useEffect(() => {
    if (selectedComponentId && ELECTRICITY_SPECS[selectedComponentId]) {
      setActiveComponent(ELECTRICITY_SPECS[selectedComponentId]);
    }
  }, [selectedComponentId]);

  // Dynamic values from twinStore
  const acDevice = devices.find((d) => d.id === "ac");
  const geyserDevice = devices.find((d) => d.id === "geyser");
  const fridgeDevice = devices.find((d) => d.id === "fridge");
  const fanDevice = devices.find((d) => d.id === "fan");
  const lightsDevice = devices.find((d) => d.id === "lights");
  const tvDevice = devices.find((d) => d.id === "tv");
  const washerDevice = devices.find((d) => d.id === "washing_machine");
  const pumpDevice = devices.find((d) => d.id === "water_pump");
  const evDevice = devices.find((d) => d.id === "ev_charger");

  const totalLoadKw = devices
    .filter((d) => d.on)
    .reduce((sum, d) => sum + d.kw, 0);

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

    // Camera (Isometric angle matching Image 2 Water SCADA perspective)
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(18, 15, 20);
    camera.lookAt(0, 1.8, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x241d18 : 0xfff5e6,
      isDark ? 1.4 : 1.8
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(20, 28, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Warm electrical aura pointlight
    const electricLight = new THREE.PointLight(0xf59e0b, 2.5, 25);
    electricLight.position.set(4, 5, 4);
    scene.add(electricLight);

    const solarLight = new THREE.PointLight(0x06b6d4, 2.0, 20);
    solarLight.position.set(-2, 6, -2);
    scene.add(solarLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Materials
    const groundGridMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x181411 : 0xf5eee6,
      roughness: 0.9,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x3f3f46 : 0xd4d4d8,
      roughness: 0.7,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0xf8fafc,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.2,
    });

    const solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
    });

    const applianceWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
    });

    // 1. Pedestal Base & Engineering Grid (matching Image 2's ground style)
    const baseGeo = new THREE.CylinderGeometry(9.5, 9.8, 0.4, 48);
    const baseMesh = new THREE.Mesh(baseGeo, groundGridMat);
    baseMesh.position.y = -0.2;
    baseMesh.receiveShadow = true;
    rootGroup.add(baseMesh);

    const borderGeo = new THREE.TorusGeometry(9.52, 0.05, 16, 64);
    const borderMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xd49a62 : 0x7c4d28,
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = Math.PI / 2;
    borderMesh.position.y = 0.02;
    rootGroup.add(borderMesh);

    const grid = new THREE.GridHelper(
      18,
      28,
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

    // 2. Municipal Distribution Substation Transformer (Left side)
    const subGroup = new THREE.Group();
    subGroup.position.set(-6.5, 0, -4.5);

    // Substation concrete pad
    const padGeo = new THREE.BoxGeometry(3.2, 0.3, 3.2);
    const padMesh = new THREE.Mesh(padGeo, concreteMat);
    padMesh.position.y = 0.15;
    padMesh.receiveShadow = true;
    subGroup.add(padMesh);

    // Transformer main tank (industrial green/metallic grey)
    const txTankGeo = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const txTankMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.3,
    });
    const txTank = new THREE.Mesh(txTankGeo, txTankMat);
    txTank.position.y = 1.35;
    txTank.castShadow = true;
    subGroup.add(txTank);
    registerClickable(txTank, "substation_transformer");

    // Cooling radiator fins (flanges on sides)
    for (let i = -0.7; i <= 0.7; i += 0.35) {
      const finGeo = new THREE.BoxGeometry(0.04, 1.6, 2.2);
      const finMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.7,
      });
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(i, 1.35, 0);
      subGroup.add(fin);
    }

    // High Voltage Ceramic Insulator Bushings (3x phases on top)
    for (let i = -0.5; i <= 0.5; i += 0.5) {
      const bushGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 12);
      const bushMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.2,
      });
      const bushing = new THREE.Mesh(bushGeo, bushMat);
      bushing.position.set(i, 2.7, 0);
      subGroup.add(bushing);
    }

    rootGroup.add(subGroup);

    // 3. 3D Architectural Household Structure (Center & Right)
    const houseGroup = new THREE.Group();
    houseGroup.position.set(1.5, 0, 0.5);

    // Ground floor living volume
    const groundFloorGeo = new THREE.BoxGeometry(5.4, 2.5, 5.0);
    const groundFloor = new THREE.Mesh(groundFloorGeo, glassMat);
    groundFloor.position.y = 1.25;
    groundFloor.castShadow = true;
    groundFloor.receiveShadow = true;
    houseGroup.add(groundFloor);

    // Floor edge lines for crisp architectural beauty
    const groundEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(groundFloorGeo),
      new THREE.LineBasicMaterial({
        color: isDark ? 0xd49a62 : 0x7c4d28,
        transparent: true,
        opacity: 0.6,
      })
    );
    groundFloor.add(groundEdges);

    // Upper Studio / Bedroom Level
    const upperFloorGeo = new THREE.BoxGeometry(3.6, 2.0, 3.8);
    const upperFloor = new THREE.Mesh(upperFloorGeo, glassMat);
    upperFloor.position.set(-0.8, 3.5, -0.5);
    upperFloor.castShadow = true;
    houseGroup.add(upperFloor);

    const upperEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(upperFloorGeo),
      new THREE.LineBasicMaterial({
        color: isDark ? 0xd49a62 : 0x7c4d28,
        transparent: true,
        opacity: 0.6,
      })
    );
    upperFloor.add(upperEdges);

    // Rooftop Solar PV Panels Array (tilted at 15°)
    const solarRooftopGroup = new THREE.Group();
    solarRooftopGroup.position.set(-0.8, 4.6, -0.5);
    solarRooftopGroup.rotation.x = -0.26; // ~15 degrees tilt

    const solarBedGeo = new THREE.BoxGeometry(3.8, 0.08, 4.0);
    const solarBed = new THREE.Mesh(solarBedGeo, darkTrimMat);
    solarRooftopGroup.add(solarBed);

    // 8x Individual Solar PV Cells grid
    for (let r = -1.2; r <= 1.2; r += 0.8) {
      for (let c = -1.2; c <= 1.2; c += 1.2) {
        const cellGeo = new THREE.BoxGeometry(0.7, 0.02, 1.1);
        const cellMesh = new THREE.Mesh(cellGeo, solarPanelMat);
        cellMesh.position.set(r, 0.05, c);
        solarRooftopGroup.add(cellMesh);
      }
    }
    houseGroup.add(solarRooftopGroup);
    registerClickable(solarBed, "solar_pv_array");

    // Main Distribution Board & Smart Net Meter on the exterior wall
    const meterBoardGroup = new THREE.Group();
    meterBoardGroup.position.set(-2.8, 1.4, 1.2);

    const meterBoxGeo = new THREE.BoxGeometry(0.2, 0.7, 0.5);
    const meterBox = new THREE.Mesh(meterBoxGeo, darkTrimMat);
    meterBoardGroup.add(meterBox);

    // Glowing LCD Screen on Smart Meter
    const lcdGeo = new THREE.PlaneGeometry(0.3, 0.2);
    const lcdMat = new THREE.MeshBasicMaterial({ color: 0x065f46 });
    const lcd = new THREE.Mesh(lcdGeo, lcdMat);
    lcd.rotation.y = -Math.PI / 2;
    lcd.position.set(-0.11, 0.1, 0);
    meterBoardGroup.add(lcd);

    // Pulse LED (1000 imp/kWh)
    const pulseLedGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const pulseLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const pulseLed = new THREE.Mesh(pulseLedGeo, pulseLedMat);
    pulseLed.position.set(-0.11, -0.1, 0.12);
    meterBoardGroup.add(pulseLed);

    houseGroup.add(meterBoardGroup);
    registerClickable(meterBox, "smart_meter_electric");

    // MCB Consumer Unit Panel
    const mcbBoxGeo = new THREE.BoxGeometry(0.18, 0.6, 0.4);
    const mcbBox = new THREE.Mesh(mcbBoxGeo, applianceWhiteMat);
    mcbBox.position.set(-2.8, 1.4, 0.2);
    houseGroup.add(mcbBox);
    registerClickable(mcbBox, "mcb_panel");

    // 4. Physical 3D Appliances inside the house

    // A. Split AC Unit (Mounted on living room wall)
    const acGroup = new THREE.Group();
    acGroup.position.set(1.5, 2.0, 2.4);

    const acGeo = new THREE.BoxGeometry(1.2, 0.35, 0.3);
    const acMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const acMesh = new THREE.Mesh(acGeo, acMat);
    acGroup.add(acMesh);

    // Thermal Aura glow under AC
    const acAuraGeo = new THREE.PlaneGeometry(1.4, 0.6);
    const acAuraMat = new THREE.MeshBasicMaterial({
      color: acDevice?.tempC === 26 ? 0x10b981 : 0x06b6d4,
      transparent: true,
      opacity: acDevice?.on ? 0.6 : 0.05,
      side: THREE.DoubleSide,
    });
    const acAura = new THREE.Mesh(acAuraGeo, acAuraMat);
    acAura.rotation.x = Math.PI / 2;
    acAura.position.set(0, -0.3, -0.2);
    acGroup.add(acAura);

    houseGroup.add(acGroup);
    registerClickable(acMesh, "appliance_ac");

    // B. Ceiling Fan with Rotating Blades
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0.5, 2.3, 0.8);

    const fanMotorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
    const fanMotorMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.7,
    });
    const fanMotor = new THREE.Mesh(fanMotorGeo, fanMotorMat);
    fanGroup.add(fanMotor);

    const fanRodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const fanRod = new THREE.Mesh(fanRodGeo, fanMotorMat);
    fanRod.position.y = 0.2;
    fanGroup.add(fanRod);

    const fanBladesGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.12, 0.015, 0.75);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.z = 0.4;
      const bladeArm = new THREE.Group();
      bladeArm.rotation.y = (i * Math.PI * 2) / 3;
      bladeArm.add(blade);
      fanBladesGroup.add(bladeArm);
    }
    fanGroup.add(fanBladesGroup);
    houseGroup.add(fanGroup);
    registerClickable(fanMotor, "appliance_fan");

    // C. 55" OLED Smart TV (Living Room)
    const tvGroup = new THREE.Group();
    tvGroup.position.set(1.8, 1.1, 0.8);

    const tvScreenGeo = new THREE.BoxGeometry(0.04, 0.75, 1.3);
    const tvMat = new THREE.MeshStandardMaterial({
      color: tvDevice?.on ? 0x0284c7 : 0x09090b,
      roughness: 0.1,
      metalness: 0.9,
    });
    const tvScreen = new THREE.Mesh(tvScreenGeo, tvMat);
    tvGroup.add(tvScreen);
    houseGroup.add(tvGroup);
    registerClickable(tvScreen, "appliance_tv");

    // D. Refrigerator (Kitchen Zone)
    const fridgeGeo = new THREE.BoxGeometry(0.65, 1.4, 0.65);
    const fridgeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.5,
      roughness: 0.3,
    });
    const fridgeMesh = new THREE.Mesh(fridgeGeo, fridgeMat);
    fridgeMesh.position.set(-1.8, 0.7, -1.2);
    houseGroup.add(fridgeMesh);
    registerClickable(fridgeMesh, "appliance_fridge");

    // E. Storage Water Geyser (Bath & Utility Zone)
    const geyserGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.75, 16);
    const geyserMat = new THREE.MeshStandardMaterial({
      color: geyserDevice?.on ? 0xf43f5e : 0xf8fafc,
      roughness: 0.3,
    });
    const geyserMesh = new THREE.Mesh(geyserGeo, geyserMat);
    geyserMesh.position.set(-1.8, 2.0, 1.6);
    houseGroup.add(geyserMesh);
    registerClickable(geyserMesh, "appliance_geyser");

    // F. Washing Machine (Utility Zone)
    const washerGeo = new THREE.BoxGeometry(0.6, 0.75, 0.6);
    const washerMesh = new THREE.Mesh(washerGeo, applianceWhiteMat);
    washerMesh.position.set(-1.8, 0.4, 1.6);
    houseGroup.add(washerMesh);
    registerClickable(washerMesh, "appliance_washer");

    // G. Booster Water Pump (Ground level)
    const pumpGeo = new THREE.BoxGeometry(0.4, 0.35, 0.4);
    const pumpMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const pumpMesh = new THREE.Mesh(pumpGeo, pumpMat);
    pumpMesh.position.set(-2.0, 0.2, 0.8);
    houseGroup.add(pumpMesh);
    registerClickable(pumpMesh, "appliance_water_pump");

    // H. EV Charger Wallbox (Driveway/Garage Nook)
    const evChargerGroup = new THREE.Group();
    evChargerGroup.position.set(2.8, 1.2, -1.8);

    const evBoxGeo = new THREE.BoxGeometry(0.18, 0.5, 0.35);
    const evBoxMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
    });
    const evBox = new THREE.Mesh(evBoxGeo, evBoxMat);
    evChargerGroup.add(evBox);

    const evLedGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const evLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const evLed = new THREE.Mesh(evLedGeo, evLedMat);
    evLed.position.set(0.1, 0.1, 0);
    evChargerGroup.add(evLed);

    houseGroup.add(evChargerGroup);
    registerClickable(evBox, "appliance_ev_charger");

    // I. Architectural Ceiling LED Downlights (Warm Volumetric glow)
    const lightsGroup = new THREE.Group();
    for (let lx = -1; lx <= 1.5; lx += 1.2) {
      for (let lz = -1; lz <= 1.5; lz += 1.2) {
        const ledGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);
        const ledMat = new THREE.MeshBasicMaterial({
          color: lightsDevice?.on ? 0xfef08a : 0x475569,
        });
        const ledDown = new THREE.Mesh(ledGeo, ledMat);
        ledDown.position.set(lx, 2.45, lz);
        lightsGroup.add(ledDown);
      }
    }
    houseGroup.add(lightsGroup);
    registerClickable(lightsGroup, "appliance_lights");

    rootGroup.add(houseGroup);

    // 5. Overhead Power Line & Flowing Energy Particles from Substation to Meter
    const powerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.5, 2.7, -4.5), // Substation top bushing
      new THREE.Vector3(-4.5, 3.8, -2.5),
      new THREE.Vector3(-2.8, 3.2, 0.5),
      new THREE.Vector3(-1.3, 1.4, 1.7), // House Smart Net Meter
    ]);

    const lineGeo = new THREE.TubeGeometry(powerCurve, 32, 0.04, 8, false);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
    });
    const powerLineMesh = new THREE.Mesh(lineGeo, lineMat);
    rootGroup.add(powerLineMesh);

    // Flowing Energy Particles along line
    const particleCount = 35;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleOffsets[i] = i / particleCount;
      const pt = powerCurve.getPoint(particleOffsets[i]);
      particlePositions[i * 3] = pt.x;
      particlePositions[i * 3 + 1] = pt.y;
      particlePositions[i * 3 + 2] = pt.z;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color: 0xf59e0b, // Amber glowing electricity
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const energyParticles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(energyParticles);

    // Raycasting & Mouse Tracking for 3D clickability
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
          const spec = ELECTRICITY_SPECS[specId];
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
          const spec = ELECTRICITY_SPECS[specId];
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

    // Orbit Drag Controls (Vanilla Three.js)
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
      camera.position.y = Math.max(4, Math.min(26, camera.position.y - deltaY * 0.05));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
      camera.position.clampLength(8, 48);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous slow rotation
      if (autoRotate && !isDragging) {
        rootGroup.rotation.y += 0.002;
      }

      // Rotate ceiling fan blades if fan is ON
      if (fanDevice?.on) {
        fanBladesGroup.rotation.y += 0.25;
      }

      // Pulse LED blinking (rate proportional to load kW)
      const pulseRate = Math.max(2, totalLoadKw * 4);
      pulseLedMat.color.setHex(
        Math.sin(elapsedTime * pulseRate) > 0 ? 0x10b981 : 0x064e3b
      );

      // Flowing energy particles motion
      const flowPos = particleGeo.attributes.position.array as Float32Array;
      const flowSpeed = 0.006;

      for (let i = 0; i < particleCount; i++) {
        particleOffsets[i] = (particleOffsets[i] + flowSpeed) % 1.0;
        const pt = powerCurve.getPoint(particleOffsets[i]);
        flowPos[i * 3] = pt.x;
        flowPos[i * 3 + 1] = pt.y + Math.sin(elapsedTime * 4 + i) * 0.02;
        flowPos[i * 3 + 2] = pt.z;
      }
      particleGeo.attributes.position.needsUpdate = true;

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
  }, [
    isDark,
    autoRotate,
    acDevice?.on,
    acDevice?.tempC,
    geyserDevice?.on,
    fanDevice?.on,
    lightsDevice?.on,
    tvDevice?.on,
    totalLoadKw,
  ]);

  // Handler for direct power toggle from 3D Inspector
  const handleToggleCurrentAppliance = () => {
    if (activeComponent.twinDeviceId) {
      toggleDevice(activeComponent.twinDeviceId);
    }
  };

  const currentTwinDevice = activeComponent.twinDeviceId
    ? devices.find((d) => d.id === activeComponent.twinDeviceId)
    : null;

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
              <span>Electricity Micro-Grid 3D SCADA · 60 FPS</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 border border-border text-2xs font-mono text-muted-foreground backdrop-blur-md">
              <Radio className="size-3 text-positive" />
              <span>Bi-Directional Net Metering Active</span>
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
            <Zap className="size-4 text-amber-500" />
            <div className="text-xs font-mono">
              <span className="text-muted-foreground">Focus: </span>
              <strong className="text-foreground font-bold">
                {hoveredName ?? activeComponent.name}
              </strong>
              <span className="text-2xs text-muted-foreground ml-2">
                (Click any 3D node or appliance to inspect & toggle)
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

      {/* Slide-In Hardware Component Specification & Control Drawer */}
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

          {/* Interactive Appliance Control Trigger (If component is a controllable twin appliance) */}
          {currentTwinDevice && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Power className="size-4 text-amber-500" />
                  <span>Interactive 3D Actuator</span>
                </span>
                <span
                  className={`text-2xs font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    currentTwinDevice.on
                      ? "bg-positive/20 text-positive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentTwinDevice.on ? "Online · Drawing Load" : "Standby / Off"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={currentTwinDevice.on ? "destructive" : "default"}
                  onClick={handleToggleCurrentAppliance}
                  className="w-full text-xs font-bold gap-1.5"
                >
                  <Power className="size-3.5" />
                  <span>
                    {currentTwinDevice.on ? "Turn Appliance OFF" : "Simulate Power ON"}
                  </span>
                </Button>

                {currentTwinDevice.id === "ac" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAcTemp(currentTwinDevice.tempC === 26 ? 24 : 26)}
                    className="text-xs font-bold gap-1 shrink-0"
                  >
                    <Thermometer className="size-3.5 text-positive" />
                    <span>
                      {currentTwinDevice.tempC === 26 ? "26°C (Eco)" : "24°C (Std)"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Real-time Electrical Telemetry Readout */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Electrical Telemetry</span>
              <span className="flex items-center gap-1 text-positive font-bold">
                <span className="size-2 rounded-full bg-positive animate-pulse" />
                <span>Synchronized</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Active Load
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {currentTwinDevice
                    ? currentTwinDevice.on
                      ? `${currentTwinDevice.kw} kW`
                      : "0.00 kW"
                    : `${activeComponent.activeKw} kW`}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Line Voltage
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.voltageV} V AC
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Power Factor
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.powerFactor ?? "0.98"} PF
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-2xs text-muted-foreground block">
                  Frequency
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {activeComponent.frequencyHz ?? "50.0"} Hz
                </strong>
              </div>
            </div>
          </div>

          {/* Technical Specifications Sheet */}
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
