# Sprint 37 (B4e) review: Replay on `/crew` (Iris)

**Verdict: ship, 8.4/10, on 6470d74.** It's **better** than production, and every hard gate passes.
I have no musts. My four calls were built as made, and the early look's two musts, three shoulds
and one nit are in (fb5274d, decision 7).

## How I looked

- **The build:** 6470d74, from `git archive` into a scratch copy, installed offline, `next build`,
  and served with `next start` on port 3438.
- **The feed:** a stand-in feed serving the Studio's real `last`: sprint 36 resting, with its 48
  replay moments from 08:44 to 15:51 UTC, merge last.
- **The browser:** Playwright's Chromium with SwiftShader (WebGL on). The replay was stepped on
  `page.clock`.
- **Production** (`/crew`, live on sprint 37 now) was compared with the build at rest.
- **Shots and logs:** the scratchpad's `iris37/finalshots/` (`f-*`, `log.txt`).

## Hard gates

| Gate | Result |
|---|---|
| Placeholders | None added (diff over `app`, `components`, `lib` and `content`) |
| axe (wcag2a/aa, 21a/aa, 22aa, best-practice) | 0 violations: 1440 light at rest and mid-replay; 390 dark at rest and mid-replay |
| impeccable `detect --json` (the six changed UI files) | `[]` |
| Reduced motion | The replay steps (k 4 after 4.5 s), with 0 running animations. The camera never moves for a replay |
| 320 | Overflow 0 on `/` and `/crew`, at rest and mid-replay, in both schemes |
| Phone budget | 390 at DPR 2, 4× CPU, 1.6 Mbps and 150 ms, three runs: LCP 820 to 856 ms, the element text (`.crew-line`), CLS 0 at load. That's sprint 36's 812 to 856 ms |

## What I hadn't verified, now checked

- **A resume waits a full step.** With the clock paused (`pauseAt`), I paused 1,000 ms into a step
  and nothing came in 10 s. After the resume there was still none at +600 or +1,499 ms, and the
  next moment came at +1,500 ms.
- **Space toggles a replay that has started,** with focus on nothing:
  - pressed, then unpressed;
  - k held while paused, and +1 a step after the resume;
  - scroll held at 394 both times.

  Before any press Space scrolls (0 → 677) and starts nothing. At the end it scrolls (394 → 1132)
  and restarts nothing.
- **The end in 3D** on the real sprint:
  - At k 47 the keel plank 6.1 is in pencil on the turned card hull, with "36" on its chip and 10
    ticks hanging under the keel. The stamp is shown.
  - At k 48, the merge, it is inked (`data-run="inked"`, 0 ticks, "36" in ink 700). The stamp and
    the key go in the same frame, the model stays `settled`, and the camera holds.
  - The next step hides "Pause replay". Nothing in `.crew` or `[data-plan]` is copper at any step.

## Compared with production: better

- **Production at rest** tells "Crew resting. Sprint N merged…" and the last ten moments, with no
  way to see the work unfold.
- **The build** offers "▶ Replay sprint N" on both pages. On `/` it sits at the rest line's right
  end and costs 0.3 px; the title block's links stay at 866.3 at 1440×900 and 799.8 at 1280×800.
- **The replay** plays the whole sprint into the Activity block, headed "Replay", newest on top.
  The plank goes back to pencil under a boxed REPLAY stamp, takes a tick per moment, and cuts to
  ink at the merge.
- **The panel's head keeps telling the present.**
- **Nothing else changed.**

## Score (`design/rubric.md`)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 8.5 | The sheet's own grammar end to end: pencil to ink, a drawing-office stamp, one word swapped in a heading, ink controls, no copper. It loses a little on phones, where the press lands on the list and the inking happens above the fold |
| Originality ×2 | 8.5 | A merged sprint redrawn on the plank it built and inked at its merge, with the real record as the script. No media-player template |
| Craft ×1 | 8.5 | Scroll held through the end at four widths, a resume waits a full step, and Space is scoped. One-line times by subgrid, the stamp on the text edge, axe 0 and overflow 0. Rows entering at the top shift the page 0.003 to 0.03 a step |
| Functionality ×1 | 8 | One entry and one pause, a 44 px phone target. Without scripts the entry is a jump to the record. Sprint 36 takes 70.5 s with no way to the end but waiting (by design: no Leave control) |

**Weighted:** (2 × 8.5 + 2 × 8.5 + 8.5 + 8) / 6 = **8.4/10**.

## Follow-ups (none blocks)

1. **On phones the inking happens out of sight.** The press lands on the list, so the drawing is
   scrolled away at the merge. That needs the owner's eye on a phone before any change.
2. **Length.** 70.5 s for sprint 36, and up to 88.5 s at the cap. If the owner finds it long, the
   one addition worth making is "Skip to the merge", not a faster pace.
3. **Layout shift per step:** 0.0026 at 1440, 0.015 at 390 and 0.029 at 320. Rows enter at the
   top. Each step is its own window, since steps are 1.5 s apart, so a replay adds 0.03 at most.

## Not verified

- A GPU, DPR 3 and a real phone: the 3D is SwiftShader.
- The 400 kbps profile; I measured at 1.6 Mbps.
- A screen reader.
- Browsers other than Chromium, including subgrid in the time column.
