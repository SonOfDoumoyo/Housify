import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/v1.0/:path*",
        destination:"https://housifyapp.duckdns.org/api/v1.0/:path*"
      }
    ]
  }
};

export default nextConfig;
