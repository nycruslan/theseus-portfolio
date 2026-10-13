<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Engineering standards

- TypeScript strict mode. No `any`; model data with explicit types.
- Server Components by default. Add `"use client"` only where interactivity requires it.
- Small, focused components with named exports (route files keep the default export Next.js requires).
- Comments explain *why*, not *what*.
- Prove it works:
  - `pnpm verify` passes. It runs lint, typecheck, knip and build, in that order.
  - `pnpm test:e2e` passes. It builds the site and serves it on port 3300, and a port in use fails
    the run, so when other agents may be testing too, pick your own free port:
    `PLAYWRIGHT_PORT=3317 pnpm test:e2e`.
  - The change behaves as intended in a real browser. Use the next-dev-loop skill, and run
    agent-browser with `--session <name>` so agents don't share one.
- Never weaken or delete a test to get green. Report the failure instead.
- When something breaks, find the root cause before changing code.
