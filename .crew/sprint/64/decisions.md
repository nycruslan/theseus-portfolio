# Sprint 64 decisions (Atlas)

1. **M, from the roadmap: Tb.** No PR is open and no owner pick is outstanding; the canvas
   (https://claude.ai/artifact/MicDUbCifCHvCBsEfqZQS4) has no comments, so direction A stands.
   The contract's four calls are mine (`contract.md`, "Atlas's calls"): a release settles on a swept
   window, so every link the page hands out is an address with the sweep's answer.
2. **The team runs in parallel from the contract.** Probe writes T10 to T15 red and runs the contract
   mutant; Pixel spikes the live measure (Chromium, and WebKit if it installs) and builds the
   controller; Forge builds the card (T15) on disjoint files; Iris writes the words and the handle's
   placement, then looks at the running build early. Each pushes to `<role>/64`; Atlas cherry-picks.
3. **Spoken sizes say "by", shown sizes keep ×** (Iris, words.md): screen readers read × as
   "times". Probe's T11 to T13 read the corner's name and the live region as "w by h".
4. **T15's alt carries the size, the signed freeboard and the verdict, in Iris's sentence;** the
   exact "Under by 6.2 px. The crew's own gap." is pinned on the card's drawn lines only.
5. **T14 gates the drag's INP, as the contract says; long animation frames are reported.** Pixel's
   build: longest pointer Event Timing entry 56 ms at 4x, gated green. Probe's added
   long-animation-frame clause read 200 to 380 ms frames at 4x on a box loaded by other runs: the
   cost is the framed `/`'s own relayout (50 to 110 ms forced per resize at 4x), which no file in
   the controller can make cheaper. Neither the contract nor the plan gates it, so it's reported in
   the PR with its numbers, and a follow-up asks whether coalescing resizes at a lower cadence
   during a drag makes the hand feel better.
6. **Tc gets its own script allowance.** Tb's controller is 713 B gzip beyond the 404's before the
   first touch and 8,072 B after (budget 1,024 and 8,192); most of it is the sweep (about 1.2 KB)
   and the record's sentences (about 0.5 KB), which call 3 puts on the client. The plan's "Tb's
   number, chart included" leaves Tc 120 B, so Tc's contract sets the chart's own number.
7. **Fix round 1 takes Lens's Important finding and its three code nits** (lens on e4eeb33). A typed
   size that is a swept window settles exactly (1439 from 1440 reached 1424 before). The nits ride
   along because the round touches the same function. Pixel fixes `lib/trials-live.ts` and the
   print rule, Probe adds the T12 clause that was red on e4eeb33 and deletes the superseded
   memory line.
8. **Fix round 2 takes Lens's history finding and its nits** (lens on cc5d690). Pixel bounds the
   address's writes rather than skipping key repeats, because Next's own write follows each one
   and throws past WebKit's limit. The address may lag a held key; the canonical and Copy link
   never do. This is the last fix round: anything further cuts scope.
9. **No merge this run.** Lens says ship on 387b03a and every check passes but e2e (2/4), which hit
   its 20-minute cap three times at 104 of 105 tests with none failing. The cap and the split are in
   `ci.yml`, an owner path, so the retro proposes them and the next run tries the merge again.
