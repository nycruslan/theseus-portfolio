## Goal

A shared link to the build log shows the site's image. From the roadmap ("A share card for `/sprints`"). The redesign, the top item, waits for the owner's comments on sprint 17's canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5; none yet), so this sprint takes the next item that neither repeats nor builds on it.

## Size

S, with Probe's rider from the roadmap (re-arm the placeholder guard). Brief: `.crew/sprint/18/brief.md`.

## What changed

- `app/sprints/opengraph-image.tsx` re-exports the root's image. `/sprints` sets its own `openGraph` and `twitter`, and Next replaces the layout's objects whole, so production `/sprints` had no `og:image` or `twitter:image` while declaring `summary_large_image`. A segment file keeps the hashed URL right, where a hard-coded `images` entry would go stale.
- `e2e/sprints.spec.ts` C2.3 (Probe): `/sprints` has exactly one `og:image` and one `twitter:image`, each serving `image/png`. Red before the fix (0 tags), green after.
- `e2e/content.spec.ts`: `test.fixme` is `test` again, since `content/` has no `TODO(owner)` left. This tightens the check, and `scope.mjs`'s weakening rules flag nothing.
- One memory line each from Forge and Probe.

## Evidence

- `PLAYWRIGHT_PORT=3361 pnpm test:e2e e2e/sprints.spec.ts e2e/content.spec.ts e2e/smoke.spec.ts`: 63 passed on the integrated branch.
- Forge: `pnpm verify` exits 0. On a production build, `/` keeps its own image tags unchanged, and `/sprints/opengraph-image` returns 200 `image/png`.

## Not verified

How the card looks in a real social preview (only the tags and the image response are checked). The full e2e suite runs in CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0147AbEcCfGgzPrtNJzbdAsm
