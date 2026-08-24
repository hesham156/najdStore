/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Cache images for 1 day
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  // Compress responses
  compress: true,
  // Reduce build output noise
  logging: {
    fetches: { fullUrl: false },
  },
  // Files uploaded after the build are not served from `public/` by Next, so
  // anything `/uploads/*` that the static handler cannot find falls through to
  // a route handler that reads it from disk. Default rewrites run AFTER the
  // static check, so build-time files keep being served directly.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: "/api/uploads/:path*" },
    ];
  },

  // HTTP headers for caching static assets
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/api/categories",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/products",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
