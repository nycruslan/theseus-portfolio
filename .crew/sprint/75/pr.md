## Sprint 75 (S): Next.js past its security advisory

**Goal** (the roadmap's stand-down rule, and sprints 73 and 74's Forge follow-up): production runs
Next.js 16.4.3, inside a moderate advisory (GHSA-mfr8-8qww-v76h, information disclosure across root
params, vulnerable 16.3.0 to 16.4.4, patched from 16.4.5; Dependabot alert 1), and its build notice
stopped `pnpm build` about half the time in sprint 74. Move `next` to 16.4.6, the latest 16.4
patch (published 2026-11-09, past the one-day release-age rule), with the site unchanged.

**Size:** S. One builder (Forge); the existing suite stays green. No contract.

### The change

- `package.json`: `next` 16.4.3 → 16.4.6, exact. `pnpm-lock.yaml`: only `next`, `@next/env` and
  the eight `@next/swc-*` builds move. No scripts, config or other dependency changed; no product code.
- Why builds failed half the time: on 16.4.3, Next's upgrade nudge (`dist/lib/upgrade/nudge.js`)
  exits the build with `SecurityFatalError` and leaves a five-minute retry receipt that the next
  build uses up, so builds alternated red and green. On 16.4.6 there's no notice and no receipt.
- Release notes 16.4.4 to 16.4.6 mark nothing breaking: 16.4.4 reverts a chunk optimization (the
  byte budgets still pass), 16.4.5 is the security fix, 16.4.6 compresses route-handler responses
  under `next start` (Vercel compresses at its edge).
- Forge's memory: its four Next 16.4 quirk lines move verbatim to
  `.claude/agent-memory/engineer/next.md`, as `MEMORY.md` neared its 25 KB load limit, plus the
  nudge lesson.

### Checks and evidence

- `pnpm audit --prod`: one moderate advisory before, "No known vulnerabilities found" after (Forge, Atlas).
- `pnpm verify` passes on the integrated head (Atlas): `▲ Next.js 16.4.6`, 351/351 static pages, no notice.
  Four builds in a row on 16.4.6 passed (Forge); on 16.4.3 Forge reproduced the fail-then-pass.
- `PLAYWRIGHT_PORT=3317 pnpm test:e2e`: 467 passed, 0 failed, 0 flaky (Forge); `e2e/` unedited.
- `next build`'s route table is identical between 16.4.3 and 16.4.6 (62 lines, `diff` clean).
- Production servers on both versions, `/`, `/log`, `/trials`, `/crew`: same titles, h1s and text
  lengths, no page or server errors, the same headless-GL three.js warning only; screenshots of `/`
  and `/crew` match (Forge's scratchpad, not committed).

### Retired checks

None.

### Not verified

A real streamed `/api/chat` answer on 16.4.6 (needs the model gateway; e2e mocks it); the Vercel
preview by eye; Safari and Firefox; production after the merge.
