# Sprint 64: the contract mutant (Probe)

**The mutant.** I took a scratch copy of the tree at e8cc94d (sprint/64-drag-it's base). Its only
change was `components/trials-touch.tsx`, a bare `"use client"` component that returns null,
rendered at the end of the trials page's `main` (`components/trials.tsx`). I built it, then ran the
unedited suite against it (`e2e/` from e8cc94d by `git archive`; trials-drag.spec.ts doesn't exist
there): `PLAYWRIGHT_PREBUILT=1 PLAYWRIGHT_PORT=3372 pnpm exec playwright test --workers=3`.

**Result:** 411 passed and 1 failed in 41.1 minutes, out of 412 tests.

| Red | Clause | Reading | With Tb |
|---|---|---|---|
| T8 (`e2e/trials.spec.ts:1361`) | script beyond the 404's 0 B | 185 B beyond the 404's on `/trials` and on `/trials/320x568` (raw) | The named rewrite: at most 1,024 B gzip -9 at load, T10's number (commit 710d1e9). Under it, T8 is green on the base build (0 B, raw and gzip). |

Nothing else went red. B2.10 and B4.14 (script on `/`, `/log`, `/read` and `/crew`) stayed green,
as did B2.9's `ROUTES` loops, the Tab bounds and link allowlists, the 3D chunk's checks, and
T1 to T7 and T9.
