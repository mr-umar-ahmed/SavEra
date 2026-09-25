import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js / drei ship ESM; keep them transpiled by Next for compatibility.
  transpilePackages: ["three"],
  eslint: { ignoreDuringBuilds: true },
  // Hide the dev-tools bubble so `npm run dev` demos look like production
  // (it otherwise overlaps the sidebar footer and the mobile tab bar).
  devIndicators: false,
};

export default nextConfig;
