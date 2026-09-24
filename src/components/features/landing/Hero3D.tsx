"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { Box, Droplet, Flame, Zap } from "lucide-react";

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [webGlSupported, setWebGlSupported] = useState(true);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x10b981, 2.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 20);
    cyanLight.position.set(-6, 8, -4);
    scene.add(cyanLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.5, 20);
    goldLight.position.set(6, 4, 6);
    scene.add(goldLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(5.8, 6.2, 0.4, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x07110c,
      roughness: 0.8,
      metalness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    mainGroup.add(base);

    // Glowing rim
    const rimGeo = new THREE.TorusGeometry(5.82, 0.04, 16, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.01;
    mainGroup.add(rim);

    // Grid on base
    const grid = new THREE.GridHelper(9, 18, 0x10b981, 0x0f2c1f);
    grid.position.y = 0.02;
    mainGroup.add(grid);

    // 2. Architectural House Volumes
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0b1a13,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 });

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
      color: 0x0284c7,
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
      color: 0x0d9488,
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
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      return { points, curve, offsets, count };
    };

    const elStream = createStream(elCurve, 70, 0xf59e0b, 0.14);
    const waterStream = createStream(waterCurve, 70, 0x06b6d4, 0.14);
    const lpgStream = createStream(lpgCurve, 50, 0xf43f5e, 0.13);

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
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !webGlSupported) {
    return <StaticHeroFallback />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-emerald-950/20 via-black to-teal-950/20 backdrop-blur-2xl flex items-center justify-center shadow-2xl shadow-emerald-950/40"
    >
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Badges on 3D viewport */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive 3D Habitat Model · 60 FPS</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 text-[10px] font-mono text-white/70 backdrop-blur-md">
          <div className="flex items-center gap-1 text-amber-400">
            <Zap className="h-3 w-3" />
            <span>Electricity Flow</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Droplet className="h-3 w-3" />
            <span>Water Inflow</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400">
            <Flame className="h-3 w-3" />
            <span>LPG Burn</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 text-[10px] text-white/40 font-mono pointer-events-none">
        Rotate & explore isometric telemetry
      </div>
    </div>
  );
}

function StaticHeroFallback() {
  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-[#070D0A]/90 p-8 flex flex-col items-center justify-center text-center shadow-2xl">
      <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
        <Box className="h-10 w-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Habitat Digital Twin Schematic</h3>
      <p className="text-xs text-white/60 max-w-md leading-relaxed mb-6">
        Three-stream resource model mapping domestic load, municipal water intake, and LPG burn rates.
      </p>
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <Zap className="h-3.5 w-3.5" />
          <span>Grid Flow: 390 kWh</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
          <Droplet className="h-3.5 w-3.5" />
          <span>Supply: 450 L/day</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <Flame className="h-3.5 w-3.5" />
          <span>LPG: 0.57 kg/day</span>
        </div>
      </div>
    </div>
  );
}
