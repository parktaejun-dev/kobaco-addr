import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/:path*" // Proxy to local FastAPI
            : "/api/:path*", // In production (Vercel), let vercel.json handle it or internal routing
      },
    ];
  },
};

export default nextConfig;
