## Sprint 43: the first screen fits a laptop browser window

**Goal (from the roadmap):** on a laptop browser window from 1280 wide and 620 to 950 tall, `/`'s
first window holds Ruslan's name, role, his own lead, the four particulars, the contact links and
the caption saying a team of AI agents builds the site. When the window is short, the drawing gives
up height; the facts don't. At 1440 × 900 nothing moves.

**Size:** M (milestone "the proof in the first window", sprint Wa).

## What changed

- **The drawing gives way (Iris's option (a), `.crew/sprint/43/placement.md`).** From 1280 wide
  the lines plan's width is `min(100%, (max(15rem, 100svh − foot)) / 0.33807)`, so on a short
  window it scales down from the frame's left edge, never below a 240 px band. The foot ramps from
  25rem at 1280 to 23.5rem by 1366, so a fourth bio line under fractional glyph widths still fits
  (Forge found the 1 px wrap; Iris set the ramp). `app/globals.css`, "The sheet on a laptop
  window".
- **The particulars** keep their corner under the body plan, their left edge on the drawing's
  lettering. Below 712 px tall they stand beside the drawing, plank numbers drop to 11 px and the
  body plan's station numbers hide (the same rules as 768–1023).
- **The contact row follows the bio** under 900 px tall or at 13/8 and wider; at 1440 × 900 it
  stays at the foot. `components/title-block.tsx` gains a `title-contact` class; DOM order and
  script unchanged.
- **Rider: the led-out "42" on seat 5.0** (Pixel, `lib/model/ghost.ts`, `pencil.ts`, `mount.ts`):
  the live pencil's 3D number no longer sits on the Base line. Through the loft it travels from the
  2D's led-out spot onto its plank, on its film chip, sliding sternward until the copper dot clears
  by 2 px. The 2D drawing is unchanged.

## Contract and results

Contract: `.crew/sprint/43/contract.md` (Quill's from sprint 42, adopted unchanged). Probe wrote W1
to W7 and the rider check red first in `e2e/window.spec.ts`: on main W1, W5 and the rider were red,
the rest guards.

| Check | Result on the build |
|---|---|
| W1 facts in the first window | green; lowest item at 1366 × 625: 606.5, 1536 × 715: 700.2, 1280 × 680: 633.7 |
| W2 1440 × 900 unchanged | green, against the baseline recorded on #98's product code |
| W3 drawing whole, ≥ 240 px | green; smallest 249 px at 1366 × 625 |
| W4 model registers | green; 1.00 px at DPR 1, 0.71 at DPR 2 |
| W5 resize refits | green |
| W6 still, `h1` LCP | green |
| W7 sweeps | green |
| Wa rider | green at 1440 × 900, 1536 × 715, 1366 × 625 |

- Forge: full suite 308 of 308 on 6c4e41f (33.7 min, 2 workers), `pnpm verify` exit 0.
- Atlas, after merging main's #103: `pnpm verify` passes; `window`, `sheet` and `first-screen`
  specs 28 of 28.
- `window.spec.ts` adds about 2.5 min wall on 2 workers (#100's suite: 28.8 of 35 min).
- No kept check edited, skipped or retired.

## Decisions

`.crew/sprint/43/decisions.md`. No Owner's pick: nothing here touches an owner path or `content/`,
and Iris's composition on short windows is hers (it can be undone).

## Not verified

Real Mac or Windows Chrome (Chrome 153's fractional glyphs stood in), real GPUs (SwiftShader), and a
classic always-visible scrollbar (the foot ramp reads `100vw`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaH7aBg7aJKvDUS82J
