"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { Box, Droplet, Flame, Zap } from "lucide-react";

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

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [webGlSupported, setWebGlSupported] = useState(true);
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "dark" ? HERO_PALETTE.dark : HERO_PALETTE.light;

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

    // Main living cube
    const mainCubeGeo = new THREE.BoxGeometry(3.6, 2.4, 3.2);
    const mainCube = new THREE.Mesh(mainCubeGeo, glassMat);
    mainCube.position.set(0, 1.2, 0);
    mainGroup.add(mainCube);

    const mainEdges = new THREE.LineSegments(new THREE.EdgesGeometry(mainCubeGeo), edgeMat);
    mainCube.add(mainEdges);

    // Upper studio level
    const upperGeo = new THREE.BoxGeometry(2.4, 1.6, 2.4);
    const upper = new THREE.Mesh(upperGeo, glassMat);
    upper.position.set(-0.4, 3.2, -0.2);
    mainGroup.add(upper);

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

    // Mouse tracking for parallax rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = mouseX * 0.45;
      targetRotationX = mouseY * 0.25;
    };

    container.addEventListener("mousemove", handleMouseMove);

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
      container.removeEventListener("mousemove", handleMouseMove);

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
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 border border-positive/30 text-positive text-xs font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
          <span>Interactive 3D Habitat Model · 60 FPS</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-3 pointer-events-none">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-card/90 border border-border text-xs font-mono text-soft">
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
            <span>LPG Burn</span>
          </div>
        </div>
      </div>
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
