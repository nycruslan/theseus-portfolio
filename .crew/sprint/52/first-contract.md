# Ya's contract: every step is a page (Quill, sprint 52)

**The outcome.** On `/log/n`, a visitor sees the Theseus and the ghost hull as they stood after
sprint n, with that sprint's record beside them. "Seat sprint m's plank" takes them to the next
step, and the previous step is a link too. `/log` shows both ships as they stand today, with "Start
again" to the first step. At the step where the last original leaves (sprint 23 today), the page
asks which one is the Theseus. It all works with no script, under every motion mode, and every step
is a URL that reproduces the moment. Ya adds no script. The 3D ghost follows its step's drawing, and
the Theseus stays a drawing until Yc (`plan.md`).

## The rule, word for word (Forge's page and Probe's oracle)

- **The steps.** The steps are the Log's merged sprints in ascending sprint order (`MERGED`: 1 to 15,
  then 17 to 51). Step n is merged sprint n, the i-th of them, counting i from 1.
- **The ships after step n.** The first i merged sprints have seated their planks. The k-th seats
  `ORDER[(k − 1) mod 22]` (`lib/lines-plan.ts`).
  - The Theseus: each seat shows the last of them to seat it, as its `data-sprint`. A seat none of
    them seated shows its original.
  - The ghost: each seat shows the first of them to seat it. A seat none of them seated is a gap.
- **`/log`** is the newest step, with no plank marked current in either ship.
- **The count line** (`p[data-ghost-count]`), with k = i:
  - If k < 22: "`k` of 22 original planks `is` / `are` out." ("is" when k = 1), then "The gap is the
    1 still sailing." when 22 − k = 1, else "The gaps are the `22 − k` still sailing."
  - If k ≥ 22: "All 22 original planks are out: the last went with sprint `MERGED[21]`." When k > 22,
    add " Since then the crew has replaced `k − 22` `plank` / `planks` of its own."
  - On `/log` today (k = 50) the words don't change, so `GHOST_COUNT` holds.
- **The question.** `p[data-yard-question]` reads "No original plank is left, and the ghost hull is
  whole. Which one is the Theseus?" It appears on exactly one step, the one where k = 22, and on no
  other page. The 22 comes from the rule, not from a hard-coded 23. Iris may reword the sentence
  before the build. The check then quotes her words.

## Iris's calls come first

1. **Placement** at every width, within the measured room (production, scripts off, 2026-11-07):
   - **1440 × 900.** The ghost sits at y 178 to 357 in the left column, and /log's first row at 650.
     A Theseus at the ghost's size, 179 px tall, plus a one-line caption fits above the ghost and
     keeps the first row above 900. The record's column, on the right, doesn't move.
   - **390 × 844.** The record's head row is at 547 to 591 and its h2 at 595. The h2 is 63, 95 or
     126 px tall, and 126 on sprints 3, 4, 7, 9 and 10. B5.7 wants the tenth row's h2 wholly in view,
     and that row changes with every merge. So **at most 123 px can be added above the record's h2**.
     The Theseus at 358 px wide is 71 px tall in the ghost's layout.
   - The step links sit in the record's head (below). If they fit its existing row, they cost
     nothing. A row of their own costs 44 px.
2. **The words:**
   - the two step links, which Probe's names then follow;
   - "Start again";
   - the Theseus's caption, which must name its step's sprint, or the newest sprint on `/log`;
   - the question.
3. **Full and Calm until Yc:** a Theseus drawing beside the 3D ghost. If the pair doesn't read as
   one yard, she says what the drawing changes, within Y6.

## Checks

- **Y1 Each step's drawings.** On every merged step `/log/n`, and on `/log`, in the server HTML and
  with scripts off at 1440, there are two drawings:
  - `[data-theseus]`: one per page, `aria-hidden`, with 22 `path[data-plank]`. The seated ones
    carry `data-sprint` exactly as the rule's Theseus (`THESEUS_AT(n)` in `e2e/retros.ts`), and the
    rest are `.plank-original`.
  - `[data-ghost]`: its planks exactly the rule's ghost (`GHOST_AT(n)`). The existing hooks stay,
    and `[data-model]` still follows it directly.
  - The two are told apart by these hooks: the Theseus is never `[data-plan]` or `[data-ghost]`.
    On `/log` the Theseus equals `THESEUS_AT(newest)` and the ghost equals `GHOST`.
  - Shown with scripts off: /log/1 has 1 ghost plank and 21 originals, /log/13 has 13, /log/23 has
    22 and 0 originals, and /log/24 has a seat whose Theseus number differs from its ghost number.
- **Y2 The plank that just went in.** On `/log/n`, exactly one Theseus plank carries
  `data-current`, at n's seat, numbered n. The ghost's `data-current` stays as B5.4 has it. On
  `/log`, neither ship has one.
- **Y3 The words say what the drawings show.**
  - On every step, the count line reads the rule's words for k.
  - The Theseus's caption contains the step's "sprint n".
  - `p[data-yard-question]` is on exactly the k = 22 step, scripts on and off, after the count line
    and before the record. No other step has it, and neither does `/log`.
  - A worked example: /log/1 reads "1 of 22 original planks is out. The gaps are the 21 still
    sailing.", /log/22 reads "The gap is the 1 still sailing.", and /log/24 reads "… replaced 1
    plank of its own."
- **Y4 The steps are links, in order.**
  - In each record's head, before its h2: `a[data-step="previous"]` to `/log/<the previous merged
    sprint>` (not on step 1), and `a[data-step="next"]` to `/log/<the next>` (not on the newest).
    Each appears once on the page. From /log/15 the next step is /log/17.
  - On `/log`: exactly one `a[data-step="start"]`, to `/log/1`. Records have none.
  - All three are ink, never copper, at rest, hovered and focused. They wear the site's ring, and
    measure at least 44 px tall below 1024 and 24 × 24 px from 1024.
  - **The walk.** With scripts off at 390 × 844, from `/log`, pressing "Start again" and then
    "next" 21 times (1 to 15, then 17 to 23) lands on /log/23 with the question in the HTML. Back returns to /log/22.
- **Y5 In the first screen.** At 1440 × 900 and 390 × 844, in both schemes:
  - On `/log`: the start link and the top of both drawings start in the viewport.
  - On /log/13, /log/23 and the newest step: the next link (on the newest, the previous one) and
    the top of both drawings.
  - This adds to B5.3 and B5.7, which still hold on records unedited.
- **Y6 Whole in every mode.**
  - With WebGL refused, Off stored, or scripts off: on /log, /log/13 and /log/23 every plank of both
    drawings is painted at full opacity.
  - In Full and in Calm at rest, on the same pages at 1440 and 390:
    - exactly one canvas, the ghost's;
    - the Theseus drawing's planks still painted, never hollowed;
    - the 3D ghost's planks exactly `GHOST_AT(n)`, so /log/13's canvas has 13 and no others;
    - no console errors.
- **Y7 Accessible.**
  - On /log/1, /log/23 and the newest step, the B2.9 invariants that `ROUTES` already runs on /log
    and /log/13: axe, tokens, overflow from 320 to 1440, 24 px targets, and nothing animating.
    Run them in Y7's own loop, not by adding to `ROUTES`.
  - Both drawings are `aria-hidden` and hold nothing focusable. Nothing in them is hit by
    `elementFromPoint`, as B5.4 tests the ghost.
  - Ya adds no heading, so B5.9 C9.3 stays as it is.
  - In forced colours, every Theseus plank's edge shows.
- **Y8 Budgets.**
  - 0 B of new script: B2.10 and B5.10 unedited, with bytes before and after reported.
  - The Theseus drawing's outerHTML is at most 32,768 B, B5.4's cap for the ghost.
  - The LCP on /log, /log/13 and /log/23 at 4x CPU is text in main, outside both drawings, within
    2,500 ms.
  - CLS 0 from load to rest + 2 s on /log/23 at 320, 390 and 1440. B5.25 keeps /log and /log/13.
  - In 3D, on /log/13, B5.23's draws ≤ 8, triangles at or under budget and 0 frames at rest still
    hold unedited. The chunk's bytes are reported, and grow only if Pixel's gap fix needs code.

## Kept checks this touches

**The viewports they pin:**

| Check | Viewports |
|---|---|
| B5.3 | 1440 × 900 and 390 × 844 |
| B5.7 | 390 × 844 and 1440 × 900 |
| B5.14 | 1440 × 900 |
| B5.1 and B5.25 | 320, 390, 768, 1024 and 1440 |
| B5.9 C8.1 | 320 to 1440 |
| B5.10 | 390 × 844 and 1440 × 900 |
| B5.18's fit | 320 × 568, 768 × 1024 and 1024 × 768, plus the two defaults |

| Check | What it pins | With Ya |
|---|---|---|
| B5.18, `log-model.spec.ts:358` | on /log/13, ghost planks sampled `toBe(SEATS.length)`, 22 | **Red.** Rewritten by Probe: on /log/13 it reads `GHOST_AT(13)`. Same assertions, the expected value per page. |
| B5.19, `log-model.spec.ts:590` | the 22 number spans read `GHOST` on /log/13 | **Red.** The same rewrite. Its title names the step's spans, not 22 (Lens reads titles against bodies). |
| B5.25's Tab clause, `log-control.spec.ts:156` | on /log, after Off comes the key's `/crew#keel` | **Red.** "Start again" comes between them. Rewritten to name `a[data-step="start"]` in its DOM place. |
| B5.6 names, `log-record.spec.ts:452` | the record's links: hrefs {`/log`, previous, next}, named "Rev p" and "Rev q", once each | **The hrefs stay green:** the step links are the record's previous and next, moved to its head. If Iris renames them, Probe rewrites the two names only. |
| B5.3's /log clause, `log.spec.ts:718` | /log's first row starts in the viewport | Likely red at 390 × 844 (717 today, with 127 px of room). This is the one loosening I accept in advance: `ROWS` becomes `#every-revision`, the same `expect` count. Its records clause stays. |
| B5.9 C10, `log.spec.ts:1895` | /log/13's Tab order, with the record's links read from the DOM | Unedited, while the step links stay inside the record. |
| B5.6 C5.3, `log-record.spec.ts:386` | the allowed hrefs on /log and records | Unedited. Every step link is `/log` or a record. |
| B5.6 C4.2, `log-record.spec.ts:94` | the record after the count line and before Every revision | Unedited. |
| B5.4, `log.spec.ts:968` and `:1274` | /log's ghost is `GHOST`, the caption and `GHOST_COUNT`; each record's ghost `data-current` at its seat | Unedited. The step's ghost always holds its own sprint's seat. |
| B5.24, `log-pick.spec.ts:50` | on /log/13, a pick on another shown plank opens its record | Expected unedited: a shown number's seat doesn't change with n. The mutant confirms it. |
| B5.14, B5.10, B2.10, B5.23, B5.1, B1.6, B2.9 (`ROUTES`, `keyboard.spec.ts:544`) | the lines figure, LCP, bytes, 3D cost, the foot row, copper, rings and the invariants on /log and /log/13 | Unedited. They now cover the new links and drawing. |

**Before the build,** Probe runs the unedited suite on a scratch build with a bare version of Ya,
the contract mutant (`.crew/STATE.md`, sprint 48's lesson): the step drawings, the moved links and
the start link, with no styling. I expect B5.18 and B5.19 on /log/13, and B5.25's /log Tab clause.
Every other red goes into the PR as a named rewrite before Forge's build is final.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/`, /log and records | B2.10 and B5.10, unedited; Y8 |
| The 3D chunk ≤ 250,000 B; ≤ 8 draws; triangles at or under budget; 0 frames at rest | B5.23, unedited; Y8 |
| The Theseus drawing ≤ 32,768 B of HTML | Y8 |
| LCP is text, outside both drawings | B5.10 and Y8 |
| CLS 0 | B5.25 and Y8 |
| `/` unchanged | W1 to W17, B1.1, B4.22, P3 and P8, unedited (Ya doesn't touch `/`) |
| CI: each shard under 20 minutes | reported. Y1 loads 50 steps and Y4 walks 22 pages, so Probe reads its shard's time before the label |

## Out of scope

- The cards and step titles (Yb), the 3D Theseus and the press (Yc), the riffle and the hand-off
  (Yd), and the door on `/` (Ye).
- A `/log/0` step. It stays a 404 under B5.6.
- The timeline bar, the two counters, "Copy link", and fix rounds and minutes in the record line.
  All are in Iris's frames, and none is in Ya. The last two would publish retro fields `/log`
  doesn't show today.
- The lines figure as of each step (B5.14 pins the newest), the pencil on /log, and any owner path
  or `content/`.

Nothing here waits for the owner.
