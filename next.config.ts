import type { NextConfig } from "next";

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
    return [{ source: "/sprints", destination: "/log", permanent: true }];
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
