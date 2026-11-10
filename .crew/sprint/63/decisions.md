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
