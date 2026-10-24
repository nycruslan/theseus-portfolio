# Team state

The lessons that still hold, so a sprint starts from what the team already knows instead of
rediscovering it. Each sprint's outcome lives in its `retro.json` and in `ROADMAP.md`. Add a lesson
here only when a sprint teaches one the next sprints need. Fold or delete the ones a later change
makes stale, and keep the file under about 100 lines.

## How the crew works, from 2026-10-22

- **Milestones, not a stream of small PRs.** Sprints 18 to 21 spent the day's six sprints on polish
  while the redesign waited for the owner, and nothing a visitor would notice shipped. The
  roadmap's current milestone sets the work; when it can't move until the owner answers, the team
  stands down.
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
- **One run, one sprint.** The owner's "Merged" in a finished run's session started sprint 23 while
  the merge's own run did the same: two PRs for one sprint (#66, #67) and one usage limit shared.
- **A resumed sprint starts the build at once,** notes, checks and build in parallel from the
  contract, cherry-picking Probe's commits as they land (sprint 23: four hours lost to the gap,
  none to the overlap).

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
  - Text painted above a WebGL canvas is composited in its own transparent layer, where CI's
    Chromium drops LCD anti-aliasing for grayscale and every glyph pixel moves; the cloud's renders
    grayscale either way, so sprint 25's "pixel-identical numbers" passed three times here and
    failed twice there. Assert what the text must do (its ink is still there), not its pixels.
  - A kept check that reads what a new state restyles races it: B1.4 read the lettering the hollow
    rule hides and lost to the idle import once. Read such things on the Off path (sprint 25).
  - The stepping rule runs under load: a check that reads the canvas's ratio mid-move sees 1× on a
    loaded runner (CI and two suites together both did). Read ratio-dependent things at rest, and
    give a test page's WebGL context `preserveDrawingBuffer` before screenshotting it (sprint 26).
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
  - A `lens` check that says "no verdict" without running out of turns is a review that died in
    CI, not a judgement: re-run its failed job once (`actions/runs/<id>/rerun-failed-jobs`)
    before pushing anything, since a push re-reviews from scratch. Sprint 24's died at 71 turns
    and 7.6M tokens; the re-run shipped the same head in 36.
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
  - A run's worktrees go with its container: sprint 25 lost its 3D build twice before a commit
    reached a branch. Cherry-pick and push each role's commits as they land. Sprint 26's first run
    ended with three of Pixel's commits on `origin/pixel/26` only, and the second run lost nothing.
  - A resumed run can't force-push a role branch (the cloud refuses `--force-with-lease`): roles
    push to `<role>/<n>-r2` from the sprint head and say so; Atlas cherry-picks from either.
  - `kill $!` on `node .../next start &` can leave its `next-server` child serving the port: check
    the port after, and kill the child by its PID (sprint 26, Pixel).
- **The live layer (sprints 27 and 28).**
  - A compare against the Off page goes red on anything that differs by design between the two
    states (the control's buttons): mask it, and name the mask in the contract before the build
    (`.crew/sprint/27/decisions.md`, 10 and 11).
  - B2.10's script budget on `/` counts decoded bodies, not gzip, and 10 B of it is left: client
    code added to `/` reopens the budget with the owner first.
  - Size an item that reads another system's data only after reading that system: B4 "from the
    Studio's data" had no API (the Studio's roadmap lists one as unbuilt), so sprint 28 wrote its
    contract for the owner (`.crew/sprint/28/feed-contract.md`). The Studio's repository attaches
    to a session read-only (`add_repo`; the crew never edits it), the cloud's proxy reaches only
    its `/api/ingest`, so checks run on fixtures of the contract's shape, and only the owner sees
    the feed on a preview.
