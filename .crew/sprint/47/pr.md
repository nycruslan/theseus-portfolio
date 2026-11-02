## Sprint 47: the keel on the crew page (Ka, M)

**Goal (from the roadmap):** a hiring executive who wonders whether the AI crew is governed finds,
on `/crew`, the six rules it builds under. Each is in plain words, says what enforces it (GitHub,
the gate check, Lens's review, or only guidance), quotes its file word for word and links to that
line on GitHub.

**Contract:** `.crew/sprint/46/first-contract.md` (K1 to K8 and a rider). Briefs:
`.crew/sprint/47/briefs.md`. Iris's placement: `.crew/sprint/47/placement.md`. Decisions:
`.crew/sprint/47/decisions.md`.

### What's built
- `lib/keel.ts`: the six rules (`KEEL`), the contract's matching rule (`quoteLines`) and
  `keelRules`. A rule whose file loses its quote drops, and a dropped rule leaves its number's gap.
- `components/keel.tsx`: server HTML after the panel. It renders nothing when no rule is left.
- **The quotes are fixed at build.** `next.config.ts` adds a Turbopack `?raw` rule, so the five
  source files are text in the server bundle. `raw.d.ts` types the import. The link's commit is
  also fixed at build (`KEEL_REF`, from `VERCEL_GIT_COMMIT_SHA`, else `main`).
- Placement (a), Iris's call: from 1024 the keel sits under the panel in its column, and the drawing
  spans both rows so it stays stuck beside the keel. Binding rules are drawn in ink; guidance rules
  have a graphite label and a dashed rule. Nothing is copper.

### Results
- `pnpm verify` passes on the integrated tree: lint, typecheck, knip and build.
- `e2e/keel.spec.ts` (K1 to K7) and `e2e/crew.spec.ts` pass 35 of 35 on the integrated build
  (2.0 min). All 12 keel tests were red on main (Probe). K7's box comparison and CLS read pass on
  main by design: they guard what the keel must not move.
- **K8, fixed at build (Forge).** `next start` ran on the build with CLAUDE.md,
  .github/CODEOWNERS and .crew/{scope,guard,gate}.mjs moved out of the checkout. The live fixture
  regenerated `/crew` ("live" after 18.5 s). Before and after, the page had 6 rules and the keel's
  HTML was identical to the build's, with the links still at the build's commit. The server logged
  0 errors or ENOENT. No `.nft.json` trace names a source.
- **Budgets:**
  - Script bytes (decoded, WebGL refused): `/crew` 481,318 B before and after, `/` 464,751 B
    before and after. `/crew`'s HTML went from 60,366 B to 72,064 B, all of it server HTML.
  - LCP element unchanged: the Rules `dd` at 1440 × 900, `span.crew-goal` at 390 × 664.
  - CLS 0 at load at both sizes.
  - K7: the drawing, h1, table and `[data-rules]` match main's boxes with a max delta of 0.
- **Iris's measurements:**
  - The drawing stays at top 72 with the keel's h2 mid-viewport and at the page end, at
    1024 × 768, 1440 × 900 and 1536 × 715.
  - A live poll while reading the keel: 0 layout-shift entries. Scroll anchoring held it within
    0.5 px.
- Full suite: CI's `check` on this head. Forge's earlier full run (334 of 338) failed only on B4.8
  and on the spec's old sentences, both fixed since.

### Kept checks rewritten (for Lens)
- **B4.8** (`e2e/crew.spec.ts:931`) allowed only the site's, this repository's PRs' and the
  feed's run pages' hrefs on `/crew`. The contract's six links go to `blob/<ref>/<path>#L<a>[-L<b>]`.
  - The rewrite accepts that one pattern only inside `section[aria-labelledby="keel"]`. It requires
    exactly six such links there.
  - Every other href, a blob link outside the keel included, goes through the unchanged
    `allowed()`.
  - No expect was removed.
- **Ka's rider, W5 and W7** (`e2e/window.spec.ts`): three reads stop under `PLAYWRIGHT_BASE_URL`.
  They are W5's boxes at 900, W7's forced-colours stroke read, and W7's Calm and Off layout
  comparison.
  - **Why:** they hold only in the feed's down state, which only this checkout's server shows. On
    production on 2026-11-02 they read the live pencil by design (`.crew/sprint/46/close.md`).
  - **What stays the same:** CI never sets the variable, so CI runs them exactly as before. No
    `expect(` was removed and no `test.skip(` was added. Each read is behind `if (DEPLOYED)` and
    logs a "not run" note.

### Decisions
- Iris tightened two rule sentences without changing their claims. Rule 5 now reads "don't edit"
  rather than "can't edit", since its own label says a shell command can get around it. Rule 6 is
  in plainer words. Atlas accepted both.
- Nothing touches an owner path or `content/`. `next.config.ts` and `raw.d.ts` are the team's.
- The Owner's pick asked on #101 is still open, and the keel is its recommended option, built
  because it can be undone. The owner may take the keel down, or rule 6 alone, after the merge.

### Not verified
- The empty-keel render is checked only through `keelRules` returning `[]`. Lens reads
  `components/keel.tsx` for the null return.
- Nothing has been checked on the Vercel preview yet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbnuF8bSdbt7cLq4hF
