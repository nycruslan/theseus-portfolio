import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Inline scripts stay allowed: Next's static pages carry them, and nonces would make every page
// render per request. `next dev` needs eval, so the policy applies to production builds only. No
// page may be framed, but the trials' frame, by the site itself (`headers()` below).
const contentSecurityPolicy = (frameAncestors: string) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${frameAncestors}`,
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");

/**
 * The lines app/globals.css opens each `@media` rule on, by its query with whitespace squashed,
 * fixed at build: the trials' fits link theirs (lib/trials-fits.ts). A Server Component can't
 * import the stylesheet as text, as the keel's sources are (`?raw`): Next takes any .css import
 * there for a stylesheet, whatever its query or rule.
 */
function mediaLines() {
  const lines = readFileSync(
    join(process.cwd(), "app", "globals.css"),
    "utf8",
  ).split("\n");
  const found: Record<string, number[]> = {};
  lines.forEach((text, at) => {
    if (!text.trimStart().startsWith("@media")) return;
    // A rule's query can run over lines up to its brace.
    let rule = text;
    for (let next = at + 1; !rule.includes("{") && next < lines.length; next++)
      rule += ` ${lines[next]}`;
    const query = (rule.slice(rule.indexOf("@media") + 6).split("{")[0] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    found[query] = [...(found[query] ?? []), at + 1];
  });
  return found;
}

// No Strict-Transport-Security: Vercel sends it, without binding every subdomain for two years.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy("'none'") },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // The build type-checks the site without its end-to-end checks (tsconfig.build.json). Probe
  // writes a sprint's checks before the build, against code that doesn't exist yet, so each such
  // push failed its Vercel preview and mailed the owner. `pnpm typecheck` still checks e2e/.
  typescript: { tsconfigPath: "tsconfig.build.json" },
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
      ? [
          { source: "/:path*", headers: SECURITY_HEADERS },
          // The trials page frames / at any window from this one address (.crew/sprint/63/
          // decisions.md, 2), so it alone may be framed, and only by this site. A later rule's key
          // overrides an earlier one's on the same path, so its other headers stay the site's.
          {
            source: "/trials/frame",
            headers: [
              {
                key: "Content-Security-Policy",
                value: contentSecurityPolicy("'self'"),
              },
            ],
          },
        ]
      : [];
  },
  experimental: {
    // No Turbopack cache between builds. A restored `.next/cache` once kept serving an old
    // globals.css after the file changed (the CSS runs through the Tailwind loader below), so
    // every build must start clean, in CI, on Vercel and locally. A cold build of this site takes
    // seconds. `next dev` keeps its own cache (turbopackFileSystemCacheForDev).
    turbopackFileSystemCacheForBuild: false,
  },
  // The commit /crew's keel links its quotes at (lib/keel.ts), fixed at build as its quotes are, so a
  // regeneration on a server without the variable can't point them elsewhere.
  env: {
    KEEL_REF: process.env.VERCEL_GIT_COMMIT_SHA || "main",
    STYLESHEET_MEDIA: JSON.stringify(mediaLines()),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // A file imported with `?raw` is its text, in the bundle: the keel's sources
      // (components/keel.tsx), which the functions' file tracing above leaves out.
      "*": { condition: { query: "?raw" }, type: "text" },
    },
  },
};

export default nextConfig;
