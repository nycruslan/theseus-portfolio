# Sprint 39 contract: the particulars (Pa; Quill wrote it in sprint 38)

**The outcome.** In the first five seconds on `/`, at 1440 × 900 and 390 × 844, a hiring
executive reads the scope and scale of the owner's work in his own words: the team he leads, who
uses what he built, the platform's reach and its impact. It's a table of principal particulars,
as a lines plan carries beside its title block, in server-rendered text, clear of the hull. Today
one of the seven figures in `content/profile.ts` is in the first view, and the other six sit 1.1
to 2.0 screens down inside one paragraph (`plan.md`, "Why this").

## Data rules (brief Forge's rule and Probe's oracle with these words)

- **Source:** the `summary` of the `experience` entry whose `company` is `JPMorgan Chase & Co.`
  (Detail A's source, `lib/detail-a.ts`).
- **Rows, in this order, as term and phrase:**
  1. `Leads`: `a team of 7 across AI research, backend and platform`
  2. `Reach`: `multi-agent workflows several thousand employees use firm-wide`
  3. `Gateway`: `around 8 product teams route through`
  4. `Impact`: `cut manual processing on the flagship workflow by about 55%`
- A row shows only while the source holds its phrase as written, or with the first letter in the
  other case. Its `dd` shows the phrase with only its first letter's case open to choice (Iris
  picks). With fewer than two rows, there is no block.
- Terms carry no digits, so the block's only figures are the owner's.
- **Markup:**
  - one `dl[data-particulars]` in `main`, after the `h1` and before
    `section[aria-labelledby="revisions"]` in DOM order;
  - not inside `[data-plan]` or any `aria-hidden` subtree, and not a `section` (B2.9's regions,
    C1's order);
  - each row is a `dt` then its `dd`, optionally wrapped in a `div`;
  - nothing focusable inside.
- **Placement is Iris's call, made first** (`plan.md`, Pa: (a) the bottom row takes about 80 px
  from the drawing band, or (b) the band's empty corner under the body plan). Pixel joins only for
  (a).

## Checks (Probe writes them red first in `e2e/particulars.spec.ts`)

- **P1 Server-rendered, verbatim.**
  - With scripts on and with JavaScript disabled, at 1440 and 390, `/` has exactly one
    `dl[data-particulars]` that meets the markup rule.
  - Its rows equal the rule's output for the real profile: four, with these terms exactly and
    these phrases.
  - The four phrases are inside it in `GET /`'s HTML.
  - Its `outerHTML` is at most 2,048 B.
- **P2 The rule on fixtures** (the oracle mirrors the words above, as B2.2's does):
  - the real summary gives the four rows;
  - one phrase removed gives three, without it;
  - "Cut manual processing…" capitalised in the source still shows Impact;
  - three phrases removed give no block;
  - the oracle's terms hold no digit.
- **P3 On the first screen in every state.**
  - At 1440 × 900 and 390 × 844, in light and dark, on the default server and on the live, open
    and resting fixtures (B4.22's harness), the `dl` is wholly inside the viewport.
  - Every item B1.1 lists (and at 1440 its five rows) stays inside it, by `first-screen.ts`'s
    `firstScreen` and `insideViewport`.
  - No text in the `dl` is as large as the `h1`.
- **P4 Clear of the hull.**
  - With WebGL refused, at 768, 1024, 1280 and 1440 wide (900 tall), the `dl`'s box meets no
    `[data-plan] [data-plank]` box grown by 24 px, and no box of the drawing's lettering (`[data-plan] .plan-view > span`; the contract first said `[data-plan] text`, which matches nothing, decisions 5).
  - On Full at 1440 × 900, once the loft has settled (B3's settle wait), and with the `dl` set to
    `visibility: hidden`, take a screenshot clipped to its box. Take it again with
    `[data-model] canvas` hidden as well. At least 99.5% of the pixels match within 8 a channel,
    so the hull and its shadow paint nothing there. The `dl` is told apart from the drawing, not
    by its own pixels (STATE.md: text over WebGL composites differently).
- **P5 Readable in every mode, still.**
  - It shows with scripts off, in print (`emulateMedia({ media: "print" })`), and in forced colours
    (each `dt`'s and `dd`'s colour differs from its background's).
  - On Full with no reduced motion, and under reduced motion: no animation in its subtree at load
    or 2 s later, and its box doesn't move between 100 ms and 3 s after load.
- **P6 LCP stays the name.**
  - By B1.9's measurement at 4× CPU, the LCP element is the `h1` at 1440 × 900, and at 390 × 844
    the `h1` or the bio's paragraph. On production on 2026-10-31 they were the `h1` (596 ms) and
    the bio (344 ms).
  - Green on main: prove it with the mutant that sets the `dl` at the name's size.
- **P7 Inert, and in the sweeps.**
  - No `a`, `button` or `[tabindex]` in the `dl`.
  - At 1440 and 390 in both schemes: axe with B4.24's strict tags is clean on `/` with the block
    present; every `dt` and `dd` has 4.5:1 text contrast; nothing overflows at 320.

## Live checks: all kept unedited

Nothing is rewritten or retired. These cover the block's neighbours and must stay green as they
are:

- `sheet.spec.ts`: B1.1, B1.2, B1.5, B1.6, B1.7, B1.10, B1.11, B2.3 and B2.9.
- `plan.spec.ts`: B1.4, B1.8, B1.9, C6, C9 and B2.5.
- `facts.spec.ts`: B2.1 and B2.2.
- `read.spec.ts`: B2.10 (0 B of new script).
- `keyboard.spec.ts`: Contact's first link is still the 16th stop.
- `invariants.spec.ts`: tokens, overflow, targets and regions.
- `live-layer.spec.ts`: B4.17, B4.22 and B4.24.
- `profile-sections.spec.ts`: C1 to C8.
- `content.spec.ts`.
- With option (a), the 3D suites too: `model-*.spec.ts` and B4.21.

A red one is a stop for Quill, not an edit.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| LCP text in the title block, ≤ 2,500 ms at 4× CPU; the name at 1440 | B1.9, unedited; P6 |
| CLS 0, nothing moves | B1.8, unedited; P5 |
| No copper | B1.6 and B4.17, unedited |
| The block's markup ≤ 2,048 B | P1 |
| CI: `particulars.spec.ts`'s time, and the full suite's at CI's worker count against the 35-minute cap | reported in the PR |

## Out of scope

- The revision block's key and the agents' labels: those are Pb.
- Work's sentences and the social card: those are Pc.
- `/read`.
- Any other route.
- Any change to the drawing beyond option (a)'s band height.
- New figures or reworded phrases.
- The facts-and-fonts riders.

Nothing here touches an owner path or `content/`, so nothing waits for the owner. He may overrule
the phrases, the terms or the placement after the merge.
