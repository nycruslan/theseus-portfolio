## Sprint 55: Yc, the press in 3D

**Goal:** the yard's next sprint on the roadmap, "the press in 3D". On the Log, in Full and Calm,
the Theseus joins the ghost in one canvas, and a press of a step link (or ← →) moves one real
merge's plank: in Full the leaving plank lifts, arcs and lands on the ghost's seat and the sprint's
card plank knocks in; in Calm the change is a 240 ms fade. The words become the step's, from the
server; the URL is replaced; a live region names the step on landing. Off and no script are
unchanged.

**Size:** M. Pixel built the 3D (`lib/model/ships.ts`, `press.ts`, the Log's mount), Forge the
controller (`lib/model/yard.ts`) and the live region, Probe the checks first, Iris the looks
(`press-iris.md`) and two review rounds (`review-iris.md`: changes 8.2, then ship 8.3).

**Contract:** `.crew/sprint/55/contract.md` (Y12 to Y18), plus Y19 from Iris's review.

### Results

- `pnpm verify` passes on the head.
- `e2e/log-press.spec.ts` (Y12 to Y19) and `e2e/log-model.spec.ts`: 22 of 22 on the head (Probe,
  6.5 min on 2 workers). Pixel's run of every `log*` and `model*` spec on the integrated press: all
  green but B5.19's stray clause, since settled (below).
- Each new check is red on main, and the tightened ones on broken builds: a press that moves two
  planks (Y13), a press that never lands (Y15), the ×4 dark lamp (Y19), the question's layout shift
  (Y16).
- Budgets: loader +0 B (`components/model.tsx` untouched; B2.10 and B5.10 unedited). 3D chunk
  164,627 B gzip -9, +9,656 B against main, over the plan's 4 to 7 KB estimate and far under the
  250,000 B cap (decision 8). At most 7 draws pressing (cap 8), at most 27,321 triangles from 768
  (cap 30,000) and 11,039 below (cap 12,000), 0 frames at rest. No layout shift on any press
  measured.
- `/` is unchanged: `lib/model/stage.ts` serves only `/` and Crew and keeps its look; the `model*`
  specs pass.

### Checks rewritten or retired (for Lens), each its own commit

Named before the build by Probe's contract mutant (a bare two-hull canvas turns them red by
design, because the canvas now spans both drawings; decision 6):

- **B5.18** (`93aa726`): the canvas lies on the union of both drawings' boxes, not the ghost's. Edge
  clause kept. Proven red with the canvas 2 px off.
- **B5.19** (`ccba822`, `8ecc762`): the band and mark reads run over `[data-ghost]`'s box, from its
  unrounded corner. Proven red on variant B (mark on 3.0, GHOST_LIT 0.8).
- **B5.19 loosened** (`36c918e`, `65a5002`; decision 10): hover reach 4 → 5 px, because the pick
  hull's edge moved 0.25 px; a change counts beyond 32 levels, not 24, because a far-side gap seen
  through the vellum changes one pixel 26 levels (18 on main) and `data-pick` names a seat, not a
  side. Main and the build read 0 strays; variant B stays red (134 pixels away from 6.1 at 1440).
- **B5.20** (`e6cb143`) and **B5.23** (`7895491`): their plank helpers walk `[data-ghost]`'s box,
  since the canvas's middle row is now the Theseus's caption. B5.23's ≤ 8 draws unedited.
- **Y6, retired clause** (`bae1c9b`): "the Theseus's planks still painted" at rest in Full and Calm.
  The 2D Theseus beside a 3D ghost is gone; Y12 checks the Theseus where it is now drawn.
- **Y13 to Y15** (`dea973b`) were tightened on the real flight, and **Y19's read** (`915f46f`)
  measures each number against the plank's fill, leaving out drawn lines in its box (decision 14);
  both are this sprint's own checks.

### Decisions

`.crew/sprint/55/decisions.md`, 1 to 14. The ones a visitor would notice:
- The knock follows the landing; the Theseus on the Log settles at the ghost's turn with no
  shadow; from step 24 the leaving card plank lifts and fades in place (Iris).
- Numbers hold their place across cold loads of neighbouring steps. Production moved untouched
  numbers (the ghost's 6, x 504 on `/log/13` against 414 on `/log/14`); here they stay.
- The Log's Theseus has its own dark light, so its numbers read 4.88:1 at worst (2.07:1 before).

No Owner's pick: nothing here touches an owner path, `content/` or anything that can't be undone.

### Not verified

Frame times and motion feel on a real GPU or phone (SwiftShader only); the Vercel preview by eye
(Iris reviewed local production builds).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdgLA6Prz4QEfdHobk
