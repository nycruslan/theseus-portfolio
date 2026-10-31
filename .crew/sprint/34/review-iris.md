# Sprint 34 (B4b) review: the live layer on `/` (Iris)

**Verdict: ship, 8.7/10, on e920318.** It's **better** than production. Every hard gate passes and
I have no musts. There are two cheap changes and three follow-ups below. 3b3783a (the hull's tip
run, 5 lines in `lib/model/stage.ts`) landed after my build: I read its diff but didn't shoot it.

## How I looked

- **The build.** I built e920318 in `/home/user/wt-iris-34` and ran it from the feed's fixture
  harness, with one site each for live, open and resting, plus one with no feed (down). I also ran a
  live site with `sprint` patched to 999, so the pencil takes **seat 4.0**: production draws sprint 34
  there, and so will the PR's preview. The fixtures' own 31 sits on **3.0**.
- **The harness.** Its starters are no longer exported (`crewTest` wraps them), so I ran a scratch
  copy without the Playwright import. The harness picks its own free ports, not 4720 to 4729.
- **The runs.**
  - Off: 4 states × 1440, 1024, 390 and 320 × light, dark and forced colours (48 runs).
  - Calm: live, open and down × the same widths × light and dark (24 runs). Seat 4.0: Off and Calm at
    1440, 1024 and 390 in both schemes.
  - Full: the loft in frames on a paused clock at 0, 16, 100, 250, 500, 900, 1400, 2000, 2600 and
    3200 ms.
  - Reduced motion with no mode stored.
  - The phone profile, and the keyboard.
- **Production.** https://theseus-portfolio.vercel.app, side by side at the same sizes.
- **Shots.** In my scratchpad, `/tmp/claude-0/-home-user-theseus-portfolio/2eda3039-4660-59cf-99dd-0d03f9e0e872/scratchpad/shots/`:
  `iris-r-*` (the runs), `iris-f-l1440-*` (the loft), `iris-f-r1440-*` (reduced motion),
  `iris-focus-live.png`, `iris-rev-*` (the phone's block). The close-ups are one level up:
  `iris-r4-*` (seat 4.0), `iris-rz-*` (seat 3.0), `iris-strip-loft.png`.

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | Pass. The goal's fallback, "In progress", shows only when the feed sends no goal; it isn't owner content. |
| axe, nothing serious or critical | Pass in light and dark: `[]` on all 56 runs (32 in Off, 24 in Calm, every state and width). In forced colours, each state has one `color-contrast` on `.da-gateway` (Detail A). Production has the same one, so it predates this sprint (follow-up 3). |
| impeccable's detector, nothing at error | Pass. `impeccable detect --json` over `components/revisions.tsx`, `plank-key.tsx`, `lines-plan.tsx`, `app/page.tsx` and `app/globals.css` returned `[]`, exit 0. |
| Reduced motion | Pass. With no mode stored, the hull opens settled from its first frame, nothing moves, the 2D tip fades with the numbers, and the label cuts to its place. A visitor who stored Full still gets the loft, as designed since sprint 27. |
| Reflows at 320 | Pass. `scrollWidth − clientWidth` is 0 on every run at every width. At 320 the legend wraps in two rows and "drawing now" wraps as a unit. |
| Phone budget | Pass. Profile: 390 × 844, DPR 2, 4× CPU, 400 kbps, 150 ms. LCP is the bio's `p` in `main`. Warm runs: live 1,864 to 2,312 ms, down 1,896 to 2,128 ms. CLS 0 on every run. My first read put live 370 ms behind down, but 4 more interleaved rounds showed no difference. The first context of each round ran cold, 2,312 to 2,716 ms, and that was down, production's own page. Gzipped, live's HTML is 1,037 B more than down's, and TTFB is equal. |

## First verdict: better

- **Down is today's sheet.** Same rows, legend, links and axe result as production at 1440, 1024 and
  390. B4.20 holds `main`'s HTML equal.
- **The other three states add the crew's state to the sheet** in the drawing's own vocabulary, and
  every one of them meets B1.1 at 1440 × 900:
  - the contact links end at **866.3** in live, open, resting and down;
  - the fifth row ends at 790.7, and at 820.2 with the rest line;
  - at 1024 × 768 the links end at 752.2 in live and open, and 758.1 in resting.
- **For the executive:**
  - live: the pencil row leads the table and says "drawing now" in copper;
  - open: the same row says "Waiting for owner";
  - resting: one ink line states the last merge and its time.
- **The drawing agrees with the row.** On 4.0 the plank is hatched in pencil inside a dashed graphite
  edge, its number on a film chip, and the pen's copper run and 8 px dot lie on its lower seam. Dark
  is the strongest version: the plank reads as a gap in the hull, pencilled in. Forced colours keep
  the hatch and the dash, with the tip in `Highlight`.
- **The loft carries the layer. This is the sprint's best moment.**
  - Frame 1 (16 ms) registers exactly: the hull's hatch, number and copper tip land on the drawing's.
    The 2D tip hides at the first lofting frame and the hull's takes its place.
  - The number rides its plank through the move: (0, 0) → (−10, 8) → (−20, 32) → (−12, 46) →
    (−9.5, 48.2).
  - At rest on 4.0 the sliver plank still shows its hatch, the label sits on it, and the copper run and
    dot sit at its bow end, in both schemes.
- **Copper is only where it should be.** The only copper on the page is `[data-tip]`, "drawing now"
  and its dot, and the swatch, in live only. Open, resting and down paint nothing in `--accent`.
  `/crew`'s chip takes the dashed graphite edge in live, and its seated ink edge at rest.
- **The keyboard.** The goal link is a Tab stop on `/crew`, and its 2 px ink ring shows whole around
  the ellipsed goal (`iris-focus-live.png`).

## Score

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 9 | One grammar from 2D to 3D and from table to legend: pencil means "not merged yet", copper means "drawing now". The rest state carries its own fact without decoration. |
| Originality ×2 | 9 | A revision block that is signed while you watch, and a copper pen on the very seam it draws, registered from paper to hull: nothing on the site or in its references does this. |
| Craft ×1 | 8 | Exact registration, rows held at 31.9 px in every state, the fold untouched. Cheap change 1 (a short seat's chip covers the dot at 1024 and below) and cheap change 2 (the hull's label at rest sits on a sub-pixel offset) keep it from 9. |
| Functionality ×1 | 8 | The state reads in seconds, links to `/crew`, and works on the keyboard, under reduced motion and at 320. On a phone the hull shows only a hatched sliver and the copper run and dot on 4.0, and only the dot on 3.0, which the turn hides. So the row carries the state there, inside the first viewport at 390 (757 px). |

Weighted: (2×9 + 2×9 + 8 + 8) / 6 = **8.7**. I directed these calls myself, so discount it a little.

## Musts

None.

## Cheap changes (worth taking in this PR; neither holds the merge)

1. **On a short seat, the pen must paint above the number's chip.**
   - On seat 3.0 at 1024, the "31" chip covers the copper dot:
     - Off: the chip covers the dot's top half, so the dot reads as a copper shield;
     - Calm: the chip covers half the hull's dot.
   - Seat 4.0, this sprint's seat on production and the preview, is clean (the dot's centre is about
     47 px from the number's at 1440, measured on the shot). 3.0 comes round again in about 19 sprints, and the keel's 6.0 may be as short.
   - Fix in 2D (Forge): draw `[data-tip]` in a second `svg` with the same viewBox, absolutely placed
     after the lettering, so it paints over the chip. Keep the hollow rule and the reduced-motion fade
     on it.
   - Fix in 3D (Pixel): when the projected dot falls within the chip's box plus 2 px, move the label
     stern-ward by the overlap.
   - If Atlas would rather not reopen the 2D now, this rides the next sprint that touches the drawing.
2. **Round the label's offset to whole pixels at rest.** At rest the hull's pencil label sits at
   `translate(-9.54688px, 48.1562px)`, so its digits rasterise between pixels and look soft next to the
   sheet's other lettering. During the loft the offsets are already whole numbers. Round
   `--ghost-x` / `--ghost-y` at rest in the chunk (Pixel), and the Log's numbers get the same fix.

## Follow-ups (not this PR)

1. The legend still shows "Original" while the count says "0 original": every seat has been replaced
   at least once. By B4b's own rule (the legend names only what is on the drawing) it should go, but
   B1.2 finds the legend by the word "original", so it needs a contract.
2. B4e's Replay beside the rest line must be a 24 px target on the same line: a 32 px button would
   take the block's last 11.6 px of slack at 1440 × 900 and 1 px more.
3. Detail A's `.da-gateway` fails axe's `color-contrast` in forced colours, on production as here.

## Not verified

- 3b3783a's tip run on the hull: I read the diff but didn't shoot it.
- A GPU and a real phone: every 3D frame here is SwiftShader in headless Chromium.
- The draws, triangles and 0-frames-at-rest numbers: Probe's B4.21 owns them.
- Any browser other than Chromium, including whether the dashes and zero-length round caps of
  `vector-effect: non-scaling-stroke` hold there.
