## Sprint 56: Yd, hold to riffle (M)

**Goal:** Hold a step and riffle through the ships, stopping at sprint 23 (the roadmap's next sprint, Yd in "Now: the yard").

**Size:** M. Pixel led the 3D (the paced flight), Forge built the controller, the hand-off link and Yc's riders, Probe wrote Y20 to Y24 red first with a contract mutant, and Iris called the pace and reviewed the build.

**Contract:** `.crew/sprint/56/contract.md`. **Decisions:** `.crew/sprint/56/decisions.md` (1 to 11). **Iris's calls:** `.crew/sprint/56/riffle-iris.md`.

### What a visitor gets

On `/log/n` in Full and Calm, holding a step link (mouse, touch, or ← and →) riffles the two ships plank by plank: the first step at once, then gaps of 400, 290, 210, 152, 111 and 80 ms. Quick steps play the knock alone. The riffle stops itself at the chapters (sprint 23, sprint 45, the first and the newest step), where the step plays Yc's whole press. Release, keyup, Escape, leaving the link, pointercancel, blur or a hidden page stop it with no step after. Home and End on a focused step link jump to the first and newest steps. Calm and reduced motion riffle at 400 ms flat. The record, URL, title and live region change once, at the stop. On `/log` and the newest step a plain link, "Watch the crew build the next one on Crew", hands off to `/crew`, in every mode and with no script.

### Results

- `pnpm verify` passes on the integrated tree.
- The whole e2e suite, locally on 5956bb8: **384 passed**, 0 failed, 0 flaky (37.7 min on one machine).
- Y20 to Y24 (`e2e/log-riffle.spec.ts`) were red on 3f578f9 for the contract's reasons and pass now.
- **Y24, reported and not gated:** INP 1,000 ms at 4x CPU on SwiftShader in real time (the mouse hold's pointerdown to pointerup; keydowns 272 to 528 ms). Pixel's profile puts the 3D chunk's script at about 14 ms a step at 1x; the rest is software GL. Three further cuts are follow-ups (decision 11).
- **The 3D chunk:** 167,238 B gzip -9, +2,611 B on Yc's merged 164,627 (Y24's baseline), 82,762 B under the cap. The loader adds 0 B (B2.10 and B5.10 unedited).
- **While riffling** (Pixel): at most 6 draws, 26,697 triangles at 1440 and 10,397 at 390; 0 frames at rest after a stop or release; the settled canvas 0 px off a cold load.
- **Iris: `Verdict: ship`, 8.3/10, no musts open** (her one must, a mouse press leaving the focus ring, is fixed in de2ebc7). axe 0 serious or critical; 320 px reflow clean; no layout shift without input in any riffle.

### Fix round (after Lens's ship on 7b2d154)

CI's e2e shard 2 of 4 hit its 20-minute cap 3 s after its last test passed (96 of 96 green), so one round (decision 12):
- **Probe, `e2e/log-riffle.spec.ts` (d9983b1):** its original checks' test time is down 50.6% (517 to 255.5 s on 2 workers). No expect dropped or loosened: 67 expect calls before, 76 after, the 9 added being the new check below, and every earlier assertion message is kept. The cuts: Y20 Full and Y21 run at 390 × 844, since no clause names a size and Y23 keeps a Full riffle at 1440 for the 1440 draw and triangle budgets; reduced motion shares Calm's test and riffles 50 to the newest; bigger clock steps where nothing lets go; shorter real-time waits. Y24 stays real time, and its key hold now starts from the first step (reached by Home), so it no longer depends on where the 4x mouse riffle stopped.
- **Forge, `lib/model/yard.ts` (a0ecff0), Lens's nits 1 and 2:** a tap or Enter on a step link steps from the target, not the held record's href; Off mid-riffle before the step's page has come leaves the last whole step. Both are a new check, "Y23 A step's page late", red on 7b2d154 and green now.
- Nit 3 is accepted: Home or End one step from its end flies one press, which is one plank. Nit 4 (the chunk's baseline) is corrected above.
- `ci.yml`'s split by count puts every heavy Log spec in one shard; a split by time or a fifth shard is the owner's (proposed in the retro).

### For Lens: rewritten kept checks (decision 7)

Probe's contract mutant ran 219 kept tests; two went red by design, both from the new hand-off link (contract point 6):
- **B5.25** (`e2e/log-control.spec.ts`): `/log`'s Tab order gains `/crew` right after Start again; the title says so, nothing dropped.
- **B5.6** (`e2e/log-record.spec.ts`): the newest record's links gain `/crew`, its count and name checked like the others.

`e2e/yard.ts` holds log-press's assertion-free reads, moved unchanged so log-riffle shares them (log-press keeps its 89 expects).

### Riders from Yc (Lens's nits)

Prefetch a pressed step's neighbours once its page arrives (Forge); restore the drawings' numbers on an early teardown (Pixel, tested); the stale comments in `lines-plan.tsx` and `log.tsx`; the caption above the canvas at rest.

### Decisions worth a look

- Home and End act only with focus on a step link, so they keep scrolling the page elsewhere (3).
- Backward stops mirror forward ones: 45, 23, the first (4).
- Under touch a step comes at a tap's release, or once a finger has held still 400 ms, never at pointerdown, and a hold doesn't block scrolling (6, 10).
- Pixel's 50 ms still floor inside paced steps (9).

### Not verified

A real GPU and phone (the feel of the 32 ms knock and the 80 ms hurry), iOS Safari's callout and Android's long-press menu, Safari and Firefox, a screen reader, and real INP (SwiftShader only).

### Follow-ups

- Quill: nothing tells a visitor they can hold (Iris); a hint needs copy.
- Forge: let the count line into 23 change on the knock, not at the step's start (Iris).
- Pixel: the three INP cuts in decision 11.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZuuNgo1TSTBaMU4KY
