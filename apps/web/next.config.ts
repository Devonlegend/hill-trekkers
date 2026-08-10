import type { NextConfig } from "next";

const apiBase = process.env.FASTAPI_BASE_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for containerised deploys.
  output: "standalone",
  // Don't advertise the Next.js runtime in response headers.
  poweredByHeader: false,
  // Compress responses (most reverse proxies also do this, but it's a safe default).
  compress: true,
  images: {
    // Cloudinary hosts all production media; local /uploads is same-origin.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      // Dev-only: serve locally-uploaded media through the proxy so the same-origin
      // `/uploads/*` URLs returned by the API resolve. (Production uses Cloudinary.)
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
