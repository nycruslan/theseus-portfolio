Verdict: changes (7.5/10, better than production; advisory, calibration folder still has no owner examples)

# Sprint 14: Iris's review of the home line and the meta-line dots

I reviewed 04b5cdb on a local `pnpm build` and `next start --port 3320`, run in a scratchpad worktree.
Production is unreachable from the sandbox (CONNECT 403). A build of `origin/main` (d98bb25) on 3321
stands in for it. I used agent-browser `--session iris` to walk the page (snapshot, hover, following the
link to `/sprints`) and Playwright scripts to measure. Widths were 320, 390, 1024 and 1440, in light and
dark.

Only one thing stands between this PR and ship: finding 1, about three lines of code. The home line
repeats the very focus-ring defect that this PR fixes on `/sprints`. The rest is ready.

## Against production

**Better.**
- Production has no way from `/` to the log. This PR adds it where direction §1.2 put it, and nothing
  else on `/` changes.
- Below the header, every section's offset from the hull, its box size and its text length are
  identical to main at 390 and 1440.
- The hull moves down by one line plus the gap: 41.6 px at 320, 41.8 at 390, 43.6 at 1024 and 44.8 at
  1440. At 390x844 its bottom is at 678.8, so it's still whole in the first viewport.
- At 1440 the copper "Build log" sits 64 px above the hull's one copper plank, the pairing §1.2 asked for.
  It reads as intended in both schemes: the first copper text, then the copper plank.

## Hard gates: all pass

- **Placeholder:** none added. The line reads "Build log · 13 sprints", with the count taken from the
  retros.
- **axe:** zero violations on `/` and `/sprints` at all four widths, in both schemes.
- **Detector** (URL scan of `/` and `/sprints`): only `overused-font` (Geist), at warning level, the same
  as main's `/`. The file scan of `app/page.tsx` and `components/sprint-entry.tsx` is empty.
- **Reduced motion:** nothing in the header animates under either setting (0 animations; the line's
  opacity is 1 and its transform is none). Under `reduce` the page has 0 animations, the same as main.
- **320 reflow:** `scrollWidth - innerWidth = 0` on both routes at every width.
- **Phone budget:** measured at 390x844 with 4x CPU and 400 kbps at 400 ms latency.
  - LCP is the bio `p` at 1500 ms (main: 1504).
  - CLS is 0.0150 (main: 0.0146). That shift isn't this sprint's: see finding 3.

## Direction §1.2, §1.3, §6, §7, measured

- **§1.2 structure:** `header > p.text-step-base:last-child` holds `a[href="/sprints"]` "Build log" and
  then `span.text-muted` with NBSP, the dot and "13 sprints". It's 16 px under the bio (`gap-4`).
  - Link colour is `--accent` (148 65 38 in light, 235 138 100 in dark) and the span is `--muted`.
  - On hover the link turns to foreground (15 34 32), the same as a Contact link.
  - The link is 25.6 px tall at 320, 25.8 at 390, 27.6 at 1024 and 28.8 at 1440, which clears the 24 px
    target.
  - With scripts on, Tab goes skip link, then "Build log", then the first project link.
  - The link's accessible name is "Build log" and the count is read after it. Accepted.
- **§1.3:** following the link lands on `/sprints`, and its back link is unchanged from sprint 13.
- **§6:** the line is one line at every width. At 320 it's 145 px wide (63.8 for the link and 81.3 for the span) in a 272 px column, so the dot
  never starts a line.
- **§7:** the line adds one copper link and nothing else: no badge, no box, no counter chrome, and the
  count is muted text.
- **Sprint 13 item 1 (the `/sprints` meta dots): fixed, and exactly as asked.**
  - The dot now has 7.34 to 7.38 px on each side at every width, the same before and after, so it's
    symmetric. On main it was 3.33 on each side.
  - The PR link's ring now clears the dot by 3.34 to 3.38 px. On main it overlapped by 0.63 to 0.67 px.
  - The links are still 24 px tall.
  - See `sprints-focus-1440-light.png` against `sprints-focus-1440-light-main.png`.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 8 | One quiet line that closes the header in the page's own voice. The first copper text above the copper plank makes the pairing the direction promised. |
| Originality ×2 | 7 | The idea is the placement: proof right after the claim, echoing the plank. It's restrained by design, with no new mark. |
| Craft ×1 | 7 | The `/sprints` fix lands to the pixel. The home line repeats the same touching ring, and at rest its dot is 4 px tight while the log's is now 7.4 px, so the two ends of one feature now space the same separator differently. |
| Functionality ×1 | 8 | Second tab stop, targets of 25.6 to 28.8 px, in the server HTML, the hover matches Contact, and it works the same in both schemes. |

Weighted: (16 + 14 + 7 + 8) / 6 = **7.5/10**. Every criterion is at 6 or above, so the scores alone
would pass. The verdict is `changes` only because finding 1 is a known defect this PR repeats, and it's
cheap to fix here.

## Findings

1. **The home link's focus ring touches the dot after it (cheap; the one change).**
   - The span's NBSP measures 4.00 px at 320, 4.02 at 390 and 4.48 at 1440 from the link's right edge to
     the dot's glyph box.
   - The shared ring sits 4 px outside the link (2 px offset plus 2 px width). It clears the dot by
     0 to 0.48 px, so on focus it runs into the dot at every width, in both schemes. That's the sprint 13
     item 1 defect, mirrored to the ring's right side, on the first link a keyboard user reaches on `/`.
   - See `home-ring-zoom-390-light-built.png` and `home-ring-zoom-1440-dark-built.png`.
   - **Fix:** do what `components/sprint-entry.tsx` now does. Inside the existing `span.text-muted`,
     render the NBSP, then `<span className="mx-1">·</span>`, then ` {n} sprints`.
   - I injected exactly that on the running build:
     - The dot gets 8.0 px on each side at 320 and 390, and 8.5 at 1440.
     - The ring then clears it by 4.0 to 4.5 px (`home-ring-zoom-*-mx1.png`).
     - The line grows by 8 px, to about 153 px at 320, so it's still one line.
   - It stays inside C14.1. The `p`'s element children are still `A` and `SPAN`. The span's
     `textContent` is still `" · 13 sprints"` (checked after the injection), and its first character
     is still U+00A0. The outer span keeps `text-muted`, so C14.2 reads the same colour.
   - Leave the shared ring alone.
2. **At 320 the airier dots wrap more meta lines on `/sprints` (no change).**
   - 6 of 13 meta lines now wrap at 320, against 2 on main. Every one breaks after "Owner's call ·", with
     "Pull request #N" whole on line two, which is the break §6 specifies. Each wrap costs 24 px.
   - Nothing wraps at 360 or 390.
   - This is the price of the clear ring, and I accept it.
3. **A font-swap shift on `/` under a slow phone profile (exists on main too; for Quill, later).**
   - Under 4x CPU and 400 kbps, at about 3.0 s, the bio is one line shorter in the fallback font than in
     Geist. When Geist arrives, the header text moves 3 to 5 px and everything below it moves 28 px. That
     gives CLS 0.0150 on the PR and 0.0146 on main.
   - It's under 0.1, it's on production already, and the home line only adds itself to the moved area.
     Strictly, though, it misses the gate's "nothing shifts after load".
   - A later sprint should look at the fallback metrics (`next/font`'s `adjustFontFallback`, or a tuned
     `size-adjust`). It shouldn't be fixed in this PR.
4. **"13 sprints" while sprint 14 is open (no change).** The count is the entries `/sprints` renders,
   which is what the contract asks for. This PR's own retro lands with it, so production will read
   "14 sprints" and agree with its log.

## Screenshots

All in `/tmp/claude-0/-home-user-theseus-portfolio/c7cabd1e-bd7f-5e20-a20e-414fa20b50f7/scratchpad/iris-shots/`:
- `home-{320,390,1024,1440}-{light,dark}-{pr,main}.png`: `/`'s first viewport on the PR and on main.
- `home-header-{320,390,1024,1440}-{light,dark}.png`: the header and the hull's top.
- `home-focus-*.png` and `home-ring-zoom-{320,390,1440}-{light,dark}-{built,mx1}.png`: the home link's
  ring, as built and with finding 1's fix injected (3x scale).
- `sprints-focus-{320,1440}-{light,dark}.png` and `sprints-focus-1440-light-main.png`: the meta-line ring
  after and before the fix.
- `sprints-{320,390,1024,1440}-{light,dark}-{pr,main}.png` and `sprints-320-entry2-{3320,3321}.png`: the
  log, and the 320 wrap.
- `ab-home-390-dark.png`, `ab-home-1440-hover.png` and `ab-sprints-1440.png`: the agent-browser pass.

The measurement scripts are in
`/tmp/claude-0/-home-user-theseus-portfolio/c7cabd1e-bd7f-5e20-a20e-414fa20b50f7/scratchpad/iris-scripts/`.

## Not verified

- Production itself, since main stood in for it.
- The `1 sprint` and no-retro branches of the line, the same gap the PR body names.
- 768, and print.

## Proposed memory lines (for Atlas to bring over; I didn't write memory)

- Sprint 14 review (.crew/sprint/14/review-iris.md): changes 7.5/10 at 04b5cdb, better than prod
  (main d98bb25 stood in). The `/sprints` dot fix landed (7.4 px each side; the ring clears the dot by
  3.3 px). The new home line repeated the touching ring (0 to 0.5 px clear). I asked for the same `mx-1`
  dot span, which keeps C14.1's textContent.
- Separator rule: every "link · text" join on this site is an NBSP, then the dot in its own `mx-1` span,
  then a space. The shared ring needs 4 px plus clearance. Check every new separator next to a link with
  the link focused, at 3x.
- A slow phone profile (4x CPU, 400 kbps) shows a 0.015 font-swap CLS on `/` on main too: the bio is one
  line shorter in the fallback font. It's pre-existing, so report it, and don't fail a sprint on it
  unless the sprint grows it.
