# B4 as a sequence of sprints (Quill)

Quill, 2026-10-24, during sprint 28. B4 is "`/crew`, the crew at work, from the Studio's data"
(`ROADMAP.md`), built to `.crew/sprint/17/direction-iris.md` and the owner-approved frames
`crew-1440.webp`, `crew-390.webp`, `main.webp`, `rest-1440.webp` and `rest-390.webp` in
`.crew/sprint/17/design/`. It can't start until the Studio serves a feed, which
`.crew/sprint/28/feed-contract.md` specifies for the owner to build. Five build sprints follow
the feed. Each is one PR that leaves the site whole.

## What the visitor gets

**The hiring executive** lands on `/` and has a few seconds. B4 adds one fact to what they already
read there: this site is being rebuilt right now, or was rebuilt recently, by a crew of named
agents, and the owner signs each plank off. Belief 2 in `PRODUCT.md` ("he can run an AI org") rests
on that fact, and today nothing on the site shows it. Production has no pencil plank and no copper
(both deferred to B4 since sprint 22, decision 3.1). It has no rest line either: the brief's "Last
plank seated" line was dropped from B1's contract, as production's HTML confirms. And nothing links
to the Studio. The revision table names Forge, Lens and Probe, and nothing on the site says who they
are.

**`/crew` is for both visitors, at two depths:**
- **For the executive,** `/crew` answers the Studio's three-second glance test (research, section
  C2) in one panel:
  - is it live;
  - who is working, and on what;
  - who approves (the frame's "Approval: Ruslan Shulga … Not given yet");
  - the rules ("Visitors watch; nobody can start or steer the crew").

  That last row is governance, the thing a board asks about AI at scale.
- **For the engineer,** it has the activity list with UTC times, the pull request, and the run on
  the Studio for the full story.

**`/` shows the crew's state on the drawing; only `/crew` tells it.** `/` gets:
- the pencil plank and its revision row, linking to `/crew`;
- the copper tip, only while the crew is live;
- the rest line when nothing is in progress;
- Replay, as a link into `/crew`.

`/crew` holds everything with words or times in it: the crew table, the now line, the moments, the
evidence, and the live updates. `/` stays a static sheet that loads no new client code.

## The four states, and the honest rest

The crew is idle most of the day, so the rest state is the one most visitors see. It has to carry
weight of its own, not apologise. Each state maps to one feed answer (feed contract, "current" and
"last"):

| State | Feed says | `/` shows | `/crew` shows |
|---|---|---|---|
| **Live** | `current.live` true | pencil plank with copper tip; pencil row first in Revisions, "drawing now" in copper | the live run: crew table, now line in copper, moments, PR |
| **Open, not live** (a PR waits for the owner, as this one will) | `current` set, `live` false | pencil plank, no copper; pencil row, Approved "Waiting for owner" | that run, its label ("Waiting on the owner"), nobody in copper |
| **Resting** | `current` null | rest line: "Crew resting. Last plank seated: sprint N, 24 Oct, 14:10 UTC." | the last merged sprint told the same way, labelled with its merge time |
| **Feed down or not built** | no answer, a bad answer, or `asOf` older than 10 min | today's sheet exactly (no pencil, copper or rest claim) | the record from the retros, with "The live feed isn't answering" and no state words |

Rules that hold in all four:
- The feed never seats a plank: planks come from the retros on main, as now. The feed only decides
  pencil, copper and the times.
- Copper means the Studio's `live`: not over, and heard from within 10 minutes. That is the owner's
  call 2 ("live now"), at the Studio's own definition.
- Nothing pulses. Ambient motion would need a pause control and would break "0 frames at rest".

## Settled from the visitor's side

**The Crew link, and the phone bar's fifth link.**
- The bar reads Work, Crew, Log, Contact, as every approved frame draws it. From 1024 px, Read as
  page stays the right-most link before the control.
- Below 768 px five links don't fit (Iris, sprint 23). I measured production: at 390 the four links
  span 120 to 380 px beside the wordmark, and at 320 they span 87 to 310 px at the small step.
- `rest-390.webp` already solves it: the phone bar carries Work, Crew, Log, Contact, and Read as
  page moves to the drawing's foot beside Full/Calm/Off. The motion control has sat there since
  sprint 27.
- At 768 the links start at 283 px, so a fifth fits from 768 up. B4.1's contract measures it.

**The script budget.**
- `/` has 10 B of B2.10's 2,048 B left (sprint 27, decision 9), and B4 spends none of it:
  - the live layer on `/` is server-rendered;
  - the 3D chunk takes the pencil state through the strings `Model` already passes (`seated`) or
    the drawing's data attributes, read inside the chunk, which has its own 250 kB budget.
- If a build finds it can't, the budget reopens with the owner before that PR merges. Lens's ~3 B
  nit on #74 rides whichever sprint touches `components/model.tsx`.
- `/crew` is a new route:
  - B4.1 ships it with no client code, inside the same 2,048 B of `/sprints'` that `/read` meets;
  - B4.3 adds the browser poller and sets `/crew`'s own budget from Forge's measurement, named in
    that contract.

**Live in the browser, and WCAG 2.2.2.**
- `/` never updates in the browser. It is served from a cache of at most about 5 minutes (the feed
  contract's caching section), which is honest because copper's own window is 10 minutes.
- `/crew` updates in B4.3, through a route of the portfolio's own (`/api/crew`). The browser never
  calls the Studio, so the Studio needs no CORS and its URL stays server-side. Vercel's CDN caches
  that route for 30 s, so the Studio sees about one read per 30 s however many people watch.
- The poll runs every 30 s while the run is live and the tab is visible, and every 60 s at rest
  (the Studio's own `REST_MS`).
- Updates run past 5 s, so WCAG 2.2.2 asks for a way to pause them. `/crew` gets a "Pause updates"
  toggle beside its Live label (`aria-pressed`).
- Only the now line is `aria-live="polite"`, and it announces state changes (who is working), not
  each moment.

**The Date column stays out of B4.**
- The feed gives one date, the last merge's, for the rest line.
- The revision block's Date column needs a date for every row that is right at every build and
  survives the feed being down (Iris, sprint 22 notes section 8). That means a recorded `mergedAt`,
  which is B5's and a crew-script change (an owner path).

**The personas stay in the portfolio.**
- The crew is defined in this repository (`.claude/agents/`), and the frames word the roles their
  own way ("Roadmap", "Code", "Motion", "Tests"), not as the Studio's `short` does.
- The feed sends role keys only.

## The sprints

### B4.1 (M): `/crew`, from the feed, and the Crew link

- **Outcome.** A visitor who follows Crew from the bar gets `/crew`, as `crew-1440.webp` and
  `crew-390.webp` draw it:
  - the drawing at the left (2D in this sprint), the panel on the right, and a Close link back
    to `/`;
  - in the panel: the sprint chip and goal, the crew table (seven rows: name, role word, state, one
    line), the now line, the moments with UTC times, and Evidence, Approval and Rules.

  It shows the live, open, resting and feed-down states from the table above. The page is
  server-rendered from the cached feed and has no client code. The bar gains Crew, and below 768 px
  Read as page moves to the drawing's foot on `/`.
- **Size: M.** Out of scope:
  - live updates in the browser (B4.3);
  - the 3D on `/crew` and the motion control in its bar (B4.4). A control with no model to
    control changes nothing, and sprint 22's rule forbids that.
  - Replay (B4.5);
  - `/crew`'s share card (a follow-up).
- **Who:** Forge builds it, Probe writes the checks first, and Iris reviews.
- **Checks it adds:**
  - **The three feed states on `/crew`,** from fixtures of the contract's shape: live, open and
    resting. The checks use a fixture server that Probe's spec starts, with its own `next start`
    pointed at it (`CREW_FEED_URL`). That stays inside `e2e/`. The alternative is a second
    `webServer` in the Playwright config, which is an owner path.
  - **The feed-down state** on the default test server, which has no feed URL.
  - **The four state words,** and copper only on Working and the live now line.
  - **Times in UTC.**
  - **The fixture's text shown escaped** (a moment with markup in it renders as text).
  - **Unknown kinds and roles ignored,** and a non-GitHub PR URL not linked.
  - **The bar, everywhere it changes:**
    - Crew is `aria-current="page"` on `/crew`;
    - the Close link and Back both return to `/`;
    - at 768, the five links and the control fit on one line.
  - **The route sweeps on `/crew`:** axe, the colour and type tokens, the 24 px targets (44 px in
    the phone bar), overflow 0 at 320, one `main` with named regions, a paint without JavaScript,
    and one focus ring in forced colours.
  - **LCP:** text within 2,500 ms at 4× CPU.
  - **Script:** within 2,048 B of `/sprints'`.
- **Live checks it must keep or rewrite:**
  - **Everything on `/` stays unedited.** The default test server reads no feed, so `/` renders
    today's sheet. That covers B1.1, B1.4 to B1.6, B1.8 to B1.10 and the B3 suites.
  - **B2.3's two tests** (`e2e/sheet.spec.ts`) are rewritten with the same assertions over five
    links: each a target inside the viewport, Read as page right-most at 1440, the group's place,
    and each link landing.
    - Crew lands on `/crew`'s h1.
    - Below 768, Read as page's place moves from the bar to the drawing's foot, as
      `rest-390.webp` draws it. The PR names that moved assertion for the owner's approval, and
      it waits for the owner anyway.
  - **Keyboard's "Contact's first link is the 15th Tab stop"** becomes the 16th, with Crew after
    Work. `tabUntil`'s bound rises from 15 to 16, which is a harness change.
  - **The `ROUTES` sweeps** (`e2e/helpers.ts`, `invariants.spec.ts`, keyboard's B2.9) gain
    `/crew` with the same assertions, and their titles name it.
  - **B2.10's list** gains `/crew`.
  - **B2.11's sitemap check** uses `toContain`, so adding `/crew` to the sitemap breaks nothing.
  - Nothing retires.
- **What the owner sees, and decides, on the preview.** This PR waits for the owner whatever
  happens: it needs `CREW_FEED_URL` set on Vercel for Preview and Production. So the owner calls
  that can change the build go here:
  - the moved Read as page;
  - the now line's quotes and the Rules copy (feed contract, decisions 4 and 5);
  - the link to the Studio's run page.

  The preview reads the real feed while this sprint's own run is live, so the owner watches the
  crew build `/crew` on `/crew`.

### B4.2 (M): the live layer on `/`

- **Outcome.** On `/` the crew's state is on the drawing:
  - while a sprint is in progress, its plank is in pencil (hatch fill, graphite dashed edge, its
    number) on the 2D drawing and on the 3D hull, and its row leads the revision block, linking to
    `/crew`;
  - while it is live, and only then, the plank has a copper tip and the row says "drawing now";
  - at rest, the rest line names the last plank seated and its merge time;
  - the legend gains the pencil and copper swatches only while they are on the drawing.

  With the feed down, `/` is today's sheet.
- **Size: M.**
- **Who:** Forge (the data, the 2D, the revision block, the rest line) and Pixel (the pencil hatch
  and copper tip on the hull). The hatch slot is already in `lib/model/stage.ts`: alpha below 1
  flags it.
- **Opens with a decision (Iris): the fold at 1440 × 900.**
  - Measured on production today: the title block's contact links end at 866 px, 34 px above the
    fold, and each revision row is 32 px tall.
  - The pencil row replaces a row, so it costs nothing. The rest line does cost height.
    `rest-1440.webp` trades two rows for the rest line and Replay; one row would fit.
  - Either way, B1.1 must hold, and B1.5's "five rows" is rewritten for the rest state. The
    alternative is the rest line in the footer row, which leaves B1.5 alone.
- **Checks it adds** (from the fixtures, on a server Probe's spec starts, which polls until the
  shell has regenerated):
  - each state's plank, row, legend and rest line;
  - copper on `/` only in the live fixture, on the plank's tip and "drawing now";
  - the pencil plank is the next seat in the shipwright's order (`ORDER[k mod 22]`, with k the
    merged count) and carries the live sprint's number, in the 2D drawing and the 3D hull alike;
  - B1.1 in the rest fixture at 1440 × 900;
  - the 3D's draws (at most 8) and triangles unchanged, and 0 frames at rest.
- **Live checks it must keep:**
  - All of `/`'s, unedited, on the default feed-down server: B1.6 "no copper" holds there.
  - B2.10 on `/` stays at 2,048 B with WebGL refused. If the loader grows, the PR stops for the
    owner.
  - If Iris picks the row trade, B1.5 is rewritten only for the rest fixture: the default run's
    five rows stand.
- **What the owner sees: the B4 demo,** on the preview. It is the first change to the visitor's
  first screen since B3. The owner sees the pencil plank and copper during the PR's own live run,
  and the rest line after the session settles.

### B4.3 (M): `/crew` live in the browser

- **Outcome.** A visitor who stays on `/crew` sees it move:
  - the crew table, the now line and the moments update as the feed does, within about a minute;
  - a run that ends while they watch turns into the rest state;
  - "Pause updates" stops it;
  - a screen reader hears who started or stopped working, not every moment.
- **Size: M.**
- **Who:** Forge. Iris reviews the toggle and the arrival of new rows (no motion under reduced
  motion or Calm, and none on frequent updates).
- **Checks it adds** (with `page.route` serving fixtures on the portfolio's own `/api/crew`, so no
  second server is needed):
  - **Polling:**
    - a fixture switch from live to rest updates the panel within one poll;
    - no poll runs while hidden, nor after Pause.
  - **Announcements:**
    - one `aria-live` region;
    - it announces only on a role-state change.
  - **The route:** `/api/crew` answers with the cache headers and passes no field the contract
    doesn't name.
  - **The budget:** `/crew`'s script bytes stay within the budget this contract sets from Forge's
    measurement.
- **Live checks it must keep:** B4.1's, unedited. The server-rendered first paint stays and
  hydrates without a flash.
- **What the owner sees:** a live run updating on the preview.

### B4.4 (M): the hull on `/crew`, and one mark per moment

- **Outcome.** On `/crew` the card model sits on the drawing, as `crew-1440.webp` draws it:
  - the camera is close on the working plank, or on the newest seat at rest;
  - each moment of the run is one mark on the pencil plank, a pencil stroke from the copper tip
    (the direction's "each event type gets one mark");
  - marks added by B4.3's polling draw on demand.

  The rules are those of Full, Calm and Off:
  - Full: one camera move when the page opens;
  - Calm: opens settled;
  - Off: the 2D drawing with the marks as strokes, and no WebGL.

  The motion control joins `/crew`'s bar.
- **Size: M.**
- **Who:** Pixel builds it. Forge wires the control into `/crew`'s bar. Iris reviews.
- **Checks it adds:**
  - **Marks:** the count equals the moments shown, in both 2D and 3D.
  - **At rest:** 0 frames at rest and after a mark.
  - **The Off and hidden paths:** Off and hidden never request the chunk; the shared Off paths
    hold on `/crew`.
  - **Cost:** draws at most 8, triangles at most 30k on desktop and 12k on phones, and the chunk
    within 250 kB gzip, as B3.6 measures them on `/`.
- **Live checks it must keep:**
  - the B3 suites on `/`, unedited;
  - B4.1's and B4.3's on `/crew`;
  - B2.3, rewritten again with the same assertions for the control in `/crew`'s bar.
- **What the owner sees:** the hull on `/crew` on their phone and on a GPU, which the cloud can't
  measure.

### B4.5 (M): Replay

- **Outcome.** At rest, "Replay sprint N" (the rest line on `/` and the rest panel on `/crew`)
  plays the last merged sprint on `/crew`:
  - its moments arrive in order, each with its mark and its original UTC time;
  - it is labelled REPLAY throughout and is never mistaken for live;
  - it has Play/Pause (Space), and stops at the end on the merge.
  - reduced motion and Calm step through it without motion, and Off fills the list.
- **Size: M.**
- **Opens with a decision (Iris): the pace.** The frames say "4×". A sprint runs for hours, so 4×
  is about 45 minutes for a 3-hour sprint. I propose a fixed pace per moment (about 1.5 s, so a
  sprint of 40 moments takes about a minute), with the original times shown. The label would then
  be "Replay sprint N", not "4×".
- **Who:** Forge (the transport and the list) and Pixel (the marks in replay). It needs the feed's
  later field `last.replay` (the contract marks it "later").
- **Checks it adds:**
  - from a fixture, the order of moments and their times, and the REPLAY label;
  - Pause, and Space;
  - the end state;
  - reduced motion;
  - nothing auto-starts.
- **Live checks it must keep:** all of B4.1 to B4.4's.
- **What the owner sees: the milestone's close.** On production, the crew at rest, a replay of the
  last sprint, and then a live run.

## Before the feed: nothing ships

Atlas's provisional call holds. I looked for something of B4 that gives a visitor more than it
costs, and found nothing:

- **`/crew` from the retros alone** can't know whether the crew is working. It would have to say
  "resting" while a sprint runs (one is running now). Or, to stay honest, it could state only the
  record, which is what the Log already is. Either way it is a stand-in that B4.1 would rebuild
  (sprint 22's rule).
- **The Crew link with the phone re-lay** would move Read as page for a destination that doesn't
  exist.
- **A rest line on `/` from the retros** can't say "resting" or give a time (retros hold no
  dates). It would repeat the revision table's top row.
- **A link to the Studio** would show the crew today, but in another app's look. Belief 2 needs
  "one experience" (`PRODUCT.md`). As the Evidence row inside `/crew` it serves both visitors; as a
  substitute for `/crew` it is the opposite of the brief.

What can move early: **B4.1 can start the day the owner approves `feed-contract.md`.** That
approval freezes the shape. B4.1 builds against the contract's fixtures, and its PR merges only once
the real feed answers on its preview. The plan's PR waits for the owner, and the sprint skill's rule
keeps the crew from taking a next sprint until then. After that approval the crew needn't wait for
the Studio's deploy to start, only to merge. That's Atlas's call to make with the owner.

## Riders B4 carries

- The roadmap's "B4's contract re-lays the phone bar" goes to B4.1.
- Lens's nit on #74 (pressing the already-pressed Off while refused stores `off`, about 3 B) rides
  the first B4 sprint that touches `components/model.tsx`: B4.4 for certain, or B4.2 if its state
  plumbing does.
- Iris's open item, the forced-colours control showing Full or Calm pressed while nothing can play,
  isn't B4's. It stays with the control.
- The facts and fonts riders don't ride: B4 touches neither.

## Not in B4

- **The revision block's Date column:** B5, with a recorded `mergedAt` (see above).
- **DOM labels on the 3D model** (the "15" and "17" of `loft.webp`, deferred from B3): a
  follow-up after B4.4. They reuse its plank projection, and the 2D drawing already numbers the
  planks.
- **Presence** ("how many are watching") and **the shared-clock light** (research): not asked for
  by the frames, and the light is ambient motion.
- **"Next watch Tue 14:00 UTC"** in the rest line: nothing records a schedule the feed could serve.
- **Setbacks, guards, meetings and objections** as moments: B4.1 leaves them out (feed contract,
  moments).

## Decisions, and where they are taken

- **The owner, on this PR:** build the feed to `feed-contract.md`, and its decisions 1 to 7 (URL,
  env var, CORS, the proxy rule, quotes, the Rules copy, the Studio link). Approving this PR's head
  is their "build this".
- **The owner, on B4.1's PR:** the moved Read as page on phones, with the real feed on the preview.
- **Iris:** in B4.1, Read as page's place on `/crew` below 768 (`/crew` has no control until
  B4.4) and the wording of moment kinds for a non-engineer ("Roll call: GO · 5/5" means nothing to
  a board member); the fold trade in B4.2; the toggle in B4.3; the pace in B4.5.
- **Atlas:** whether B4.1 starts on the contract's approval or on the feed's deploy.
