## Sprint 53 (M): Ya, every step is a page

**Goal:** the yard's first sprint (`ROADMAP.md`, "Now: the yard"). The milestone's next sprint was
planned by Quill in sprint 52, under the owner's sprint 52 goal.

**Size:** M. **Contract:** `.crew/sprint/52/first-contract.md` (Y1 to Y8). It is amended in
`.crew/sprint/53/contract.md`, so every count comes from the record (Lens's nit on #118).

### What a visitor sees

- **On `/log/n`:** the Theseus as it stood after sprint n, above the ghost hull as it stood then.
  Crew planks are white and originals grey; the ghost holds what the crew took out, with gaps for
  what still sails.
- **In the record's head:** "← Sprint p" and "Seat sprint q's plank →" step through the real
  merges. From /log/15 the next step is /log/17.
- **On `/log`:** both ships as they stand today, with "Start again from sprint 1".
- **On /log/23,** where the last original leaves: "The ghost hull is whole again. Which one is the
  Theseus?"
- The count line describes its step, and its wording defects are fixed ("1 … is out", "The gap is
  the 1", "1 plank").
- It works with no script and in every mode, and every step is a URL. Ya adds no script.

### Who did what

- **Iris:** the placement and words (`placement.md`, with its phone-row addendum), the GHOST_LIT
  call, and an early look. Her verdict was ship (8.2), and it is posted below as advice.
- **Forge:** the rule (`shipsAt` in `lib/lines-plan.ts`), the Theseus drawing, the step pages, the
  links and the CSS.
- **Pixel:**
  - the 3D ghost on partial steps. The chunk already followed it, and the fix round trims the seam
    ends at a gap;
  - Yc's two-hull spike (`spike-pixel.md`).
- **Probe:**
  - Y1 to Y8 (`e2e/log-yard.spec.ts`, with the oracle in `e2e/retros.ts`), red first;
  - the contract mutant;
  - the named rewrites.

### Contract results

SEE_RESULTS

### The kept checks this rewrites, and why

Each rewrite was found red on Probe's contract mutant (a bare Ya on the unedited suite). The bounds
are unchanged unless stated.

| Check | Why it was red | The rewrite |
|---|---|---|
| **B5.18** (`log-model.spec.ts`) | On /log/13 the ghost now has 13 planks. Frame 1's coverage has gaps, while the old 2D silhouette filled the whole outline. | The plank count is the step's, `GHOST_AT(n)`. Registration uses the drawn planks plus the stroked outline, Pixel's like-for-like silhouette, with B3.1's bound unchanged. On /log it measures the same as before, and it still bites a mutant that draws all 22 or is offset 3 px. |
| **B5.19** | The numbers and band samples assumed a whole ghost on /log/13. | It uses the step's ghost. The record's mark may change the canvas on the step's gap seats. |
| **B5.19, loosened** | On /log at 1440 light, stern plank 5.0 read L 0.850 against the 0.85 floor. | 5.0's light floor is **0.84**, Iris's call. The other 21 planks keep 0.85 to 0.935, and dark is unchanged. |
| **B5.25's Tab clause** | "Start again" now comes between Off and `/crew#keel` on /log. | The clause names it in its DOM place. B5.25's 320 × 568 clause is **kept unedited**: the placement moved instead (decision 4). |
| **B5.6's names** | The step links are renamed. | The two names, "Back to sprint p" and "Seat sprint q's plank". The hrefs are unchanged. |
| **B5.3's /log clause** | At 390 the first row starts at 877. | It reads `#every-revision`, the loosening the contract accepted in advance. Its records clause is unchanged. |
| **B5.1's header-end row** | Below 768 the phone row now sits under the h1 (Iris's addendum). | The row is still `.log-head`'s next element, set under the h1 and above `[data-theseus]`, in one band. |

Why the 5.0 floor moved: the red is a whole-pixel row shift. The settled pose is identical when
shifted a row, with 0 of 161,100 pixels differing (Pixel). On main, 16 of 5.0's roughly 46 pixels
were already under 0.85.

No check is retired.

### Decisions

See `.crew/sprint/53/decisions.md`. In short:

- The 3D chunk is unchanged, apart from the seam trim.
- The record's column holds still from 1024.
- B5.25 is kept, and the phone row moves under the h1.
- B5.18 registers on the drawn planks.
- GHOST_LIT stays at 0.4.

### For the owner

Nothing waits on you. One undoable change to note: Iris moved the Log's phone row (Read as page and
the motion control) from the drawing's foot, where you accepted it with #78, to the head of the
drawing band under the h1, as on `/` since Wb. It was needed to keep the control inside a 320 × 568
screen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbTHXWLWKUteR7iRiG
