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
    // Baseline security headers applied to every response. A strict script-src
    // CSP is intentionally NOT set: the store supports merchant-provided custom
    // JS/CSS injection and Next.js emits inline bootstrap scripts, both of which
    // a strict policy would break. We still lock down framing, MIME sniffing,
    // transport, referrer leakage, and powerful browser features.
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // Clickjacking protection
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      // MIME-sniffing protection
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Force HTTPS for a year, including subdomains
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      // Do not leak full URLs to third parties
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable powerful features the storefront never uses
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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
