# Team state

The lessons that still hold, so a sprint starts from what the team already knows instead of
rediscovering it. Each sprint's outcome lives in its `retro.json` and in `ROADMAP.md`. Add a lesson
here only when a sprint teaches one the next sprints need. Fold or delete the ones a later change
makes stale, and keep the file under about 100 lines.

## How the crew works, from 2026-10-22

- **Milestones, not a stream of small PRs.** Sprints 18 to 21 used the day's six sprints on polish
  while the redesign waited for the owner. The owner's approval at 13:42 UTC then waited twelve
  hours for the cap to reopen, and nothing a visitor would notice had shipped. Now the roadmap's
  current milestone sets the work. When it can't move until the owner answers, the team stands down.
- **The redesign is the milestone,** on the direction the owner approved on sprint 17's canvas. The
  owner sees it at two demos, on the PR's Vercel preview: B1, which replaces today's page, and B3,
  the signature moment.
- **Models:** Atlas and Iris run on Fable 5.1, every other role on Opus 5.5, each at the effort its
  file states. Lens's effort in CI follows the size of the change.
- **The pre-flight:**
  - The owner's goal isn't held by the daily cap.
  - A PR or branch a run worked on in the last two hours is left to the run still on it. A commit
    counts, and so does marking the PR ready or labelling it `review`. Lens's reviews and the
    owner's comments don't, since they aren't a run.
- **One run, one sprint.** After #62 merged, the owner's "Merged" in the finished run's session
  had it start sprint 23 while the merge's own run did the same. That left two PRs for one sprint
  (#66, #67), and the two crews spent the five-hour usage limit together.
- **A resumed sprint starts the build at once.** Sprint 23's first run ended after the briefs, and
  the next run began the notes, the checks and the build in parallel from the contract, with
  Probe's commits cherry-picked in as they landed: four hours lost to the gap, none to the overlap.

## Lessons that hold

- **Contracts.**
  - Ground every check in a spike or the current page. Sprint 7's unspiked WebGL draft took three
    Lens rounds, sprint 9's measured rewrite one.
  - Name the visitor's outcome, and treat file lists as a guide, not a fence.
  - Read the existing specs first. A spec that hard-codes the page's sections breaks on any new one,
    so the contract names that edit.
  - A contract writer reading a design for checks finds what the designer missed (sprint 15's
    cropped plank). Keep that read before the build.
  - A rule two places implement (the page and Probe's oracle) is briefed to both word for word.
- **The revision block is five rows, and a goal that wraps costs 17 px.** B1.1 wants the title
  block's contact links in the first viewport at 1440 × 900, and the block's height sets where they
  end. It never grows a row a sprint (`ROWS = 5`); each of the five goals that runs past one line at
  1440 (about 78 characters at 13 px in a 466 px column) adds 16.9 px, and with four of five wrapping
  the links end 7 px above the fold. Keep every retro's goal to one line, at most 78 characters, and
  the margin grows as the old two-line rows age out (`.crew/sprint/24/measure.md`).
- **Specs.**
  - Writing them first catches checks nobody can build. On browser-sensitive work, push them alone
    first, with a check of the harness itself as the readout.
  - Any added `test.skip(` needs the owner (scope.mjs).
  - A check added after its fix can't be red on main: prove it with the mutant that turns it red.
  - In forced colors Chromium paints a background-only dot opaque Canvas. A check that it "shows"
    compares it with the page's background.
- **Building.**
  - A builder who measures in the browser catches what a direction misses.
  - A fix for a pattern goes into the brief for every instance of the pattern, not only the one the
    finding named.
  - Parallel builders run in their own worktrees on disjoint files, integrated by cherry-pick and
    run together once before the review label.
  - A recipe from an old review is a diff against an old baseline: apply only its named change.
- **Review.**
  - Lens's turns scale with what a change adds (#63: 40, 60 or 100). A page replacement (sprint
    22: 53 files, about 10.6k lines) took 49 at the top lane, so split work that would outgrow it.
  - Settle the PR body and labels before the `review` label, since Lens reads the body first.
  - Advice taken after Lens's ship costs a full re-review, so batch it unless it's a real risk; a
    nit that only moves code rides along with the next sprint.
  - Lens reads a check's title against its body: a check named for two things asserts both.
- **Designs.**
  - A direction the owner can only reach in a repo file isn't reviewed. It goes on a Design canvas
    for their comments, and nothing is built until they approve there (sprints 15 and 16 were
    superseded this way).
  - Memory about a direction stays "pending the owner" until the canvas is approved.
  - Render sources left for another role need a recipe that runs from a fresh checkout.
- **The browser.**
  - A scroll-driven animation is a frame stale after a jump scroll, so never move click targets
    with it.
  - A fade tied to scroll can leave text mid-fade at load and fail axe contrast: sweep window
    heights for motion work.
  - Helpers that await every animation hang on view-timeline ones; filter to `document.timeline`.
  - Read WebGL pixels from screenshots: `readPixels` and `toDataURL` return zeros outside the
    drawing frame.
  - Size against the container, not the viewport.
- **Next.js.**
  - Under `cacheComponents`, a sync `node:fs` read in a Server Component prerenders.
  - `readdirSync` on a run-time path needs `/* turbopackIgnore: true */` on its argument.
  - Next's flight scripts carry `prefers-color-scheme`, so a text scan of the HTML sees it.
- **Publishing team files.** Retro fields turn public on merge, but `outcome` is written before
  it: check that a field stays true after the merge before publishing it.
- **The environment.**
  - Production is reachable from cloud sessions: compare against it.
  - Check the cloud browser's Chromium against CI's before trusting a browser-sensitive readout.
  - A fresh worktree has no `node_modules`: run `pnpm install --frozen-lockfile` first.
