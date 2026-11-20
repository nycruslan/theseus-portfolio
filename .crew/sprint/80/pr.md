## Sprint 80 (S): the trials' side keeps its foot in the window

**Goal** (from the roadmap's stand-down condition: a production defect that hides a fact): at a
24 to 28 px default font on a big screen, the trials page's stuck side ran past the window's foot,
hiding the chart's caption until the page ended (up to 47.8 px at 1792 × 1470 at 28 px), and from
26 px the bar covered the frame's width dimension. Now the stuck side ends inside the window, 32 px
under the bar, at every default font.

**Size:** S. Contract: `.crew/sprint/80/contract.md` (T40, new in `e2e/trials-side.spec.ts`).

**Root cause** (Forge): the side's height mixes px and rem, and the frame's height budget, the
sticky `top` (88 px under a 3.5rem bar) and the 52.5rem threshold each tracked only one kind. The
budget now subtracts the side's type growth (`--side-type`) and a rem-aware `--side-top`; the
sticky query adds `height >= 840px` for fonts below 16 px. CSS only, in `app/globals.css`.

**Results**
- T40a red on main in the suite's browser: 24 px at 1536 × 1260 (16.9 px), 1920 × 1400 and
  1920 × 1600 (7.0); 28 px at 1792 × 1470 (47.8), 1920 × 1600 (13.6), 2560 × 1600 (33.6). Green
  on this head. T40b (16 px sticky wherever main is) green on both.
- At 16 px nothing moves: 0 of 6,360 boxes at 1280 × 900, 1440 × 900 and 1920 × 1080, both routes,
  top and stuck, scripts on and off.
- Forge's sweep, fonts 12 to 32: 0 overruns on this head, 504 on main.
- Riding along, Lens's two T39 nits (Probe): T39a reads the ring mask's reach as well as its hole;
  the tokens invariant rejects named colours but the mask's white and black.
- `pnpm verify` passes on the integrated head.

**Decisions:** `.crew/sprint/80/decisions.md`. At large fonts the drawing's drag field gives up the
type's growth (about 80 px at 24 px, 120 at 28); Iris is asked whether that reads right.

**Retired checks:** none.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZRfz7CdFUfD8F9CRL
