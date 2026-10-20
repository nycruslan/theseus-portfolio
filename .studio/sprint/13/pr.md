**Work in progress.**

## Goal

The build log's route: PR A of "Watch the team build" (roadmap), on the contract the owner accepted by
merging #37. `/` is not touched; the home line is PR B (sprint 14).

## Size

M. Probe wrote `e2e/sprints.spec.ts` (C1 to C12, plus the C13.1 scan) first: red on CI at ee177fa
(`check`: failure; 57 failed locally, on a 404 for `/sprints` and the missing reader). Forge built the
reader, the route, its metadata and the sitemap entry. Iris reviews the page (advice); Lens reviews in CI.

## Contract

`.studio/sprint/13/contract.md`, which points to `.studio/sprint/12/contract.md` ("PR A: the route").
The interface the spec reads is in `.studio/sprint/13/probe-checks.md`.

## Results

- `lib/sprint-log.ts`: `readSprintLog(dir?)`, `node:fs` and `node:path` only; throws with the file's path
  on a malformed retro, skips a folder with no `retro.json`.
- `app/sprints/page.tsx` and `components/sprint-entry.tsx`: one entry per retro, newest first, with its
  own title, description, canonical, og and twitter metadata. `REPO_URL` in `lib/site.ts`. `/sprints` in
  `app/sitemap.ts`.
- C13.2 (scope): the diff touches `app/sitemap.ts`, `app/sprints/page.tsx`, `components/sprint-entry.tsx`,
  `lib/site.ts`, `lib/sprint-log.ts`, the new `e2e/sprints.spec.ts`, the sprint folder and two roles'
  memory. It doesn't touch `content/`, any owner path or any existing spec.
- C13.3: `pnpm verify` passes. `pnpm build` lists `○ /sprints` (static). Forge's full local
  `pnpm test:e2e` run: 120 passed, 1 skipped (`content.spec.ts`'s existing fixme).
- Probe's 49 one-line mutants against a reference build: each one that changes behaviour the contract
  fixes turned its check red (`.studio/sprint/13/probe-checks.md`).

## Decisions

- The reader is loaded in C12 by a dynamic import of a path held in a variable, so the red spec
  type-checked and the route's checks reported the 404 rather than a load error.
- `readdirSync(/* turbopackIgnore: true */ dir)` keeps Turbopack from tracing the whole project.
- Below 768 the number's `mr-[0.5ch]` is replaced by the real space the contract requires.

## Not verified

Hover colour (no spec). Iris's look at 320, 768 and 1024 is pending.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01FE6TVmAWMmKZkgqvHCUKcH
