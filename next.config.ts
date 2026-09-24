import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js / drei ship ESM; keep them transpiled by Next for compatibility.
  transpilePackages: ["three"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
