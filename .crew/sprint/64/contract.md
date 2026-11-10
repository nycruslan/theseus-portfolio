# Sprint 64 contract: Tb, drag it, and send it

Atlas wrote this from Quill's plan (`.crew/sprint/62/plan.md`, "Tb"). Changes made during the build
are recorded in `decisions.md`.

**The outcome.** On the trials page, with script, a visitor takes the frame's corner and drags:
Ruslan's first page reflows under their hand, the waterline stays at the window's foot, and the
contact links' freeboard is measured from the frame's own document as they go. When they let go the
window settles on one the crew swept, the page reads its answer aloud, the address becomes that
window's (replaced, not pushed), and Copy link hands them a dare with a true answer. Every window's
address unfurls as its own card: "Under by 6.2 px. The crew's own gap." Without script, Ta's page is
unchanged.

Goal, as `/` prints it: "Drag the window yourself, and the page measures as you go" (57).

## Atlas's calls

1. **A release settles on a swept window.** Only swept windows have addresses that answer 200 with
   the sweep's number (T1), so a drag that ended at 403 × 611 would send a link that redirects to
   a different window with a different number. During a drag the frame follows the hand to the
   pixel; on release (pointer up, or a key) it settles on the nearest swept window by the grid's
   rounding (contract 63, "The addresses"), or on a pinned or named window when the release is
   within its grid cell's half step (so 390 × 664 and 320 × 568 can be reached by hand). The keys
   step by the grid: arrows one step (16 px wide, 5 px tall), Page Up and Down ten steps of
   height, Home and End the grid's corners. This replaces the plan's "arrows 1 px".
2. **The number at rest is the sweep's; the number in motion is the visitor's browser.** At rest
   `[data-freeboard]` shows the swept value, as Ta does, so the page and the address never
   disagree. During a drag it shows the live measure, marked as measured live. In the suite's
   Chromium the live value at a swept window equals the sweep within 0.5 px (T11).
3. **The record follows the hand.** The verdict and the rules shown are the settled window's,
   computed on the client from the same `PINS` and words Ta's server uses (one module, imported
   by both), so the controller never asks the server.
4. **The live frame is still scriptless.** The frame keeps `sandbox="allow-same-origin"`; the
   controller resizes its box and reads its document. No script runs in it (plan, call 6).

## Checks (T10 to T15)

- **T10 The controller loads on the first touch, and not before.** With script, at load, the
  trials page's script beyond the 404's is at most 1,024 B gzip (the listener that waits), and no
  controller chunk is requested until the first pointerdown or focus on the corner or the size
  inputs. After the first touch, the trials page's own script beyond the 404's is at most 8,192 B
  gzip in all (Tc's chart included later). 0 animation frames requested at rest. T8's clause
  "script beyond the 404's 0 B" becomes this check's numbers: a named rewrite.
- **T11 A drag lands where it says.** A pointer drag of the corner (Playwright mouse, in steps)
  from `/trials` (1440 × 900) to near 390 × 664 and released: the frame's document is exactly the
  settled window (`clientWidth` w, `innerHeight` h), never scrolls, and `[data-freeboard]` equals
  the sweep's value and a direct measure by Ta's rule within 0.5 px. Mid-drag (before release) the
  shown freeboard equals a direct measure of the frame's document within 0.5 px at that moment.
  The drawn frame keeps w:h within 1 px and stays inside its column; the waterline stays at its
  foot within 1 px.
- **T12 Keys and a finger.** The corner is a `button` named with the window, at least 44 × 44 px,
  that takes the arrows (one grid step), Page Up and Down (ten height steps), Home and End; each
  key settles at once. A held finger (CDP touch events) drags it as the mouse does.
  `touch-action: none` is on the handle only, and the page still scrolls by touch elsewhere. The
  Width and Height inputs follow the frame live and, edited, move it. A polite live region speaks
  once per settle (the window and its verdict, in Iris's words), never during a drag. Focus stays
  on the handle through a key drag.
- **T13 The address is replaced, never pushed.** After a drag and after a key settle,
  `location.pathname` is the settled window's address (`/trials` for 1440 × 900), the document's
  title and the canonical link are that window's, and `history.length` is unchanged. Back leaves the
  page as it would have before the drag. A reload of the replaced address shows the same window,
  verdict and number with scripts off. Copy link (a `button`) writes the settled window's absolute
  URL to the clipboard and says so in the live region.
- **T14 Quick under the hand.** At 4x CPU throttling, a 40-step pointer drag across the corner's
  range: every Event Timing entry for pointer events during it is within 200 ms (INP of the drag),
  gated. The page requests no animation frame once settled (rest + 1 s).
- **T15 A card per window.** Each swept window's address has its own `og:image` and
  `twitter:image`, an `image/png` of 1200 × 630, whose alt text and drawn words carry the window's
  size, its signed freeboard from the sweep and its verdict in Iris's words ("Under by 6.2 px. The
  crew's own gap." for 320 × 568). `/trials`'s card is 1440 × 900's. A window off the sweep never
  gets a card (it redirects first).

## Kept checks this touches

| Check | With Tb |
|---|---|
| T8 (`e2e/trials.spec.ts:1361`), "script beyond the 404's 0 B" | Named rewrite to T10's numbers; the rest of T8 unedited, and its "nothing animating" holds at rest. |
| T1 to T7, T9 | Unedited. Scripts-off clauses are Ta's page exactly. T6's form walk runs scripts off. |
| B2.10, B4.14 | Unedited: no shared chunk grows on `/`, `/log`, `/read`, `/crew`. |
| B2.9's `ROUTES`, the link allowlists and Tab bounds on `/`, `/crew`, `/log` | Untouched: nothing changes off the trials. |
| The 3D chunk (B3.6 and kin) | No import of three. |

**Before the build,** Probe runs the unedited suite against a scratch build with a bare client
component on the trials page (the contract mutant) and names every red.

## Budgets

| Budget | Limit | Check |
|---|---|---|
| Trials script before the first touch | ≤ 1,024 B gzip beyond the 404's | T10 |
| Trials script after the first touch | ≤ 8,192 B gzip beyond the 404's | T10 |
| INP during a drag | ≤ 200 ms at 4x CPU, gated | T14 |
| Frames at rest | 0 | T10, T14 |
| `/`, `/log`, `/crew`, `/read` script | unchanged | B2.10, B4.14 |
| CLS | 0, as Ta | T8 |
| Copper | never on the trials page | T8 |

## Out of scope

The chart and the fits (Tc), the doors (Td), scripts in the frame, anything on `/`, the bar, sound,
writing anything anywhere. The frame's 465 KB of `/`'s scripts that it fetches and never runs (Lens's
nit on #130) is Pixel's call in the spike: answered here only if the frame can stop fetching them
while T2's `main` equality holds; otherwise it stays a follow-up, named in the PR.
