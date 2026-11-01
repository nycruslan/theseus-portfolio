# Roadmap

Quill keeps this roadmap in milestones: an outcome the owner can see, built as a sequence of
sprints, each one pull request that leaves the site whole. Atlas takes the current milestone's next
sprint, unless the owner set the goal, and at the close-out ticks it with its sprint and PR. Small
fixes and follow-ups ride along with the sprint that touches the same code.

## Done by the owner's session: one site

The earlier portfolio's valuable parts now live here, so this site can take ruslanshulga.com: the
case studies (`content/work.ts`, `/work/[slug]`), the assistant (`/ask`, `/api/chat`), its weekly
evals (`/evals`, `/api/cron/evals`), the agent surfaces (`/llms.txt`, `/api/me.json`, `/api/mcp`),
security headers, Web Analytics, and redirects from the old addresses. So the Owner's pick below no
longer needs its `/work/…` case study option: those are done.

## Now: the proof in the first window

Whatever window a visitor opens `/` in, the first screen shows Ruslan's name, his role, his own
lead, the four particulars and a way to reach him: a laptop browser 1280 to 1920 wide and 620 to
950 tall, a tablet, or a phone browser with its toolbars showing. When the window is short, the
drawing gives up height; the facts don't. At 1440 × 900 nothing moves.

Quill's plan is `.crew/sprint/42/plan.md`, and the measurements are in `.crew/sprint/42/close.md`.
On production on 2026-11-01 the last milestone held at the sizes its checks pin (1440 × 900 and
390 × 844), which are screens, not browser windows. On a 1536 × 715 window (a 1920 × 1080 Windows
laptop at 125%) the name sat on the fold, with the role, the bio and the contact links below it.
At 1366 × 625 the name itself was cut. On every phone window measured (390 × 664 in Safari, for
one), the particulars were below the fold. The cause is one rule: from 1024 the drawing band's
height is a fixed share of the width. The checks are W1 to W15 across Wa to Wc. No sprint needs an
owner answer to start, touches an owner path or edits `content/`.

- [x] Sprint 42 (notes only): Quill closed "the proof in five seconds" on production
  (`.crew/sprint/42/close.md`), planned this milestone (`plan.md`) and wrote Wa's contract
  (`first-contract.md`, W1 to W7). (PR #101, built in one run on 2026-11-01; `decisions.md` 1 to
  4.) Wa starts with Iris's placement call.
- [ ] Wa (M): the sheet fits a laptop window, from 1280 wide. The title block, the particulars and
  the revisions' caption are in the first window at 1280 × 680 to 1920 × 950, and 1440 × 900 is
  unchanged. Iris picks how first: the band gives way, the title block rises beside the drawing,
  or the drawing drops its half-breadth plan. Pixel joins, since the model registers to the
  drawing. Rider: the led-out "42" on the Base line.
- [ ] Wb (M): the sheet fits a phone window: B1.1's items and the particulars at 390 × 664 to
  430 × 746, and B1.1's items at 375 × 548. Iris's call first. Rider: the 3D label over the copper
  dot (Pixel).
- [ ] Wc (S): tablets and the key from 1024 to 1439 (Pa's and Pb's left-opens), and P3's, P8's
  and P9's default-server passes under `PLAYWRIGHT_BASE_URL` (Probe).
- Out of scope, and why:
  - What the facts say, and the loft, the hull's look, the live marks and the replay: the owner's
    demos judge them. The model only follows the drawing.
  - A line about the crew in a phone's first window: belief 1 comes first there, and the bar's
    Crew link is in view.
- **Owner's pick, asked in sprint 42's PR so it doesn't hold the next milestone:** which proof
  comes after this one. The options are a published keel quoted from the files that enforce it
  (recommended; it can be undone), a JPMorgan case study from facts he writes, or standing down.
  Both earlier candidates sit below a first window that is still losing belief 1, so they follow
  this milestone.
- **For the owner, optional:** his B3, B4 and B5 demos will be judged on his own laptop window,
  which Wa changes, so they're best run after Wa merges. The five-second test still stands: show
  `/` to a stranger for five seconds, on a laptop window and on a phone, and ask what he does, at
  what scale, and how to reach him.

## Finished: the proof in five seconds

Pa, Pb and Pc merged by 2026-11-01 (Pc, #100, last). Quill closed it on production in sprint 42
(`.crew/sprint/42/close.md`). At 1440 × 900 and 390 × 844, P1 to P17 hold: the four particulars,
the key, `/crew`'s "AI agent" labels, Work's sentences and the card. Production's last code-named
row (sprint 37's) ages out when sprint 42 merges. **Left open:**
- Taken into "the proof in the first window": short laptop windows, phone windows, the
  particulars below the fold from 1024 to 1279, the key hidden from 1024 to 1439, the default-server
  passes under `PLAYWRIGHT_BASE_URL`, the 3D label over the dot, and the led-out 5.0 number on the
  Base line.
- Waiting for a sprint that touches their code: Lens's two nits on #100 (`lib/card.ts:13`'s
  comment, and `app/opengraph-image.tsx:70`'s rule over an empty table); the 404's first paint in
  the fallback face; the card drawn as a sheet (Iris); and `/` and `/crew`'s dev-only
  instant-navigation message.
- Waiting for a real phone: Detail A's dark-scheme boxes.
- Waiting for a PR the owner reviews anyway: the legend's "Original", the commit-hash link (C5.3),
  and the unknown record's scripts-off 404.
- For Iris to weigh: on slow first visits the display face never paints (`display: optional`; 8
  of 8 cold visits on Slow 4G painted the fallback).

The outcome as planned: on `/`'s first screen, at 1440 and on a phone, a hiring executive reads the owner's scope and
scale (the team he leads, the platform's reach, its users, its impact) in the owner's own words,
and can tell that the names in the revision block are AI agents he directs. A link shared with
them carries the same proof.

Quill's plan is `.crew/sprint/38/plan.md`, with the measurements behind it. On production on
2026-10-31, one of the seven figures in `content/profile.ts` was in the first view, and the other
six were 1.1 to 2.0 screens down at 1440 and 390 (3.0 at 360 × 640), inside one paragraph. "AI
agents" appeared only in a 13 px muted caption, and `/crew` never used the word "AI". The checks are
P1 to P17 across sprints Pa to Pc. No sprint needs an owner answer to start, touches an owner path,
or edits `content/`: the particulars quote the owner's facts and add no figures. The owner may
overrule the phrases, the particulars' place on the approved sheet, or the plain-words rule for
goals, after the fact. The 3D, the loft and the replay stay as built, because the owner's demos
judge them.

- [x] Sprint 38 (notes only): Quill's plan, the milestone as three sprints
  (`.crew/sprint/38/plan.md`), and Pa's contract ready for Iris, Probe and Forge
  (`.crew/sprint/38/first-contract.md`, P1 to P7). (PR #96, built in one run on 2026-10-31;
  `decisions.md` 1 to 4.) Pa starts with Iris's placement call.
- [x] Pa (M): the particulars, the owner's scope and scale on the first screen. Sprint 39, PR #97:
  four rows in the drawing band's empty corner from 1280, a strip row from 1024, after the title
  block below (Iris's option (b), `.crew/sprint/39/placement.md`); an invisible film fill keeps
  their text unchanged as the model lands (`decisions.md` 8). Left open: from 1024 to 1279 the
  table is below the fold at common heights (Iris's call), and P3's default-server pass under
  `PLAYWRIGHT_BASE_URL` (Probe). The rows as first planned:
  - Four rows, each a term and a phrase quoted from the JPMorgan summary: the team of 7, the
    workflows several thousand employees use firm-wide, the around 8 product teams on the
    gateway, and the about 55% cut.
  - In the first viewport at 1440 × 900 and 390 × 844 in every feed state, clear of the hull, and
    no longer the LCP than the name is.
  - Iris places it first: four rows in today's title block push the contact links below the fold
    at 1440 (to y 909–936), so either the drawing band gives about 80 px (Pixel and the 3D suites
    come in) or the rows take the band's empty corner under the body plan.
  - No rider touches its code.
- [x] Pb (M): who built it, in plain words. Sprint 40, PR #99: one key under the revision table,
  "Every name is an AI agent Ruslan directs. Approved: Gate is CI, his rules and Lens's review;
  Owner is his own call.", from `lib/crew-key.ts`, on `/` and `/log`; `/crew`'s jobs read
  "Code, AI agent", with the first sentence where the job column folds; the goals rule as P11.
  Riders done: Lens's four nits on #95 and the chip over the copper dot (2D). Dropped: `/crew`'s
  long `expire` (`decisions.md` 5). Left open: the key is hidden from 1024 to 1439 px, where
  nothing fits under the table without pushing the contact links past B4.22's and B4.49's folds
  (`decisions.md` 9; Iris to find it a home that adds no height); the 3D label over the dot (Pixel);
  P8's and P9's default-server passes under `PLAYWRIGHT_BASE_URL` (Probe, with P3's).
- [x] Pc (M): the facts, scannable and shared. Sprint 41, PR #100: Work's summaries a sentence to
  a line (`lib/sentences.ts`, 6 px apart, `text-wrap: pretty`); `/`'s social card with the name in
  the condensed display face, the bio's first sentence and the four particulars, from `lib/card.ts`
  in vendored Sofia Sans TTFs (`assets/fonts/`, OFL); the text face's local fallback over Arial's
  twins; `/read`'s figcaption at 6 px. P14 to P17 in `e2e/facts-scan.spec.ts`. The project link's
  gap was already fixed in #67 (`decisions.md` 6). Left open: the 404's first visit paints in the
  fallback face, since Next sends no font preload on the prerendered 404; Lens's two code nits on
  #100 (Forge); the card drawn as a sheet (Iris); Detail A's dark-scheme boxes, which need a look on
  a real phone.
- Out of scope then: `/work/…` case studies and a published keel (now the Owner's pick under
  "Now"), and the riders that loosen a live assertion (the legend's "Original", C5.3, the
  scripts-off 404).

## Finished: the redesign

B1 to B5 merged by 2026-10-31 (B4e, #95, last). **Left for the owner, and nothing waits on
them:**
- B3's demo on a GPU and a phone: 30 fps, the loft's feel and the control.
- B4's: the pencil and copper while a run is live.
- B5's: the ghost and the pick.
- The milestone's close: Replay of sprint 37 on a phone at rest, then a live run.

Each one's notes are under its item below.

The site in `PRODUCT.md` and `design/brief.md`, built to the direction the owner approved on sprint
17's canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5) on 2026-10-21, with their four calls:
1. the model is white card;
2. copper means "live now" and nothing else, so links become ink;
3. the revision block's Approved column says what really happened: Owner or Gate;
4. Detail A stays.

The direction, its budgets and the build order are in `.crew/sprint/17/direction-iris.md`. Quill
writes each sprint's contract from them. Current UI/UX and 3D practice, with sources, is in
`design/research/2026-ui-ux-and-3d.md`. Its section B goes sprint by sprint, as input to weigh,
not a spec: the direction decides, and a visible change to it is Iris's call, which the owner may
overrule. The owner sees the milestone at two demos, on the PR's Vercel preview: B1, which
replaces today's page, and B3, the signature moment.

- [x] B1: the sheet in 2D. The labelled bar, the lines plan, the title block, and the revision
  block from the retros, with Off as everyone's default. It replaces today's home page, so its
  contract lists which live checks it keeps, rewrites or retires, and the owner approves the
  retirements in that PR. (Sprint 22, PR #62, merged 2026-10-22 with batches A, B and C approved.)
- [x] B2: the facts and `/read` ("Read as page"), and a not-found page in the site's style.
  - Sprint 23, PR #67, merged 2026-10-22 with batch D (the cards' whole-surface link) approved by
    the owner: Lens ship, Iris ship at 8.5/10, 141 of 141 checks. Its B2.10 is amended for `/read`
    (`.crew/sprint/23/decisions.md`, item 7).
- [x] Next upgrade: 16.4.0 to 16.4.2, for three advisories (two critical RCEs and a DoS). Done by
  the owner outside a sprint (PR #69, merged 2026-10-22), so it added no revision row. The revision
  block's height, which this item said had to be settled first, turned out not to block it: the
  block is capped at five rows and only a goal that wraps to two lines at 1440 adds height
  (`.crew/sprint/24/decisions.md`, items 2 and 3). The rule is a one-line goal, at most 78
  characters, in every retro; Iris's one-line descriptions with an ellipsis (her sprint 22 notes,
  section 8) stay a proposal for the next PR that waits for the owner, since B1.5's check changes.
- [x] B3: the 3D card model and the registered loft, as Quill planned it in
  `.crew/sprint/24/b3-plan.md`. Once the 3D exists, Full is the default (the canvas's
  `Motion-Control.html`), and reduced motion starts at Calm.
  - [x] Sprint 24 (M): Pixel's spike. The stack measured in Turbopack (A, WebGL, against B, WebGPU
    with the WebGL 2 fallback), the hull's triangles and draws, the registered loft prototyped, CPU
    frame time as a floor, and a recommendation (`.crew/sprint/24/contract.md`, S1 to S7). The
    30 fps phone budget is checked on the owner's phone at the demos; the cloud has none.
    (PR #71, merged 2026-10-23: Lens ship after one fix round; Pixel recommends A, WebGL, and the
    report is `.crew/sprint/24/spike/spike.md`. Left open: the owner's stack call, on sprint 25's
    PR.)
  - [x] Sprint 25 (M): the hull lifts off the drawing at 1024 px and up, once a visit, skippable,
    settled under reduced motion, 0 frames at rest, with no control yet. (PR #72, built over three
    runs on 2026-10-23: Lens ship after one fix round, Iris ship at 8.8/10, 152 of 152 checks; the
    contract is `.crew/sprint/25/contract.md` with decisions 7 to 16 in `decisions.md`.) **Its PR waits for the
    owner**, with the loft on its preview: the stack call, A (`WebGLRenderer`, built, 144,516 B gzip
    against the 250 kB budget; it departs from `design/brief.md`'s Technology section) or B
    (`three/webgpu`, 280,606 B in the spike, over the budget on Vercel's wire), and batch E, Iris's
    one-line revision descriptions at 1024 px and up (B1.5's check changed). Riding with sprint 26,
    which touches the same code: Lens's six nits on #72 (a lost WebGL context should return the Off
    sheet rather than leave the drawing hollow; `stop()` during `compileAsync`; a redraw before the
    model scrolls back into view after an off-screen resize or scheme change; B3.7's redraw count
    `toBe(1)`; B3.6's off-screen and hidden windows proven with a scheme switch; the bottom row's
    `min-height` under a classic scrollbar), Lens's nit on #72's fixed head (forced colours switched
    on mid-visit keep the lit canvas and hollow the forced-colours drawing: hide `[data-model]` under
    `(forced-colors: active)` and add it to the hollow and fade queries, or a change listener that
    stops the model as a narrowing does), and the full-page-capture teardown (decision 13).
  - [x] Sprint 26 (M): phones and tablets at 30 fps: DPR ≤ 1.5, ≤ 12k triangles, quality stepping,
    a still frame under 30 fps, scrolling through the canvas, the model on the drawing the page
    shows at every width. (PR #73, built over two runs on 2026-10-23: Lens ship with no fix round, Iris ship at
    8.8/10, 158 of 158 checks; the contract is `.crew/sprint/26/contract.md` with decisions 1 to 9
    in `decisions.md`.) Iris's call: `G_NARROW` 0.25 and `SETTLE_NARROW { dx: 0, dy: 26 }`, the
    settled hull its drawing's own length, and the phone's growth on e² so it arrives with the
    turn (decision 9). Sprint 25's riders are taken. Left open, for the sheet with the owner: the
    "Base" label straddling the shadow's tail on the narrow sheet (Iris's review); and the cold-
    cache fallback face, which scrolls the page 21 px sideways at 320 and wraps the nav at 390 on
    production today (`.rev`'s `td[data-label]::before` labels, likely), the next layout fix.
    Riding with sprint 27, which touches the model: Lens's four nits on #73 (a 768 px crossing
    during the build keeps the old cap, so `cross()` resets it before its early return; the canvas
    keeps the old drawing's size for the two guarded frames and after a lost context, so
    `[data-model]` gets `overflow: clip`; a phone's toolbar show/hide re-solves the loft at rest,
    to check at the demo and, if it shows, refit only on width or box changes; a stray JSDoc above
    `cardGeometry` in `lib/model/stage.ts`).
  - [x] Sprint 27 (M): the Full/Calm/Off control, remembered on the device; B2.3 and the keyboard
    Tab bound rewritten with the same assertions. (PR #74, built in one run on 2026-10-23: Lens ship
    with no fix round, after its first run died and CI's cap cancelled the suite until the owner
    re-ran both, Iris ship at 9.0/10, 166 of 166 checks; the contract is
    `.crew/sprint/27/contract.md` with amendments 1 to 3 and decisions 1 to 13 in `decisions.md`.)
    The hints set the default (`off` under Save-Data, `calm` under reduced motion, else `full`) and
    a press wins (decision 3); a press of Full replays the loft (decision 4). Iris's call: below 768
    px the control sits at the drawing's foot, not the canvas's bottom strip, which the sheet no
    longer has (decision 8; her paragraph for the owner is on the PR). Riders taken: Lens's three
    code nits on #73, the two comment nits on #67, and the cold-cache fallback face at its cause
    (next/font's one-source fallback; decision 13). **The B3 demo is the owner's**, on #74's preview
    and then production: 30 fps, the DPR ladder and the still frame on a GPU, the e² loft's feel,
    the dark hull under the warm lamp, the control, the toolbar show/hide at rest (Lens's nit on
    #73), the control's place against `hero-390.webp`, and the "Base" label under the shadow's tail
    on the narrow sheet. Riding with the next sprint that touches the loader
    (`components/model.tsx`): Lens's nit on #74 (with the WebGL 2 probe refused, pressing the
    already-pressed Off stores `off`, so a device that gains WebGL later stays Off unasked;
    `onClick={() => refused || press(value)}`, about 3 B; taken in B5c). Left open: the text face's
    fallback has the same one `local(Arial)` source (Forge, with the next sprint that touches the
    fonts); in forced colours with the model refused the control shows Full or Calm pressed while
    nothing can play (Iris); B2.10 has 10 B of headroom on `/`, so B4's client code reopens the
    script budget with the owner.
- [x] B4: `/crew`, the crew at work, from the Studio's data. **It waits for the owner's feed:**
  the Studio serves no read a third party can use (its own roadmap lists the API as unbuilt), so
  nothing of B4 ships before it (`.crew/sprint/28/b4-plan.md`, "Before the feed"; decision 7).
  - [x] Sprint 28 (M, notes only): Quill's plan, B4 as five M sprints
    (`.crew/sprint/28/b4-plan.md`), and the feed's contract for the owner to build in the Studio,
    one endpoint `GET /api/crew` with every field traced to a Studio derivation
    (`.crew/sprint/28/feed-contract.md`). (PR #75, built in one run on 2026-10-24.) **Its PR waits
    for the owner:** approving its head means "build the feed to this contract", with the
    contract's seven calls (the URL, `CREW_FEED_URL` on Vercel, no CORS, the now line's quotes, the
    Rules copy, the proxy rule, the Studio link). Once approved, B4.1 may start against the
    contract's fixtures before the feed is deployed, and merges only once the feed answers on its
    preview.
  - [x] B4a (M, the plan's B4.1): `/crew` from the feed, server-rendered, the four states (live,
    open, resting, feed down), the Crew link on every page, Read as page at the drawing's foot below
    768 on `/`, `/crew` and `/log`. (Sprint 31, PR #78, built over two runs on 2026-10-24: Quill's
    contract B4.1 to B4.14, Probe's checks red first against fixtures, Forge's build, main's #77
    merged in with both sides kept; Iris changes at 7.0, both musts taken in one round; Lens ship
    with no Important, again on 405355f after #83 merged in and a failed read kept the last good
    answer; 209 of 210 checks, then green on rerun; `decisions.md` 1 to 13.) B4's sprints now take letters
    (B4a to B4e). **Its PR waits for the owner:** `CREW_FEED_URL` on Vercel, the feed deployed and
    answering `live` or `open` on the preview, and the six calls in the PR body. Lens's four nits
    on #78 were found already done on main by sprint 35 (`.crew/sprint/35/decisions.md`, 5).
  - [x] B4b (M): the live layer on `/`: the pencil plank and row, the copper tip while live, the
    rest line with the merge time, 0 B of new script. (Sprint 34, PR #87, built in one run on
    2026-10-31: Quill's contract B4.15 to B4.24 with amendment 1, Probe's checks red first, Forge's
    2D and Pixel's hull in parallel on the drawing's `data-pencil`; Iris ship at 8.7/10, Lens ship
    on 415b4c0 after one fix round, CI's 25-minute cap; `decisions.md` 1 to 9.)
    - Iris's calls: no row traded (the rest line is the revision block's first line, the links stay
      at 866.3 at 1440 × 900); the rest line is `/crew`'s resting line, naming a merge, not a seat.
    - The pencil seat keeps a merged sprint's own seat, else the next (Quill); production draws 34
      on 4.0. The tip costs 2 draws and 18 triangles while live.
    - **The B4 demo is the owner's,** on #87's preview and production: the pencil and copper while
      a run is live, the rest line after, on a GPU and a phone.
    - Lens's empty-goal nit on #87 and his three test nits on 415b4c0 rode with sprint 35 (B4.32
      checks the blank goal, fixed once in `readCrew()`). Riding with Pb: Iris's chip
      covering the copper dot on a short seat (3.0) at 1024 and below (the tip after the lettering;
      the hull's label moved stern-ward). Left open: the legend's "Original" while nothing original
      is left (B1.2's words), and `/` and `/crew`'s dev-only instant-navigation message
      (`export const instant = false`, Forge).
  - [x] B4c (M): `/crew` live in the browser through the portfolio's own `/api/crew`, with
    "Pause updates" (WCAG 2.2.2) and its own script budget. (Sprint 35, PR #90, built in one run on
    2026-10-31: Quill's contract B4.25 to B4.32 with Iris's calls, Probe's checks red first and
    proven on three mutants, Forge's build; Iris ship at 8.1/10, Lens ship on 6a7d9fa after a
    description fix; `/crew` loads 13,659 B over the 404's scripts against a 16,384 B budget, `/`
    unchanged; `decisions.md` 1 to 9.)
    - Lens's nit on #90 (abort a poll that never settles) rode with sprint 36 as B4.42.
    - Iris's follow-ups (`decisions.md` 8): the first visit after a quiet spell gets #88's stale
      prerender, which the first poll corrects with a layout shift (0.12 at 1440): give `/crew` a
      long cache `expire` (still open after sprint 37; rides with Pb). **Open for the owner:** the Studio's role lines run to about 140
      characters, so the table reflows on about half the polls; a short line from the Studio fixes
      it, where clamping here would break B4a's "the line whole".
    - Not verified from the cloud: the preview's CDN caching of `/api/crew` (the proxy refuses
      preview hosts) and a real screen reader.
  - [x] B4d (M): the hull on `/crew`, one mark per moment, under Full/Calm/Off; the control
    joins `/crew`'s bar. (Sprint 36, PR #91, built in one run on 2026-10-31: Quill's contract
    B4.33 to B4.42 with Iris's amendments, Probe's checks red first, Pixel's 3D and Forge's detail
    drawing in parallel; Lens ship on f9fbbc6, then changes on the harness cut, fixed in dc25324;
    Iris ship at 8.3/10, 240 of 240 checks locally; `decisions.md` 1 to 11.) **Its PR waits for
    the owner:** CI's `check` hit its 25-minute cap twice, so the PR raises it to 35
    (`.github/workflows/ci.yml`, an Owner's pick that waits).
    - `/crew`'s drawing is a server-drawn detail (480 hull units across from 768, 320 below),
      close on the pencil plank; one graphite tick per moment hangs from its lower edge, at most 10.
      The hull turns toward the focus plank's end (yaw ±35°, pitch 6°); at most 7 draws, 25,329
      triangles at 1440 and 7,935 at 390; `/crew` loads 17,088 B over the 404's against a new
      18,432 B budget, `/` unchanged.
    - Taken in sprint 37 (#95), as sprint 38 found in the code: Lens's nit on #91, the poller's
      "outside React's tree" comment is wrong (it edits nodes React hydrated, safe only while nothing
      re-renders `CrewPlan`): correct it and Forge's memory line, or render the ticks as one string;
      and Lens's nit on 2feab08, the 3D ticks' weight reads the Log's `MARK_PX`, not
      `MARKS.width` (`lib/model/stage.ts:450`), so the two can drift apart.
    - Iris's follow-ups (`review-iris.md`): a key for the ticks (Quill's wording); seat 5.0's 2.8 px
      comb at sprint 42; the flat 2D bow beside the turned one, one CSS rule if the owner finds it
      busy. Iris's chip-over-dot rider (B4b) is settled on `/crew` and stays open on `/`.
    - **For the owner on the preview:** the stern turns toward the visitor on seats aft of midship
      (sprint 37's 2.1 is first), and `/crew`'s drawing is a detail, not the whole sheet. Not
      verified from the cloud: the move's feel on a GPU and a phone.
    - CI: the suite outgrew the `check` job's 25 minutes (decisions 10 and 11). Left open: split
      the 3D and feed specs into their own job, or a deeper pass on the existing 3D suites.
  - [x] B4e (M): Replay of the last merged sprint on `/crew`, from the feed's `last.replay`
    (nycruslan/theseus-studio#49). (Sprint 37, PR #95, built in one run on 2026-10-31: Quill's
    contract B4.43 to B4.51 with Iris's calls and amendment 1, Probe's checks red first, Forge's
    build with two early looks from Iris; Lens ship on 6470d74 after naming three skip guards, Iris
    ship at 8.4/10, 249 of 249 locally; `decisions.md` 1 to 12.)
    - Iris's calls: a fixed 1.5 s a moment with the real UTC times (no "4×"), the same in every
      mode; the panel's head keeps telling the present; a boxed REPLAY stamp; the plank goes to
      pencil, ticks, and inks at the merge. The entry sits under `/crew`'s status and at the end of
      `/`'s rest line (server HTML, `/` unchanged); "Pause replay" in Activity's head, Space.
    - `/crew`'s script limits rise to 20,480 B beyond the 404's and 18,432 B beyond `/log`'s
      (measured 18,508 B and 16,469 B), accepted by Lens; B4.26 reads the panel without the key.
    - Riding with Pb (Forge): Lens's four nits (Shift/Meta+Space, an unused `crew-block` class, a
      `#replay` arrival in a hidden tab, Strict Mode's re-run).
    - **The milestone's close is the owner's:** on production at rest, Replay sprint 37 on a phone
      and a GPU, then a live run. Iris asks the owner to judge the plank inking above the fold on a
      phone and the 70 s length ("Skip to the merge" if long).
- [x] B5: `/log` and the ghost hull. B5's demo is the owner's, on a preview that deploys (Vercel
  rate-limited #82 and #83 on 2026-10-25).
  - [x] Sprint 29 (M, notes only): Quill's plan, B5 as three M sprints
    (`.crew/sprint/29/b5-plan.md`), and B5a's contract ready for Probe and Forge
    (`.crew/sprint/29/b5-first-contract.md`). Taken beside B4 while #75 waits for the owner, since
    B5 reads the retros on main, not the Studio, and no B5 sprint waits for B4
    (`.crew/sprint/29/decisions.md`, 2). (PR #76, built in one run on 2026-10-24.) Answered here:
    the "group the build log past about 30 entries" rider (one table, 89 px a row at 390, no
    paging; day groups with B5b) and Lens's C9.5 selector nit (rides B5a).
  - [x] B5a (M): `/log` in 2D: the ghost hull in vellum (the 22 originals, each numbered by the
    first sprint that took it out), "Every revision" as a table of every merged sprint, a record
    per revision at `/log/<n>`, `/sprints` answering 308 to `/log`. (Sprint 30, PR #77, built in
    one run on 2026-10-24: Iris's three calls first (`.crew/sprint/30/notes-iris.md`: the profile
    alone, `--vellum` light `#d7e2e1` and dark `#3f4d52`, the record beside the table from 1024),
    Probe's B5.1 to B5.11 red first, Forge's build with one early-look round from Iris; Iris
    ship at 8.2/10, 157 of 157 checks; decisions 1 to 6 in `decisions.md`.) **Its PR waits for
    the owner:** batch F retires 23 tests and two assertions about `/sprints`' old column
    (`gate` reports `e2e/sprints.spec.ts` deleted: git doesn't see the rewrite as a rename).
    Sprint 38 found these done: the comments, the `h2`, the 66ch cap, and Forge's memory line is
    gone. Iris's 404 line is hers to check, and the scripts-off 404 is left open below. The list
    as written: Lens's two nits on #77 (three comments in
    `next.config.ts`, `lib/sprint-log.ts` and `app/layout.tsx` still say nothing reads the sprint
    folders at request time, while an unknown record address now runs `readSprintLog()` on the
    server, so the retros must stay traced; two stale memory lines, Iris's on the 404's face and
    Forge's citing `components/sprint-entry.tsx`); Iris's two cheap changes (the record's
    `h2` `text-wrap: pretty`; with B5b's Merged column, cap Description near 66ch or keep the
    table in the left column at 1440), and the unknown-record 404's scripts-off blank (Next's
    error shell; status and `noindex` are right). Left open: a Design row needs a public retro
    field (owner path, proposed in sprint 29's retro).
  - [x] B5b (M): the merge record and `/log`'s dates. (Sprint 32, PR #82, built in one run on
    2026-10-25: Lens ship on 98cef13 after one fix round, Iris ship at 8.2/10, 162 of 162 checks;
    the contract is `.crew/sprint/32/contract.md` with decisions 1 to 11.) The Date column (not
    the frame's "Merged", so C4.4 stands; decision 2), the day groups as runs of rows in sprint
    order (decision 11), each record's date, and the lines figure in the Log's header ("44 of
    6,170 lines … 0.7%"). The writer is `.crew/sprint/32/merge-record.mjs`, run by Atlas at each
    run's start (`.crew/STATE.md`), since `.crew/*.mjs` is the owner's (decision 3); no `HEAD`
    read at build (decision 4). This PR touched no owner path. Proposed for the owner in its
    retro: a workflow that writes the record after each merge (until then the newest revision
    sits under "Undated" until the next sprint's PR merges), moving the writer into `.crew/` with
    a test and a skill step, and still the closed sprints' rows and a public `design` retro
    field. Riding with the next sprint that touches `/log` (sprint 38 found these taken in B5c as
    B5.26 a and b, except the commit-hash link, which waits; see B5c): Lens's nit on #82 (B5.16
    checks records only up to sprint 30; assert every `merge.json` on disk parses), and Iris's two
    (the lines figure's rule stops at the text's width from 640 to 1023; link the commit hash). Left
    open: the unknown record's scripts-off blank 404.
  - [x] B5c (M): the ghost hull in 3D on `/log` and every record, under Full/Calm/Off, the control
    in `/log`'s bar, and a plank opening its record. (Sprint 33, PR #83, built in one run on
    2026-10-25: Lens ship on 9b8743a after one fix round, Iris ship at 8.7/10, 184 of 184 checks;
    the contract is `.crew/sprint/33/contract.md` with amendment 1 and decisions 1 to 11.)
    - The 3D chunk reads the 2D drawing's seats and numbers, so the loader grew only by Lens's #74
      nit (2,039 B; B2.10 has 9 B left) and `/`'s hull and loft are unchanged.
    - The hull: both sides in translucent vellum, lit mix 0.4, pitch 12°, and "8" and "20" on
      leaders from 768 (decisions 6 and 7). It costs 5 draws and 25,000 triangles from 768.
    - B5c wrote the model's mount on a second route, so B4d reuses it on `/crew`.
    - The Log holds its first paint until its drawing is parsed (decision 11).
    - Riders taken: Lens's nit on #74, Lens's nit on #82 (B5.26 a), and Iris's rule width (B5.26 b).
    - Lens's two nits on 9b8743a were taken in sprint 34 (e770a54), as sprint 36 found.
    - Left open: the shift is held in Chromium only, so DOM order matching the visual order below
      1024 is Iris's call; the commit-hash link (it loosens C5.3, for a PR that waits for the
      owner); the unknown record's scripts-off blank 404.
    - **B5's demo is the owner's:** the ghost on a GPU and a phone, the move's feel, the pick, and
      Iris's departures from the frames (two translucent sides, no "or a plank in the hull", no
      numbers below 768, "8" led out).

Riding along with the sprints that touch the same code: the facts-and-fonts list that waited here
now rides with Pc (see "Now" above), except Detail A's dark-scheme boxes, which still wait for a
look on a real phone.

## Done

- [x] Design tokens: a color palette and a fluid typography scale in `app/globals.css`.
- [x] Dark mode that follows the system preference, with accessible contrast in both themes. (Sprint 2, PR #12.)
- [x] Project cards. (Sprint 3, PR #16: `components/project-card.tsx`, `e2e/cards.spec.ts`.)
- [x] Accessibility pass: landmarks, focus styles, skip link, zero axe violations. (Sprint 4, PR #17: `e2e/keyboard.spec.ts`, `e2e/invariants.spec.ts`.)
- [x] Section reveal motion on scroll, off under reduced motion. (Sprint 5, PR #22: `e2e/reveal.spec.ts`.)
- [x] Open Graph image from the profile. (`app/opengraph-image.tsx`, `e2e/smoke.spec.ts`.)
- [x] Education and stack. (Sprint 6, PR #27: `e2e/profile-sections.spec.ts`.)
- [x] The 3D hero: a static SVG half-model (sprint 8, PR #31) and its WebGL upgrade (sprint 10, PR #35), on the contracts of sprints 7 and 9. (`e2e/hero.spec.ts`, `e2e/hero-3d.spec.ts`.)
- [x] Stack separators. (Sprint 11, PR #36.)
- [x] Watch the team build: `/sprints` (sprint 13, PR #39) and the home page's build-log line (sprint 14, PR #43), on sprint 12's contract. (`e2e/sprints.spec.ts`, `e2e/sprints-entry.spec.ts`.)
- [x] Share card for `/sprints`, and the placeholder guard re-armed. (Sprint 18, PR #52: `app/sprints/opengraph-image.tsx`, `e2e/sprints.spec.ts` C2.3, `e2e/content.spec.ts`.)
  - The layout's comment was fixed as a rider in sprint 19.
- [x] The build log's goals as copy: a trailing size tag such as "(L)" no longer prints. (Sprint 19, PR #53: `lib/sprint-log.ts`, `e2e/sprints.spec.ts` C4b and C12.7.)
  - The C4b block moved above the C5 banner as a rider in sprint 20.
- [x] The drawn dots show in forced colors, and the Stack list clips only sideways; the build-log
  specs' raw U+00A0 as escapes. (Sprint 20, PR #54: `app/page.tsx`, `components/sprint-entry.tsx`,
  `e2e/profile-sections.spec.ts` C8.)
- [x] The forced-colors checks cover what sprint 20 shipped: C8 asserts the Stack list clips
  sideways, and C9.5 checks the build log's bullets in forced colors. (Sprint 21, PR #55:
  `e2e/profile-sections.spec.ts` C8, `e2e/sprints.spec.ts` C9.5.)
