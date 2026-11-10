# Sprint 63 decisions (Atlas)

1. **M, from the roadmap: Ta.** No PR is open and no owner pick is outstanding; the canvas
   (https://claude.ai/artifact/MicDUbCifCHvCBsEfqZQS4) has no comments, so direction A stands.
2. **The frame's address is `/trials/frame`.** The contract
   leaves it unnamed. It is one fixed route beside the window routes, outside the window grammar
   (`frame` never matches `^[1-9]\d*x[1-9]\d*$`, so it can't collide with a window), and it is the
   only path that sends `frame-ancestors 'self'`. It renders `/`'s first page in the feed's down
   state, for any window, since the frame's size comes from the iframe box, not from its address.
   It is `noindex`, canonical to `/`, and not in the sitemap (T9, T1).
3. **The team runs in parallel from the contract** (STATE: a sprint starts the build at once):
   Iris writes placement and words to `placement.md` and `words.md` here; Probe writes T1 to T9
   red and runs the contract mutant; Forge builds the route, the frame's address and its header,
   the sweep and its script, `PINS` and the form, taking Iris's words when they land; Pixel spikes
   Tb's live measure in a scratch worktree and writes `spike-tb.md`. Each pushes to
   `<role>/63` and Atlas cherry-picks.
4. **T8's script budget counts the page's own frame** (Pixel's measure, Chromium 156): a frame
   sandboxed without `allow-scripts` still fetches every script in `/`'s HTML and runs none, so
   B2.10's every-frame sum reads 465,369 B beyond the 404 on the trials page. Next's App Router
   always writes its script tags, and stripping them would make the frame's HTML differ from `/`'s.
   So T8 reads: 0 B beyond the 404's in the main frame, and the frame requests no script that `/`
   doesn't (the same files, cache-shared with `/`), runs none (no canvas, no `__next_f` run, no 3D
   chunk, no `/api/crew`). The frame's fetches are named in the PR for Lens.
5. **T3's 1440 × 900 reads +37.0 px now,** not 29.2: sprint 62's merge changed the revision block.
   From 1024 wide the build's sweep governs, as the contract says; the other six quoted values hold.
6. **Measure only under the repo's `@playwright/test` (Chromium 156).** The machine's global
   Playwright 1.63 drives Chromium 153, which reads 390 × 664 23.2 px lower.
7. **Iris's three asks, settled.** `PINS` includes every window a kept check asserts the links at,
   H10's 1380 to 1440 × 900 run included (the contract's "as each reads them"); its extra windows
   sit in a closed `details`. The sticky figure from 1024 stays: it is position, not motion, and
   nothing animates (call 8 stands). The gap's answer is 320 × 568's own, asserted server-side.
8. **Resumed at 06:12 UTC on 10 Nov.** The first run left the notes, Iris's words and placement,
   and Probe's T1 to T9 (`probe/63`, cherry-picked) but no build. Forge builds now from the sprint
   head. The contract mutant is folded into Forge's proof: the whole unedited suite on the real
   build, every kept red named, since a bare Ta would cost a run for what the full run shows. Pixel's
   spike for Tb didn't run; it moves to Tb's own sprint.
9. **Forge's build, settled (Atlas).** The sweep's script lives at `.crew/sprint/63/trials-sweep.mjs`
   (knip takes `.crew/*.mjs` as script entries, as `merge-record.mjs` does), and T4's red names it.
   T8's target clause measures the trials page's own targets, those in `main`: the shared bar's
   links and the skip link fall short of 44 px below 1024 on every page of the site, which this
   sprint doesn't touch, and B2.9's 24 px loop holds the same bar on its nine routes; widening them is a follow-up
   for the bar. The redirects and 404s run in `proxy.ts`, the app's first proxy, since a page's
   `redirect()` doubled its Location on a cache miss and its `notFound()` dropped the 404's title.
   The sweep stores tenths rounded away from each kind's edge, so the kind never flips.
10. **Iris's review: changes, 7.8, two lines of CSS taken now** (`review-iris.md`). The phones'
    drawing gutter goes from 56 to 68 px so a deep sink's dimension clears "Waterline", and four
    text blocks wrap pretty. The lead stays at 1.55 (the site's body line) and the floor at 280.
    456 × 465 stays a named window, answering Sunk at −0.1 px: the page never says the named
    windows are near misses, and three still are. Centring the phone windows at 1440 waits for
    Tb's corner, which needs the anchor.
