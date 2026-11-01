import type { NextConfig } from "next";

// Inline scripts stay allowed: Next's static pages carry them, and nonces would make every page
// render per request. `next dev` needs eval, so the policy applies to production builds only.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

// No Strict-Transport-Security: Vercel sends it, without binding every subdomain for two years.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // No request optimizes an image (the site has no next/image, and Vercel serves images itself).
  // The pages are prerendered at build, but the server runs the sprint log's reader after it
  // (lib/sprint-log.ts): / and /crew regenerate as the crew feed's cached read expires, and an
  // unknown record's address (/log/999) runs it to answer 404. So the retros and merge records stay
  // traced; the folders' notes, frames and scripts don't. Traced, `sharp` and those made each
  // deployment's functions about 13 MB zipped, the bulk of the team's Vercel Functions Storage.
  outputFileTracingExcludes: {
    "/**": [
      "node_modules/.pnpm/@img+sharp*/**",
      "node_modules/.pnpm/sharp@*/**",
      ".crew/**/*.{md,html,txt,webp,png,jpg,woff2,mjs}",
    ],
  },
  // The Log moved from /sprints to /log (.crew/sprint/29/b5-first-contract.md): a permanent redirect
  // keeps the share card and two weeks of links working, and tells search engines the page moved.
  async redirects() {
    return [
      { source: "/sprints", destination: "/log", permanent: true },
      // Addresses of the portfolio this site replaced at the same domain. Its AI crew's pages point
      // to this site's; its private admin is gone, and only the old links remain.
      ...[
        "/bridge",
        "/foundry",
        "/garden",
        "/substrate",
        "/work/the-bridge",
      ].map((source) => ({ source, destination: "/crew", permanent: true })),
      { source: "/admin/:path*", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return process.env.NODE_ENV === "production"
      ? [{ source: "/:path*", headers: SECURITY_HEADERS }]
      : [];
  },
  experimental: {
    // No Turbopack cache between builds. A restored `.next/cache` once kept serving an old
    // globals.css after the file changed (the CSS runs through the Tailwind loader below), so
    // every build must start clean, in CI, on Vercel and locally. A cold build of this site takes
    // seconds. `next dev` keeps its own cache (turbopackFileSystemCacheForDev).
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
