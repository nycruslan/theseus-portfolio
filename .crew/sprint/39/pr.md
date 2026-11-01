## Sprint 39: the owner's scope and scale on the first screen

**Goal (from the roadmap, milestone "the proof in five seconds", sprint Pa):** a hiring executive
reads who the owner leads, who uses what he built, and its impact on `/`'s first screen, in his own
words.

**Size:** M. Contract: `.crew/sprint/39/contract.md` (Quill's, from sprint 38; P1 to P7). Placement:
`.crew/sprint/39/placement.md` (Iris). Decisions: `.crew/sprint/39/decisions.md`.

## What a visitor sees

A table of principal particulars, as a lines plan carries beside its title block: four rows, each a
term and a phrase quoted verbatim from the JPMorgan summary in `content/profile.ts`.

| Term | Phrase |
|---|---|
| Leads | a team of 7 across AI research, backend and platform |
| Reach | multi-agent workflows several thousand employees use firm-wide |
| Gateway | around 8 product teams route through |
| Impact | cut manual processing on the flagship workflow by about 55% |

- From 1280 wide it sits in the drawing band's empty corner under the body plan (Iris's option (b)),
  so the drawing and the 3D don't move. From 1024 to 1279 it's a strip row of the frame; below 1024
  it follows the title block.
- Server-rendered, inert, 0 B of new script, 397 B of markup. If the owner edits the summary, a row
  whose phrase is gone drops out rather than showing words he took out; under two rows, no block.
- `content/` is unchanged, and no owner path is touched.

## Contract results

All in Forge's worktree on the build's head (Playwright's Chromium):

- `pnpm verify`: exit 0.
- `e2e/particulars.spec.ts` (P1, P2 on the oracle, P2 on the product's rule, P3 to P7): 8 passed,
  55.8 s with the build. Red on main before the build: 7 failed, 1 passed (the oracle), each on the
  missing block.
- Probe proved the checks bite on scratch builds: the block at the name's size turns P6 (and P3)
  red, the block over the hull turns P4 red (8% of pixels matched), and a 24 px drift after load
  turns P5 red.
- The live neighbours the contract names, unedited (sheet, plan, facts, read, keyboard,
  invariants, live-layer, profile-sections, content): 81 passed.
- Nothing retired. One skip guard added, named for Lens (STATE.md: an added `test.skip(` needs its
  reason here): `e2e/particulars.spec.ts:413` skips P3's `on the feed's fixtures` group when
  `PLAYWRIGHT_BASE_URL` is set, because the live, open and resting states need this checkout's
  build served from copies pointed at the fixture server, which a deployed URL can't be. CI never
  sets it (`ci.yml` runs `pnpm test:e2e` with only `PLAYWRIGHT_PREBUILT`), so CI runs P3 in full.
  It's the guard `live-layer.spec.ts:67` and `crew.spec.ts:64` use, as sprints 36 and 37 named.

Measured boxes (WebGL refused): 1440 × 900 at y 408–531, 67 px under "Base"; 1280 × 800 at
y 336–477; 768 × 900 at y 602–708; 390 × 844 at y 653–812; no horizontal scroll at 320.

## Decisions

- Iris's placement (b): (a) would shrink the drawing for text, and pull Pixel and every 3D suite in.
- P4's lettering clause pointed at `[data-plan] text`, which matches nothing; it now reads the
  lettering's spans and asserts they exist. A stricter check.
- The phrase's first letter is always lower case (Iris's pick, which the contract gives her).
- P2 runs the oracle's fixtures on the product's rule too, as B2.2 does for Detail A.
- Fix round 1 (`decisions.md` 8): CI's first run failed B3.1 (8,745 px changed at the 3D
  hand-off, all the table's glyphs losing LCD anti-aliasing as the canvas gave them their own
  layer). From 1280 the table gets an opaque fill in the film colour, measured 0 px different from
  no fill; Forge reproduced CI's failure here with a fontconfig that turns LCD text on, and with it
  particulars plus every `model-*`, `crew-model*` and `log-model*` spec passed (41), B3.1's
  hand-off note back to main's 3,812 px.

## Not verified

- CI's timing: the first run's e2e step took 23.4 min (job 24.7 of its 35-minute cap; main's last
  job 25.4); `particulars.spec.ts` adds about 1.5 test-minutes. This head's run is in its checks.
- Agent-browser's Chrome measures text a little wider than Playwright's Chromium (and production
  shows the same): at 390 the bio wraps to five lines and the table ends at 835 of 844, still in the
  first view.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZy1ePMKSWSkoa8MMt
