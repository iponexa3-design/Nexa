import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-only route indicator ("N" badge); compile and runtime
  // errors are still shown during development.
  devIndicators: false,
};

export default nextConfig;
