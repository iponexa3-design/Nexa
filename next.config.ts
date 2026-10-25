import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-only route indicator ("N" badge); compile and runtime
  // errors are still shown during development.
  devIndicators: false,
  redirects() {
    return [
      // GoDaddy's parking page lived at /lander; browsers that visited the
      // domains while parked may still go there, so send them home.
      { source: "/lander", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
