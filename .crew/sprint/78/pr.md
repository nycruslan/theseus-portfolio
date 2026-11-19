## Sprint 78 (S): the trials chart's labels read whole

**Goal** (from the roadmap's stand-down, chosen by Atlas on Probe's production sweep): a visitor
reads the crew's accepted gap on the trials chart as "−6.2", at any window and default font.

On production (2026-11-19), at 1024 × 768 with the default font, the 456 × 465 sounding's film
pad covered the gap label's decimal point on /trials and every window page ("−6 2"), 1024 to 1184
wide. The chart is `aria-hidden` and 6.2 is written nowhere else on the page. Iris's review found
the same defect at larger fonts: from a 20 px default font a crew pin's dot printed on the digits
(247 width × font cases; "−6,2" at 1440 × 900 at 28 px). At 24 and 28 px the width axis ran
"768 10241280" at 320, and at 28 px "1100" started 6 px left of the window.

**Size:** S, one fix round (Iris's). **Contract:** `.crew/sprint/78/contract.md` (T38).
**Decisions:** `.crew/sprint/78/decisions.md`.

### What changed (`components/trials-chart.tsx`, `app/globals.css`)

- While 456 × 465's centred number would meet "−6.2" (a container query on the chart's width: 1024
  to 1195 at 16 px, 1280 to 1365 at 20), it takes the above-right seat 1366 × 595 uses; its pad,
  ring and target move with it. "−6.2" doesn't move: above it are the 390×664 and 393×659 pins.
- The gap's film pad is sized in em (`max(28px, 2.125em + 4px)`), exactly 28 × 15 px at 16 px, so
  no pin shows on the digits at any font.
- Where the width axis can't hold its labels in a row (24 px at 320, 28 px at 320 and 390), "1024"
  steps down a row with a 1 px leader to the axis; the left gutter grows above a 20 px font.

### Results

- **T38** (`e2e/chart-labels.spec.ts`, Probe; named to sort into shard 1, decision 2): T38a, the
  gap label against the soundings (1024 to 1440, 16 and 20 px) and against the crew's pins (320,
  390, 1024 to 2560, 16 to 28 px); T38b, the axes at 320, 390 and 1440 at 16 to 28 px. Red before
  the fix: 32 sounding cases, 219 pin cases and 5 axis cases. Green on this head. Atlas:
  `chart-labels` and `trials-chart`, 4 of 4.
- **Nothing else moves at 16 px** (Forge's diff against main): 0 boxes on /trials at 320, 390,
  1196, 1200, 1280 and 1440 beyond the hidden leader's insertion; at 1024 and 1152 only 456 × 465's
  six boxes. Chart pixels identical at 390, 1280 and 1440; 1366 × 595 byte-identical at 1x.
- **Kept suite:** Forge's runs of the seven trials and large-font specs, 33 of 33; Atlas on this
  head, `pnpm verify` exit 0. CI runs the rest.
- **Iris:** Verdict changes (6.8/10) on round one; her four changes are built as she specified.

No check retired, no owner path, nothing in `content/`, no Owner's pick.

**Follow-ups:** the two crew pins hidden under the gap's pad at every width (on main; both are
links in the page's list); the soundings' own px-sized pads at 24 to 28 px; the focused ring at
1196 to 1206 (decision 6); the 12 px default-font layout from 768.

**Not verified:** Safari, Firefox, real phones; production after the merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaA7tWJ14wQRm7zKxh
