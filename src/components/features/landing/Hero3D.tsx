"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Cpu,
  Droplet,
  Flame,
  Gauge,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** Scene palette per theme ("Earth" light / "Espresso" dark). */
const HERO_PALETTE = {
  light: {
    ambient: 0xfff4e6,
    ambientIntensity: 1.1,
    key: 0xffe2c0,
    water: 0x1d6c9c,
    gold: 0xd08a2a,
    base: 0xe4d7c3,
    rim: 0x6b3d1c,
    gridMajor: 0x2e6b4a,
    gridMinor: 0xd2c3ad,
    glass: 0xfbf7f0,
    glassMetalness: 0.1,
    glassRoughness: 0.45,
    edge: 0x6b3d1c,
    solar: 0x1d4e6c,
    tank: 0x2e6b4a,
    streamElectricity: 0xb06a12,
    streamWater: 0x1d6c9c,
    streamLpg: 0xb23a4c,
    additive: false,
  },
  dark: {
    ambient: 0xffffff,
    ambientIntensity: 0.6,
    key: 0xd49a62,
    water: 0x62b9e6,
    gold: 0xedaa45,
    base: 0x1a140f,
    rim: 0xd49a62,
    gridMajor: 0x7cc59a,
    gridMinor: 0x2e251c,
    glass: 0x201913,
    glassMetalness: 0.8,
    glassRoughness: 0.2,
    edge: 0xd49a62,
    solar: 0x1d6c9c,
    tank: 0x2e7550,
    streamElectricity: 0xedaa45,
    streamWater: 0x62b9e6,
    streamLpg: 0xf07f8f,
    additive: true,
  },
} as const;

export interface ClickableHeroItem {
  id: "house" | "solar" | "tank" | "electricity" | "water" | "gas";
  title: string;
  category: "Micro-Grid Habitat" | "Solar Photovoltaic" | "Hydraulic Storage" | "Electricity" | "Potable Water" | "Gas / LPG";
  telemetry: string;
  metricLabel: string;
  metricValue: string;
  status: string;
  twinUrl: string;
  description: string;
}

const HERO_CLICKABLE_ITEMS: Record<string, ClickableHeroItem> = {
  house: {
    id: "house",
    title: "Connected Household Habitat",
    category: "Micro-Grid Habitat",
    telemetry: "Real-time Multi-Utility Sync",
    metricLabel: "Active Domestic Load",
    metricValue: "1.15 kW · 240V",
    status: "Optimal Efficiency",
    twinUrl: "/citizen/twin",
    description:
      "Integrated micro-grid balancing active HVAC setpoints, appliance duty cycles, solar self-consumption, and municipal utility inputs.",
  },
  solar: {
    id: "solar",
    title: "Rooftop Solar PV Array",
    category: "Solar Photovoltaic",
    telemetry: "Monocrystalline Bifacial (3.2 kWp)",
    metricLabel: "Current Generation",
    metricValue: "2.8 kW (87.5% Yield)",
    status: "Exporting 1.65 kW to Grid",
    twinUrl: "/citizen/twin",
    description:
      "Rooftop solar system providing daytime peak power, charging household storage, and offsetting thermal compressor workloads.",
  },
  tank: {
    id: "tank",
    title: "Overhead Potable Water Tank",
    category: "Hydraulic Storage",
    telemetry: "1,000 L HDPE Food-Grade Tank",
    metricLabel: "Storage Level",
    metricValue: "850 L (85% Capacity)",
    status: "Pressure Head: 2.4 bar",
    twinUrl: "/citizen/twin?tab=water",
    description:
      "Roof-mounted storage buffer supplied by municipal DMA feeder, ensuring uninterrupted domestic gravity feed during intermittent supply hours.",
  },
  electricity: {
    id: "electricity",
    title: "Smart Electricity Grid Inflow",
    category: "Electricity",
    telemetry: "Bi-directional Smart Net Meter",
    metricLabel: "Net Grid Draw",
    metricValue: "0.00 kW (100% Solar Self-Powered)",
    status: "OpenADR 2.0b Ready",
    twinUrl: "/citizen/twin",
    description:
      "Automated time-of-day peak shifting preventing dynamic tariff penalties during high-demand evening hours.",
  },
  water: {
    id: "water",
    title: "Municipal Water Supply Stream",
    category: "Potable Water",
    telemetry: "Zone Bulk & Household Smart Ultrasonic",
    metricLabel: "Supply Inflow Rate",
    metricValue: "42.5 m³/h · 3.4 bar",
    status: "Normal Water Balance",
    twinUrl: "/citizen/twin?tab=water",
    description:
      "Meter-to-meter hydraulic distribution with non-revenue water (NRW) loss detection comparing supplier inflow to household meters.",
  },
  gas: {
    id: "gas",
    title: "City Gas (PNG) & Smart LPG Stream",
    category: "Gas / LPG",
    telemetry: "Ultrasonic Gas Meter & Smart Tare Scale",
    metricLabel: "Gas Flow & Pressure",
    metricValue: "0.28 SCMH · 21.0 mbar",
    status: "Solenoid Latch OPEN",
    twinUrl: "/citizen/twin?tab=gas",
    description:
      "Real-time pipeline pressure monitoring with automated 250ms emergency solenoid cut-off and 30-second pressure integrity verification.",
  },
};

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [webGlSupported, setWebGlSupported] = useState(true);
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "dark" ? HERO_PALETTE.dark : HERO_PALETTE.light;

  const [activeItem, setActiveItem] = useState<ClickableHeroItem | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || prefersReducedMotion) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebGlSupported(false);
      return;
    }

    const scene = new THREE.Scene();

    // Camera setup (Isometric perspective)
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.set(13, 11, 13);
    camera.lookAt(0, 1.2, 0);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(palette.ambient, palette.ambientIntensity);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(palette.key, 2.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(palette.water, 3, 20);
    cyanLight.position.set(-6, 8, -4);
    scene.add(cyanLight);

    const goldLight = new THREE.PointLight(palette.gold, 2.5, 20);
    goldLight.position.set(6, 4, 6);
    scene.add(goldLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(5.8, 6.2, 0.4, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: palette.base,
      roughness: 0.8,
      metalness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    mainGroup.add(base);

    // Glowing rim
    const rimGeo = new THREE.TorusGeometry(5.82, 0.04, 16, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: palette.rim });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.01;
    mainGroup.add(rim);

    // Grid on base
    const grid = new THREE.GridHelper(9, 18, palette.gridMajor, palette.gridMinor);
    grid.position.y = 0.02;
    mainGroup.add(grid);

    // 2. Architectural House Volumes
    const glassMat = new THREE.MeshStandardMaterial({
      color: palette.glass,
      roughness: palette.glassRoughness,
      metalness: palette.glassMetalness,
      transparent: true,
      opacity: 0.85,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: palette.edge, transparent: true, opacity: 0.7 });

    // Clickable Mesh Registry
    const clickableMeshes: { mesh: THREE.Object3D; key: string }[] = [];
    const registerClickable = (mesh: THREE.Object3D, key: string) => {
      mesh.userData = { key };
      clickableMeshes.push({ mesh, key });
    };

    // Main living cube
    const mainCubeGeo = new THREE.BoxGeometry(3.6, 2.4, 3.2);
    const mainCube = new THREE.Mesh(mainCubeGeo, glassMat);
    mainCube.position.set(0, 1.2, 0);
    mainGroup.add(mainCube);
    registerClickable(mainCube, "house");

    const mainEdges = new THREE.LineSegments(new THREE.EdgesGeometry(mainCubeGeo), edgeMat);
    mainCube.add(mainEdges);

    // Upper studio level
    const upperGeo = new THREE.BoxGeometry(2.4, 1.6, 2.4);
    const upper = new THREE.Mesh(upperGeo, glassMat);
    upper.position.set(-0.4, 3.2, -0.2);
    mainGroup.add(upper);
    registerClickable(upper, "house");

    const upperEdges = new THREE.LineSegments(new THREE.EdgesGeometry(upperGeo), edgeMat);
    upper.add(upperEdges);

    // Solar Roof Panel
    const solarGeo = new THREE.BoxGeometry(2.6, 0.1, 2.6);
    const solarMat = new THREE.MeshStandardMaterial({
      color: palette.solar,
      metalness: 0.9,
      roughness: 0.1,
    });
    const solar = new THREE.Mesh(solarGeo, solarMat);
    solar.position.set(-0.4, 4.05, -0.2);
    solar.rotation.x = -0.15;
    mainGroup.add(solar);
    registerClickable(solar, "solar");

    // Rooftop Water Tank (Cylinder)
    const tankGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 16);
    const tankMat = new THREE.MeshStandardMaterial({
      color: palette.tank,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(1.2, 2.9, 1.0);
    mainGroup.add(tank);
    registerClickable(tank, "tank");

    // 3. Flowing Resource Particle Streams
    // Electricity Curve (Gold/Amber)
    const elCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.5, 0.1, 4.5),
      new THREE.Vector3(2.5, 0.3, 3.0),
      new THREE.Vector3(1.8, 1.2, 1.6),
      new THREE.Vector3(0.5, 2.0, 0.8),
      new THREE.Vector3(-0.4, 4.0, -0.2),
    ]);

    // Water Curve (Cyan/Teal)
    const waterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, 0.1, 3.5),
      new THREE.Vector3(-2.8, 0.2, 2.2),
      new THREE.Vector3(-1.8, 0.8, 1.2),
      new THREE.Vector3(0.2, 1.5, 1.4),
      new THREE.Vector3(1.2, 2.9, 1.0),
    ]);

    // LPG Curve (Rose/Amber)
    const lpgCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.5, 0.1, -3.5),
      new THREE.Vector3(2.2, 0.2, -2.0),
      new THREE.Vector3(1.5, 0.8, -1.2),
      new THREE.Vector3(0.2, 1.0, -0.8),
    ]);

    // Helper to create flowing particles along curves
    const createStream = (curve: THREE.CatmullRomCurve3, count: number, color: number, size: number) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const offsets = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        offsets[i] = i / count;
        const pt = curve.getPoint(offsets[i]);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }

      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.9,
        blending: palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });

      const points = new THREE.Points(geo, mat);
      return { points, curve, offsets, count };
    };

    const elStream = createStream(elCurve, 70, palette.streamElectricity, 0.15);
    const waterStream = createStream(waterCurve, 70, palette.streamWater, 0.15);
    const lpgStream = createStream(lpgCurve, 50, palette.streamLpg, 0.14);

    mainGroup.add(elStream.points);
    mainGroup.add(waterStream.points);
    mainGroup.add(lpgStream.points);

    // 4. Physical 3D Smart Meters on Base
    const elMeterGeo = new THREE.BoxGeometry(0.35, 0.45, 0.25);
    const elMeterMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    const elMeter = new THREE.Mesh(elMeterGeo, elMeterMat);
    elMeter.position.set(4.4, 0.3, 4.4);
    mainGroup.add(elMeter);
    registerClickable(elMeter, "electricity");

    const waterMeterGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16);
    const waterMeterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const waterMeter = new THREE.Mesh(waterMeterGeo, waterMeterMat);
    waterMeter.position.set(-4.4, 0.25, 3.4);
    mainGroup.add(waterMeter);
    registerClickable(waterMeter, "water");

    const gasCylinderGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.65, 16);
    const gasCylinderMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.4 });
    const gasCylinder = new THREE.Mesh(gasCylinderGeo, gasCylinderMat);
    gasCylinder.position.set(3.4, 0.38, -3.4);
    mainGroup.add(gasCylinder);
    registerClickable(gasCylinder, "gas");

    // Clickable hitboxes along the particle streams
    const createStreamHitbox = (curve: THREE.CatmullRomCurve3, key: string) => {
      const hitTube = new THREE.TubeGeometry(curve, 20, 0.4, 8, false);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitTube, hitMat);
      mainGroup.add(hitMesh);
      registerClickable(hitMesh, key);
    };

    createStreamHitbox(elCurve, "electricity");
    createStreamHitbox(waterCurve, "water");
    createStreamHitbox(lpgCurve, "gas");

    // Raycasting for clickability and hover feedback
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = mouseX * 0.45;
      targetRotationX = mouseY * 0.25;

      mouse.x = x;
      mouse.y = y;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes.map((c) => c.mesh), true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.key) {
          obj = obj.parent;
        }
        if (obj?.userData?.key) {
          const item = HERO_CLICKABLE_ITEMS[obj.userData.key];
          if (item) {
            setHoveredTitle(item.title);
            container.style.cursor = "pointer";
            return;
          }
        }
      }

      setHoveredTitle(null);
      container.style.cursor = "grab";
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes.map((c) => c.mesh), true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.key) {
          obj = obj.parent;
        }
        if (obj?.userData?.key) {
          const item = HERO_CLICKABLE_ITEMS[obj.userData.key];
          if (item) {
            setActiveItem(item);
          }
        }
      }
    };

    container.addEventListener("mousemove", handlePointerMove);
    container.addEventListener("click", handlePointerClick);

    // Mouse tracking for parallax rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const updateStream = (stream: { points: THREE.Points; curve: THREE.CatmullRomCurve3; offsets: Float32Array; count: number }, speed: number) => {
      const posAttr = stream.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < stream.count; i++) {
        stream.offsets[i] = (stream.offsets[i] + speed) % 1.0;
        const pt = stream.curve.getPoint(stream.offsets[i]);
        posArray[i * 3] = pt.x;
        posArray[i * 3 + 1] = pt.y;
        posArray[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Continuous slow rotation + mouse interpolation
      mainGroup.rotation.y += 0.003;
      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y * 0.05) * 0.02;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.02;

      // Gentle floating breathing
      mainGroup.position.y = Math.sin(time * 1.2) * 0.12;

      // Pulse lights
      cyanLight.intensity = 2.4 + Math.sin(time * 2.5) * 0.8;
      goldLight.intensity = 2.2 + Math.cos(time * 2.2) * 0.7;

      // Flow particle streams
      updateStream(elStream, 0.006);
      updateStream(waterStream, 0.005);
      updateStream(lpgStream, 0.004);

      renderer?.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handlePointerMove);
      container.removeEventListener("click", handlePointerClick);

      renderer?.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      mainCubeGeo.dispose();
      upperGeo.dispose();
      solarGeo.dispose();
      solarMat.dispose();
      tankGeo.dispose();
      tankMat.dispose();
      glassMat.dispose();
      edgeMat.dispose();
      elStream.points.geometry.dispose();
      (elStream.points.material as THREE.Material).dispose();
      waterStream.points.geometry.dispose();
      (waterStream.points.material as THREE.Material).dispose();
      lpgStream.points.geometry.dispose();
      (lpgStream.points.material as THREE.Material).dispose();
    };
  }, [prefersReducedMotion, palette]);

  if (prefersReducedMotion || !webGlSupported) {
    return <StaticHeroFallback />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-3xl overflow-hidden border border-border bg-gradient-to-b from-positive-soft via-card to-secondary flex items-center justify-center shadow-xl"
    >
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Badges on 3D viewport */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 border border-positive/30 text-positive text-xs font-mono shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
          <span>Interactive 3D Habitat Model · 60 FPS</span>
        </div>

        {hoveredTitle && !activeItem && (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/95 border border-border text-xs font-mono text-foreground shadow-md backdrop-blur-md animate-in fade-in">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Click to inspect: <strong>{hoveredTitle}</strong></span>
          </div>
        )}
      </div>

      {/* Bottom Resource Stream Indicators */}
      <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-3 pointer-events-none">
        <div className="flex flex-wrap items-center justify-center gap-3 px-3 py-1.5 rounded-xl bg-card/90 border border-border text-xs font-mono text-soft backdrop-blur-md shadow-md">
          <div className="flex items-center gap-1 text-amber-ink">
            <Zap className="h-3 w-3" />
            <span>Electricity Flow</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-ink">
            <Droplet className="h-3 w-3" />
            <span>Water Inflow</span>
          </div>
          <div className="flex items-center gap-1 text-rose-ink">
            <Flame className="h-3 w-3" />
            <span>LPG / PNG Burn</span>
          </div>
        </div>
      </div>

      {/* Interactive 3D Click Inspection Overlay Card */}
      {activeItem && (
        <div className="absolute top-4 right-4 max-w-sm w-full z-40 bg-card/95 border border-border shadow-2xl rounded-2xl p-4 backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-2.5">
            <div>
              <span className="text-2xs font-mono font-bold uppercase text-positive">
                {activeItem.category}
              </span>
              <h4 className="text-sm font-bold text-foreground mt-0.5">
                {activeItem.title}
              </h4>
            </div>
            <button
              onClick={() => setActiveItem(null)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-between">
              <span className="text-muted-foreground">{activeItem.metricLabel}</span>
              <strong className="text-foreground">{activeItem.metricValue}</strong>
            </div>

            <div className="flex items-center justify-between text-2xs text-muted-foreground px-1">
              <span>Status:</span>
              <span className="text-positive font-bold flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                <span>{activeItem.status}</span>
              </span>
            </div>

            <p className="text-2xs font-sans text-muted-foreground leading-relaxed pt-1">
              {activeItem.description}
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end">
            <Button asChild size="sm" className="h-8 text-xs font-bold gap-1 w-full">
              <Link href={activeItem.twinUrl}>
                <span>Simulate in Digital Twin</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaticHeroFallback() {
  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-3xl overflow-hidden border border-border bg-card p-8 flex flex-col items-center justify-center text-center shadow-2xl">
      <div className="h-20 w-20 rounded-2xl bg-positive/10 border border-positive/20 flex items-center justify-center text-positive mb-6">
        <Box className="h-10 w-10 text-positive" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Habitat Digital Twin Schematic</h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
        Three-stream resource model mapping domestic load, municipal water intake, and LPG burn rates.
      </p>
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-ink border border-amber-500/20">
          <Zap className="h-3.5 w-3.5" />
          <span>Grid Flow: 390 kWh</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-ink border border-teal-500/20">
          <Droplet className="h-3.5 w-3.5" />
          <span>Supply: 450 L/day</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-ink border border-rose-500/20">
          <Flame className="h-3.5 w-3.5" />
          <span>LPG: 0.57 kg/day</span>
        </div>
      </div>
    </div>
  );
}
