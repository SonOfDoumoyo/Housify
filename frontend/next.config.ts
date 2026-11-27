import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:"https://housifyapp.duckdns.org/api/:path*"
      }
    ]
  }
};

export default nextConfig;
