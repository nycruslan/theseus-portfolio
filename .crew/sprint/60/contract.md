# Hb's contract: the door, with the room made first (Atlas, sprint 60)

**The outcome.** A visitor on `/` who reads the revision block finds one plain link, "Rebuild it
yourself", beside the Log link, and it takes them to the yard's first step. The hiring executive's
first screen doesn't move: the room comes from the legend, which stops keying "Original" when no
original plank is on the drawing (today none is, on `/` or `/read`: "22 planks: 22 replaced,
0 original").

The second sprint of `.crew/sprint/58/plan.md` ("Hb"). Size **M**. Checks **H8 to H11**. No owner
path, no `content/`, no owner answer needed. Iris's fit, measured on production after Ha merged, is
`fit.md` beside this file; the numbers below are hers.

## The rule, word for word (to Forge and Probe alike)

- **The legend.** `PlankLegend` shows its "Original" item exactly when the drawing beside it has an
  original plank, which is when its count line's original number is above 0
  (`planks - replaced > 0`). On `/` and on `/read` today that is never, so both legends show
  "Seated by a sprint" first and drop "Original"; the pencil and copper items follow as before.
  "Seated by a sprint" always shows.
- **The door.** In the revision block's foot row (`components/revisions.tsx`), the Log link and the
  door share one `div.flex.flex-wrap.items-center.gap-x-6.gap-y-1`, the Log link first. The door is
  `<a href="/log/{the first merged sprint}">Rebuild it yourself</a>` with the Log link's classes
  word for word: ink, semibold, a 1 px underline 3 px out, `min-h-6`, 2 px on hover. No arrow, no
  copper, no icon. Its target is the same address `/log`'s own "Rebuild it yourself" goes to
  (`components/log.tsx`, `data-step="start"`).
- **Tab order** on `/`: … the key's his rules (`/crew#keel`), the Log link, then the door, then the
  case studies. Contact's first link becomes the 26th stop.

## The checks

- **H8 The legend keys only what's drawn.** On `/` (default, live, open, resting) and `/read`, in
  both schemes: no legend item reads "Original" while the count line reads "0 original", and no
  `.plank-original` is drawn beside it; "Seated by a sprint" is the first item; live adds pencil and
  copper after it, open pencil only. Proven red on main, and against a mutant that hides the item
  unconditionally on a fixture with an original plank drawn, if such a fixture exists (Probe says
  whether it does; if not, a unit read of the rule from `PlankLegend`'s props stands in).
- **H9 The door.** On `/` at 320, 390, 768, 1024, 1280 and 1440 wide, in every feed state: exactly
  one link reading exactly "Rebuild it yourself" in the revision block, after the Log link in the
  DOM and on the same line or the next; its href equals `/log`'s start link's; following it lands
  on that step with a 200; its font weight, colour, underline and offset equal the Log link's; at
  least 24 × 24; one 2 px ink focus ring as the Log link's; never `--accent`; Tab reaches it right
  after the Log link and right before the first case study.
- **H10 `/`'s first screen.** W1 to W17, B1.1, B4.22, P3 and P8 pass unedited. Plus a 1 px sweep of
  window widths 1380 to 1440 at 900 tall, in the default, open, resting and replay states, with the
  webfont and with fonts blocked: the Contact links' bottom is never lower than the figure Iris
  measured for today at that width and state (`fit.md`), except open, which may drop to today's
  live state's place at that width and no lower (the plan's "in open moves only to the live
  state's place"; Forge measured 7.2–7.9 px at 1410–1440, 874.2 at 1440, decisions.md); and it is
  always inside the first screen; "All
  N revisions in the Log" is in the first screen at 1440 × 900.
- **H11 The named rewrites, at their strength.** Each says what it pinned before and pins the new
  truth as tightly:
  - B2.3 (`e2e/keyboard.spec.ts`): Contact's first link the 26th stop, the door between the Log
    link and the case studies;
  - B1.5 (`e2e/sheet.spec.ts`): the block's links gain the door, after the Log link;
  - B4.19 (`e2e/live-layer.spec.ts`): "Seated and Original" becomes "Seated" alone first, every
    other clause unchanged;
  - B2.9's forced-colours rider (`e2e/sheet.spec.ts`): `/` and `/read` draw no original plank and
    now show no Original swatch, so it reads the original plank's paint where one is drawn (a step
    page before 23, e.g. `/log/13`) against a seated plank and Canvas, keeps the seated swatch on
    `/` and `/read`, and checks that neither draws an original plank. The swatch half retires
    with its item, and the PR names it as a retired check with this reason;
  - `e2e/live-layer.ts`'s legend finder: finds the list by "Seated by a sprint", not "Original";
  - B4.49, if its Tab clause names "then the Log link" as the last before the case studies.

  Before the build, Probe runs the unedited suite on a scratch build with a bare version of the
  change (the item hidden, the door added), and names every red here as a decision. A red not on
  this list is a contract change, recorded in `decisions.md`.

## Budgets

| Budget | Limit | Check |
|---|---|---|
| Loader script on `/` | 0 B added | B2.10, unedited (the change is server-rendered markup) |
| CLS on `/` | 0 | B4.22 and W, unedited |
| `/`'s first screen | never lower than today's | W1–W17, B1.1, B4.22, P3, P8 unedited; H10 |
| CI | each shard under 20 minutes | Probe reads the slowest shard's time |

## Out of scope

- The Log CSS follow-ups from sprint 59 (the row 4 px lower, the `20rem <= width < 48rem` scope,
  the numbers during a riffle): they ride with the next sprint on the Log's CSS.
- Any change to `/log` or a step page; the legend's words; the count line's words.
- The fleet, bounces, sound; owner paths and `content/`.
