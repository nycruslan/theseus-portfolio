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
