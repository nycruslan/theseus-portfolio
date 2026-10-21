# Team state

The running progress log, so the next sprint starts with what the team already knows instead of
rediscovering it. Atlas adds one entry per sprint, newest at the bottom. When this file passes about
150 lines, fold the oldest entries into a short summary at the top.

## Sprints 0-13, folded

What they shipped is in `ROADMAP.md`'s Done list and each sprint's `retro.json`. The lessons that
still hold:

- **Contracts.** Ground every check in a spike or the current page: sprint 7's unspiked WebGL draft
  took three Lens rounds, sprint 9's measured rewrite one, and sprint 13's contract on real data built
  in five minutes. Name the visitor's outcome, and treat file lists as a guide, not a fence. Read the
  existing specs first: the color scan bans `oklch(`/`oklab(` calls and hex-looking SVG ids, and a
  spec that hard-codes the page's sections breaks on any new one, so the contract names that edit.
- **Specs.** Writing them first catches checks nobody can build. Push them alone first on
  browser-sensitive work, with a check of the harness itself as the readout. Run scope.mjs's
  weakening rules on a new spec before review: any added `test.skip(` needs the owner. Prove specs
  against a reference build with mutants, capped at about 10 (sprint 13's 49 took 44 minutes).
- **Building.** A builder who measures in the browser catches what a direction misses; try a "small"
  design fix there before dispatching it. A recipe from an old review is a diff against an old
  baseline: apply only its named change onto main's current classes.
- **Review.** Settle the PR body and labels before the `review` label, since Lens reads the body
  first. Advice taken after Lens's ship costs a full re-review, so batch cheap advice unless it's a
  real risk.
- **The browser.** A scroll-driven animation is a frame stale after a jump scroll, so never move
  click targets with it. A fade tied to scroll can leave text mid-fade at load and fail axe contrast:
  sweep window heights for motion work. Helpers that await every animation hang on view-timeline
  ones; filter to `document.timeline`. Read WebGL pixels from screenshots (`readPixels` and
  `toDataURL` return zeros outside the drawing frame). Size against the container, not the viewport.
  Next's flight scripts carry `prefers-color-scheme`, so a text scan of the HTML sees it.
- **Next.js.** Under `cacheComponents`, a sync `node:fs` read in a Server Component prerenders, and
  `readdirSync` on a runtime path needs `/* turbopackIgnore: true */` on its argument, or Turbopack
  traces the whole project. On today's page, LCP is body text (the bio, or the first Experience
  summary at 1440), not the h1.
- **Publishing team files.** Retros were written as notes, not copy (`outcome` is set before the
  merge): before publishing a field, check it stays true after the merge. A prototype fed by real
  data settles calls a written direction would guess.
- **The environment.** Production (https://theseus-portfolio.vercel.app) is reachable from cloud
  sessions since 2026-10-20: compare against it. Check the cloud browser's Chromium against CI's
  before trusting a browser-sensitive readout.

## Sprint 14: the build log's way in (PR #43)

- **Outcome:** PR B (merged as 576dc32 before its close-out reached it; these notes came in a follow-up PR), which finishes "Watch the team build": a copper "Build log · N sprints" line under the
  bio on `/`, counted by the same `readSprintLog()` as `/sprints`. Probe's `e2e/sprints-entry.spec.ts`
  (C14, C15) went first, red, with 10 mutants all caught. Forge built it in one pass, with sprint 13's three
  riders. Lens said ship on the first run. Iris said changes at 7.5: the new line's ring touched its dot,
  the defect the same PR fixed on `/sprints`. One fix round, then Lens ship again on 9f5ee4c.
- **Lesson:**
  - A fix for a pattern (the `mx-1` dot) belongs in the brief for every new instance of the pattern, not only
    the one the finding named.
  - Capping the mutants at 10 kept the specs at 11 minutes (sprint 13: 44) and still caught every fault.

## Sprint 15: the redesign's direction (PR #47)

- **Outcome:** the L lane's direction step for the owner's redesign, no product code. Iris chose "the log of
  the Theseus" (a ruled ship's log; the hull's 22 planks replaced one per sprint, copper the newest) over the
  network concept, with a static prototype on the real facts, Besley and Libre Franklin (65.9 KB), a motion
  storyboard and budgets. Quill's contract splits the build into B1-B5 and gives the hero 11 checks. Quill's
  read caught the newest plank leaving a phone's view; Iris fixed it with one hull formula and a 75% bronze
  cap. CI failed once on biome lint of the prototype. Lens ship twice, with nits folded into the notes. Waits
  for the owner (`needs-owner`).
- **Lesson:**
  - biome lints the sprint folder too: run `pnpm exec biome ci` on any prototype before it is pushed.
  - A contract writer reading a design for checks finds what the designer missed (the cropped plank); keep
    that round before the review label, and have the designer measure every N the rule will see.

## The owner's interview, 2026-10-21 (sprints 15 and 16 superseded)

- **Outcome:** the owner hadn't seen sprint 15's direction before merging #47, and sprint 16's B1
  (#49) was building on it. The owner was interviewed instead, and the redesign restarts from that
  record (`PRODUCT.md`) and a rewritten `design/brief.md`. #47's direction is superseded, and #49
  closed unmerged.
- **Lesson:** a direction the owner can only reach by opening a file in the repo isn't reviewed.
  Put it on a Design canvas, ask for their comments there, and build only once they approve (the
  sprint skill's L lane).

## Sprint 17: the redesign's direction, on a Design canvas (PR #51)

- **Outcome:** the L lane's direction step, done the owner's way: Iris published the direction on a
  Design canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5), 20 artboards at 1440 and 390 with
  the loft storyboard, rest state, motion stills and read view, real facts and real three.js renders of
  the hull. It keeps the brief's "draw the hull, then rebuild it at sea": a registered loft, a white card
  model with no sea, and one material per state. Four calls wait for the owner there. Lens ship on the
  first run with four nits. No build starts until the owner approves on the canvas.
- **Lesson:**
  - A direction's memory lines stay "pending the owner" until the canvas is approved; Lens catches them
    stated as settled.
  - Render sources left for another role need a recipe that runs from a fresh checkout.

## Sprint 18: a share card for the build log (PR #52)

- **Outcome:** `/sprints` serves the site's share image again (`app/sprints/opengraph-image.tsx`
  re-exports the root's), with Probe's C2.3 checking one `og:image` and one `twitter:image`, each a
  real PNG, and the placeholder guard in `e2e/content.spec.ts` re-armed as a rider. The redesign
  waited: the canvas had no owner comments yet. Probe and Forge ran in parallel worktrees on disjoint
  files; Lens ship on the first run with one nit (the layout's comment), left as a rider.
- **Lesson:**
  - When the top item waits on the owner, take the next item that doesn't touch it rather than idle.
  - An S with a spec runs fastest as two parallel worktrees (spec and fix), integrated by cherry-pick
    and run together once before the review label.

## Sprint 19: the build log's goals as copy (PR #53)

- **Outcome:** a goal's trailing size tag ("(L)") no longer prints on `/sprints`, where the meta line
  already gives the size; other parentheticals stay and a tag-only goal still throws. This amends sprint
  12's presentation rule (`.crew/sprint/19/brief.md`). Probe (oracle, C4b, C12.7, red first) and Forge
  (`lib/sprint-log.ts`, the layout comment rider) ran in parallel worktrees; integrated by cherry-pick
  and run together green before the label. Lens ship on the first run with one placement nit, left as a
  rider. The redesign still waits for the owner on sprint 17's canvas.
- **Lesson:**
  - A rule the reader and Probe's oracle both implement needs both changed in one sprint: brief them as
    the same rule, word for word, and the two copies agree first time.
  - A nit that only moves code in a spec is cheaper as a rider than as a second Lens run.

## Sprint 20: the drawn dots survive forced colors (PR #54)

- **Outcome:** the Stack's separator dots and the build log's bullets carry
  `forced-colors:before:bg-[CanvasText]`, and the Stack list clips with `overflow-x-clip` instead of
  `overflow-hidden`. Probe's C8 emulates forced colors at 390 and 1440 and was red on main first; the
  spec riders (C4b's place, U+00A0 escapes) rode along. Probe and Forge in parallel worktrees again;
  Lens ship on the first run with two coverage nits, left as Probe follow-ups. The redesign still waits
  for the owner's comments on sprint 17's canvas.
- **Lesson:**
  - In forced colors Chromium repaints a background-only dot opaque Canvas, not transparent: a check
    that it "shows" compares it with the page's background.
  - A check named "clips only sideways" needs both halves asserted; Lens reads titles against bodies.
