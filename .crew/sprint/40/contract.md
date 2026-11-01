# Sprint 40 contract: who built it, in plain words (Pb; Atlas wrote it from Quill's plan)

**The outcome.** A hiring executive on `/` can tell, without leaving the first screen (at 1440 and up and on phones; from 1024 to 1439 the key is hidden, decisions 9), that the
names in the revision block are AI agents the owner directs, and what each column means. `/crew`
says the same of every member, and `/log`'s key reads the same words. From sprint 38 on, every
sprint's goal is written for a visitor, so the five rows read plainly within five sprints without
rewriting the record. Today "AI agents" is only a 13 px muted caption on `/`, `/crew`'s body never
says "AI", and four of the five rows open with a milestone code or a URL path
(`.crew/sprint/38/plan.md`, "Why this").

## Data rules (brief Forge's code and Probe's oracle with these words)

- **The key**, one source in `lib/` that `/` and `/log` both render, with `{first}` the first word
  of `profile.name` (today "Ruslan"):

  `Every name is an AI agent {first} directs. Approved: Gate is CI, his rules and Lens's review;
  Owner is his own call.`

  At 1440 it is one line (decisions 8).

  Its text, squashed of whitespace, is exactly that (one space where the line above breaks). Iris
  may set parts of it in another weight; the words don't change.
- **On `/`:** one `p[data-crew-key]` inside `section[aria-labelledby="revisions"]`, after its `table`
  and before the plank count and legend in DOM order. Server HTML, inert (no `a`, `button` or
  `[tabindex]`), not copper.
- **On `/log`:** the same `p[data-crew-key]`, replacing today's `.log-key` paragraph ("Under Approved,
  Gate is CI, …"), with the same text as `/`'s.
- **On `/crew`:** each `tr[data-role]`'s job cell (its first `td`) reads, squashed,
  `<word>, AI agent` (e.g. `Code, AI agent`, `Lead, AI agent`), in every feed state (live, open,
  resting, down) and after a poll replaces the panel. "AI agent" is visible text, not
  screen-reader-only. Where rows fold below 768 px into the "not on this sprint" sentence, that
  sentence is unchanged.
- **The goals rule:** every `.crew/sprint/<n>/retro.json` with `n ≥ 38` has a `goal` that
  - holds no milestone code: no match for `/\b(?:[A-Z]\d+[a-z]?|P[a-z])\b/` ("B4e", "C5", "Pa");
  - holds no URL path: no match for `/(^|\s)\/[a-z]/` ("/crew", "/log");
  - is at most 78 characters (STATE.md, the revision block's one-line rule).
  Retros before 38 are the record and aren't checked or rewritten.

## Checks (Probe writes them red first, in a new `e2e/plain-words.spec.ts`)

- **P8 The key on `/`, in the first screen.**
  - Scripts on and off, at 1440 and 390: exactly one `p[data-crew-key]` in the revisions section, in
    the DOM order above, with the exact text; its words are in `GET /`'s HTML.
  - At 1440 × 900, in light and dark, on the default server and the live, open and resting
    fixtures (B4.22's harness): the key is wholly in the viewport, and so is every item B1.1 lists
    and the five rows (`first-screen.ts`). At 390 × 844 it follows the rows (it needn't be above
    the fold there).
  - Its text has 4.5:1 contrast in both schemes, it overflows nothing at 320, and it isn't copper.
- **P9 `/crew` labels each of the seven an AI agent.** The job cell rule above, on the
  server-rendered page in all four fixture states with scripts off, and again after a poll swaps
  the panel (crew-live's harness). The page's visible body text contains "AI agent" seven times
  at 1440.
- **P10 `/log`'s key is `/`'s.** `/log` has one `p[data-crew-key]` with the same text as `/`'s, and no
  `.log-key` element with other words.
- **P11 The goals rule** over the retros in the checkout, as a data test (no browser), and the
  rule's oracle on fixtures: "B4e: replay …" and "… on /crew …" fail, sprint 39's goal passes.
- **P12 `/crew`'s riders (Lens's nits on #95).**
  - Shift+Space and Meta+Space don't toggle Pause updates; Space alone still does (Ctrl and Alt
    already don't).
  - The unused `crew-block` class is gone from `components/crew.tsx` (a grep in the spec is fine).
  - A `#replay` arrival in a hidden tab doesn't play until the tab is visible: emulate
    `document.visibilityState` and the `visibilitychange` event; the replay's first moment is
    unshown while hidden and plays once visible.
  - The transport surviving a Strict Mode re-run is Forge's fix with its reason in the PR; Lens
    reads it. It needs no browser check (production never double-runs effects).
- **P13 `/`'s rider (Iris, sprint 34):** on a short seat at 1024 and below, the 2D drawing's
  copper dot (`[data-tip]`) paints above the plank number's chip: at a seat where the chip's box
  meets the dot's box (Off path, live fixture), the topmost element at the dot's centre
  (`elementFromPoint`) belongs to `[data-tip]`. Prove it's red on main. The 3D label's half of
  Iris's note (Calm) is out of scope.

Probe reports each new spec's time and the full suite's at CI's worker count.

## Live checks

Kept unedited, and a red one is a stop for Atlas, not an edit: `sheet.spec.ts` (B1.1, B1.2,
B1.5, B1.6, B1.10, B2.9), `plan.spec.ts` (B1.8, B1.9), `read.spec.ts` (B2.10: 0 B of new script on
`/`), `live-layer.spec.ts` (B4.17 to B4.24), `particulars.spec.ts` (P1 to P7), `invariants.spec.ts`,
`keyboard.spec.ts`, `log*.spec.ts` apart from the key's text, and the 3D suites.

Edits that follow the new behaviour, each named in the PR with its reason (Lens accepts them):
- the `/crew` oracles' expected job word (`e2e/crew.ts`, `e2e/crew-live.ts`) becomes
  `<word>, AI agent`;
- any check that pins `/log`'s old key sentence reads the new one.
Nothing may loosen an assertion.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| LCP stays the `h1` at 1440 | B1.9 and P6, unedited |
| CLS 0 | B1.8, unedited |
| Nothing new is copper | B1.6, B4.17, P8 |
| B1.1's items and the five rows in 1440 × 900 | B1.1, B4.22, P8 |
| CI: the full suite at CI's worker count under `check`'s cap | reported in the PR |

## Out of scope

- Rewriting any past retro's goal.
- The sprint skill's retro step (`.claude/`, the owner's): the goals rule's long-term home goes to
  the owner as a proposal in this sprint's retro; meanwhile STATE.md holds it.
- `/crew`'s long cache `expire` (Iris, sprint 35): dropped. `readCrew` serves `/`, `/crew` and
  `/api/crew` alike, so a long expire would hold `/`'s stale page too, which never polls; and since
  sprint 36 the build's page reads the feed as unread, so the false "Live" Iris saw can't be served
  any more (`lib/crew-feed.ts`, the `PHASE_PRODUCTION_BUILD` line).
- The 3D label over the dot (Pixel's half of the chip note), Work's sentences and the social card
  (Pc).

Nothing here touches an owner path or `content/`, so nothing waits for the owner. He may overrule
the key's words after the merge.
