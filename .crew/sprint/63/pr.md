## Sprint 63: try to sink the contact links in any window you choose

**Goal (from the roadmap):** Ta, the first build of "try to sink it". A page of its own frames
Ruslan's first page at any window in its address, draws the waterline at the window's foot, gives
the contact links' freeboard from a committed sweep, and says what the crew's record answers for
that window. The crew's windows are links and a plain form takes any window. No script.

**Size:** M. The contract is `.crew/sprint/63/contract.md` (Quill's, from sprint 62), checks T1
to T9 in `e2e/trials.spec.ts`, written red first by Probe.

### What's built
- `/trials` (the 1440 × 900 window) and `/trials/<w>x<h>` for every swept window: the scaled frame,
  its dimensions, the waterline and the freeboard dimension, the verdict, the answer, the checks
  that hold the window (Iris's sentence, its sprint, its spec line), the crew's windows as links and
  a Width and Height form. Iris's words and placement (`words.md`, `placement.md`).
- `/trials/frame`: `/`'s render in the feed's down state, `noindex`, canonical to `/`, and the only
  address that sends `frame-ancestors 'self'` (decision 2). `/`'s render moved into
  `components/sheet.tsx`; the prerendered `/`, `/log` and `/crew` are byte-for-byte the same length,
  and Iris's pixel diff against main's build is identical on `/` and `/crew`.
- `/trials/go`: the form's 303 to the window's address.
- `proxy.ts` (the app's first proxy): the 308, the 307s to the grid window and the 404s for
  `/trials/<window>` (decision 9: a page's `redirect()` doubled its Location on a cache miss, and
  `notFound()` dropped the 404's title).
- The sweep: 13,103 windows, 6,124 B raw in `lib/trials-sweep.json`, written by
  `.crew/sprint/63/trials-sweep.mjs`; T4 fails CI the day `/` moves, naming that command.
- One `/trials` line in the sitemap.

### Results
- `pnpm verify` passes on the integrated head.
- The whole suite on Forge's build: 411 passed, 1 failed (T8's target clause, on the site's shared
  bar, settled below). No kept check went red: that full unedited run stands in for the contract
  mutant (decision 8).
- `e2e/trials.spec.ts` after Probe's edits: 9 passed (2.1 min). Mutant: a 40 px submit button turns
  T8 red at 320 and 390 on both pages.
- Script bytes, before and after the same: `/` 464,751 B, `/log` 464,751, `/crew` 481,545, the 404
  462,714, `/trials` and `/trials/320x568` 462,714 (0 B beyond the 404's).
- The frame's fetches, for Lens (decision 4): with scripts on, the sandboxed frame fetches `/`'s 8
  scripts (464,751 B, cache-shared with `/`) and runs none (`__next_f` undefined, no canvas, no 3D
  chunk, no `/api/crew`); with scripts off it fetches none.
- LCP is text in main, 164 to 260 ms at 4x CPU; CLS 0.
- Iris: changes, 7.8 of 10, above the bar; her two CSS lines are in (`review-iris.md`, decision 10).

### Changed checks, for Lens
- **T8's target clause** measures the trials page's own targets, those in `main`. The site's
  shared bar links (Work and Crew 41 × 44, Log 33 × 44 at 320) and skip link (144 × 42.8) fall short
  of 44 px below 1024 on every page; this sprint doesn't touch them, and B2.9's 24 px loop holds
  the same bar on its nine routes. Widening the bar is a follow-up. A soft assertion that `main`
  has targets keeps the clause from passing on nothing.
- **T4's red message** names the sweep's real command.

### Decisions
`.crew/sprint/63/decisions.md`, 1 to 10. No owner path is touched and nothing waits for the owner.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbtVqh97GnMHBwYnt5
