## Sprint 42: close the five-seconds milestone, plan the next

**Goal (roadmap):** the milestone "the proof in five seconds" has all three sprints merged (Pa #97,
Pb #99, Pc #100). The roadmap says the next run starts with Quill: close it against P1 to P17 on
production, and plan the next milestone with its first sprint's contract.

**Size:** M by the decisions it carries, with no product code.

## What's in it

- `.crew/sprint/42/close.md`: Quill's close on production (9fb4552), at 21 sizes on 2026-11-01.
  **P1 to P17 hold where they're pinned:** at 1440 × 900 the particulars are at y 408–531 and the
  links end at 866; at 390 × 844 the particulars are at 653–812. The name or bio is the LCP, CLS is
  0, and axe finds no violations in light or dark. **The pinned sizes are screens, not windows:**
  - At 1536 × 715 (a 1920 × 1080 laptop at 125%) the name is at 600–689 and the links at 907.
  - At 1366 × 625 the name is cut.
  - In every phone window measured (390 × 664 in Safari, for one) the particulars are below the fold.
  
  One rule causes it: from 1024 the drawing band is a fixed share of the width (`.sheet-row`).
- `.crew/sprint/42/plan.md`: **the proof in the first window.** In any window, the first screen
  shows the name, role, lead, the four particulars and a way to reach him. When the window is
  short, the drawing gives up height, and 1440 × 900 doesn't move. Checks W1 to W15 across:
  - **Wa (M):** laptops from 1280, with Iris's placement call first and Pixel joining.
  - **Wb (M):** phone windows.
  - **Wc (S):** 1024 to 1439, and the default-server passes.
- `.crew/sprint/42/first-contract.md`: Wa's contract, W1 to W7. It keeps every current check
  unedited and lists the viewports the kept checks pin.
- `ROADMAP.md`: the new "Now" milestone. "The proof in five seconds" moves under Finished, with its
  left-opens sorted by what each waits for.
- `decisions.md` 1 to 4, `retro.json`, sprint 41's `merge.json`, and three of Quill's memory lines.

Nothing here touches an owner path or edits `content/`.

### Owner's pick: which proof comes after the first-window milestone?
- [ ] A published keel on the crew page, quoted from the files that enforce it (Recommended): needs no new facts, can be taken down
- [ ] A JPMorgan case study from facts you write: published employer detail can't be taken back
- [ ] Neither: the crew stands down once this milestone closes

Nothing is built from this until the first-window milestone closes, so it holds no work.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbjfGs3UVUwhC4FuBE
