import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Every page is prerendered at build, so no request reads the sprint folders (lib/sprint-log.ts)
  // or optimizes an image (the site has no next/image, and Vercel serves images itself). Traced
  // anyway, `sharp` and the sprint folders' notes and frames made each deployment's functions
  // about 13 MB zipped, the bulk of the team's Vercel Functions Storage. The retros stay.
  outputFileTracingExcludes: {
    "/**": [
      "node_modules/.pnpm/@img+sharp*/**",
      "node_modules/.pnpm/sharp@*/**",
      ".crew/**/*.{md,html,txt,webp,png,jpg,woff2,mjs}",
    ],
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
