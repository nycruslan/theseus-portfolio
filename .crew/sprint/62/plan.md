# Try to sink it (Quill, sprint 62)

## The outcome

On a page of its own, a visitor puts Ruslan's real first page in any window they choose and tries
to sink his contact links below the window's foot, drawn as the hull's waterline. The page answers
with the links' freeboard, measured, and with the crew's record: which checks hold that window,
which sprint and which agents fitted it, and the one gap the crew accepted on purpose. Every
window is an address, so what a visitor sends is a dare with a true answer.

This is the owner's goal for sprint 62 (the next thing visitors play with and share, beyond the
yard, still telling the crew's story), built on Iris's direction A (`direction-iris.md`, canvas
linked at its top), her sweep of production, and Pixel's measured budgets (`headroom.md`). Atlas
chose A on her recommendation; the owner may pick B or C on the canvas.

## Why this serves `PRODUCT.md`

- **Belief 2 (he can run an AI org).** The first screen's five-second read is the owner's hardest
  requirement, and the crew spent sprints 39 and 43 to 45 fitting it into every window, then 51,
  57 and 60 defending it. None of that shows today. Here a visitor pushes on it and the page
  answers with the checks that hold it and the people behind them.
- **Belief 3 (taste).** The peers `PRODUCT.md` names second resize every site anyway
  (`research.md`, Lynn Fisher). Resize-as-delight is hers; resize-as-proof, where the page answers
  with its own measurements, is open.
- **Principle 3 (show the crew honestly).** 320 × 568 sinks by 6.2 px, and the record already says
  so (`e2e/phone-window.spec.ts`, "Atlas's ruling, sprint 44"). The toy says it first.
- **Principle 1 and the novelty budget.** `/` doesn't change at all. The toy frames it, on its own
  route, with no door from `/` (below, the owner's call 2).

**The visitor, plainly.** A hiring executive won't resize a window, and this milestone doesn't ask
them to: `/` keeps its first screen byte for byte. The toy is for the second reader, the engineer
or design peer who stays and sends the link, and it reaches them from Crew and the Log (Td). For
them the risk is the gap reading as a defect. The answer at 320 × 568 must read as a judgment the
crew made and wrote down, not an apology.

## Facts this plan rests on

Measured on production (theseus-portfolio.vercel.app), read from the code, or taken from Iris's
sweep and Pixel's headroom:

- **The freeboard, re-measured by me (10 Nov, scripts off, fonts ready, this cloud's Chromium):**
  1440 × 900 29.2 px, 320 × 568 −6.2, 1366 × 595 0.7, 1366 × 625 21.7, 1024 × 640 11.7, 390 × 664
  201.8, with nothing scrolling sideways. The first five equal Iris's sweep to 0.1 px. The
  freeboard is the window's height minus the lowest bottom of the text of the title block's three
  contact links (Email, LinkedIn, GitHub), read as Range rects.
- **Iris's sweep** (`direction-iris.md`): 28,633 windows, 4,871 sink, in one band along the bottom;
  every crew pin floats but 320 × 568; near misses of 0.0 to 0.7 px between the pins.
- **`/` moves with the feed and with merges.** From 1024 wide the contact links wait at the foot of
  a row whose height the revision block sets (`.crew/STATE.md`, "The revision block is five rows"),
  and the feed's states move them: open drops up to 14.67 px, and from 960 tall at 1205 to 1272
  wide a state's second line moves them 23.5 px (`.crew/sprint/60/fit.md`). Below 1024 they never
  move with the state.
- **The header.** `next.config.ts` sends `frame-ancestors 'none'` on every path. One kept check
  reads it, on `/` only ("pages carry the security headers", `e2e/one-site.spec.ts:343`). Next's
  `headers()`: when two rules set the same key on a path, the last one wins
  (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md:47`).
- **Budgets** (`headroom.md`): a server route costs 0 B beyond the 404; a full 2D toy's loader and
  lazy chunk cost 3,573 B decoded, over B2.10's 2,048 B if it loads without a first touch; `/`'s
  loader has 11 B left; three stays in the model's one chunk; 5,160 B of font budget, so no new face.
- **No WebKit in CI.** `playwright.config.ts` (an owner path) runs Chromium only. Safari is the
  spike's and the owner's phone's.

## The calls I made on Iris's slicing

1. **The sprints are Ta to Td, and the checks T1 onward.** Iris named her slices T1 to T5, which
   collides with the checks' numbering. The yard's shape is Ya to Ye with checks Y1 onward.
2. **Ta can be played from day one, without script.** Iris's T1 lets a visitor reach only the
   crew's windows. That's a gallery, not a dare. A plain form (Width, Height, Try it) that lands
   on the window's page costs 0 B of script and works everywhere, so the first sprint is already
   something to send: type 320 × 500 and watch the links go under.
3. **The frame shows `/` as built, with the crew's feed set aside, not the live page.** Without
   script, the number beside the frame comes from the committed sweep. A live frame would disagree
   with it by up to 23.5 px from 1024 wide whenever the crew is working, and then the toy would be
   lying about exactly the thing it claims to measure. The feed's down state is also what every
   first-screen check pins first (`STATE.md`: "The suite's own server is the feed's down state"),
   so the frame, the sweep and the checks measure one page. It agrees with Iris's "Trials is never
   live": no copper inside the frame either. **Needs decision (Iris):** she may keep the live
   frame in her placement call only with a truthful answer for script-off readers.
4. **The card moves from Ta to Tb.** Ta is already a route, a header, a sweep script, its
   staleness check, the rules and the form. The card is server-only and can be built beside Tb's
   controller on disjoint files. Until Tb, a shared window carries its own title and description
   and the site's card.
5. **The chart moves from Tb to Tc, with the fits.** The fits are bands on the chart (Wa's
   laptops, Wb's phones, Wc's tablets), so the chart and the stamps are one sprint about the record.
   Tb is the controller alone, which keeps its INP and bytes measurable.
6. **"With script" waits until after the demo, and so does Iris's T5.** Scripts on in the frame
   brings WebGL into a drag (the riffle's INP is already 416 ms at 4x in this cloud, `headroom.md`)
   and the live feed back into the frame. What the visitor learns, the freeboard, is the same by the
   crew's own design. It's spectacle without new truth, so it has to earn its place at the demo.
7. **Rules name checks in a visitor's words.** Iris's frame reads "W1, sprint 43" and "The 320 px
   gate". Codes aren't visitor words (`STATE.md`, "Goals are a visitor's words"). Each rule says
   what the check holds, the sprint that wrote it, and links to its source at the build's commit,
   as the keel's quotes do.
8. **No motion control on the page until something moves.** Iris's frames show Full, Calm and Off
   on the page. In Ta nothing moves, and a control that changes nothing costs the visitor (memory,
   sprint 22). It comes with whatever first moves.

## The sprints

Each leaves the site whole. None needs an owner answer to start, touches an owner path or edits
`content/`. Checks are numbered T1 onward across the milestone; a check's number is fixed when its
sprint's contract is written, and the ranges after Ta are the plan.

The goals, as `/`'s revision rows print them (visitor's words, at most 78 characters, each
different within its first 30):

- Ta: "Try to sink the contact links in any window you choose" (54)
- Tb: "Drag the window yourself, and the page measures as you go" (57)
- Tc: "A chart of every window, and the crew's seven fits to find" (58)
- Td: "Doors into the trials from Crew and the Log" (43)

### Ta (M): any window, as a page

The contract is `first-contract.md`, checks T1 to T9.

The trials page shows `/`, as built, in a frame the size of the window in its address, scaled to
the column. The page draws the waterline at the frame's foot, measures the contact links'
freeboard from the committed sweep, and says what the record answers: a check holds this window
(each named in words, with its sprint and its source), a near miss, the crew's own gap, or a window
no check claims. The crew's windows are links, and a form takes any window. No script. The frame's
own address may be framed by the site itself, and nothing else changes.

- **What a visitor gets.** A page that answers "try to sink them" for any window they type, in any
  browser, and an address for every answer.
- **Who builds it.** Iris first: placement at 1440 × 900, 390 × 664 and 320 × 568, and the words
  (the h1, the dare, the verdict for each kind of answer, each rule's sentence, the form's labels).
  Forge: the route, the frame's address and its header, the sweep script and the sweep, the table of
  pinned windows, the form. Probe: T1 to T9 red first, the contract mutant, and the pinned-windows
  oracle. Pixel, in a scratch worktree alongside: Tb's spike (below).
- **Budgets.** 0 B of script beyond the 404's on the trials page; `/`, `/log` and `/crew`
  unchanged.

### Tb (M): drag it, and send it

With script, the Width and Height inputs become sliders and the frame's corner a handle: drag it
and `/` reflows under the visitor's hand, the freeboard measured live from the frame's own document
and read by a polite live region when a drag or key settles. The address is replaced on release,
never pushed. Each window gets its own card ("Under by 6.2 px. The crew's own gap."), and a Copy
link. Without script, Ta's page is unchanged.

- **It starts from Pixel's spike, run during Ta:** measuring and resizing a same-origin
  `sandbox="allow-same-origin"` frame on every animation frame, in Chromium and in Playwright's
  WebKit (if it installs here; otherwise say so), the INP of a drag at 4x CPU, and the controller's
  bytes. If WebKit can't reflow the frame live, Tb resizes on release and measures at settle.
- **Planned checks T10 to T15:** the controller loads on the first touch and not before (0 B
  beyond the 404 until then); a drag lands the frame's document at exactly the chosen size and its
  freeboard within 0.5 px of a direct measure; the keyboard (arrows 1 px, Page keys 10, Home and
  End, the corner a button that takes the arrows) and a held finger (CDP touch, 44 px handle,
  `touch-action: none` on the handle only); the address replaced, history unchanged; INP during a
  drag at 4x CPU within 200 ms, gated; one card per window, `image/png` 1200 × 630, its words from
  the sweep and the record.
- **Budgets.** The route's own script number, fixed by Tb's contract from the spike (Iris
  estimates 4 to 8 KB gzip for the whole controller, chart included). 0 frames at rest.

### Tc (M): the chart and the fits

The chart of every window, server-drawn: the sinking band, the crew's pinned windows with their
freeboard, and soundings as links without script. With script, a tap tries that window, and a
ring and track show where the visitor has been. Each of the seven fits the crew built stamps itself
as the frame enters it, with its sprint, who drew, checked and tested it, and the first thing that
went wrong building it, quoted from its retro. "2 of 7 found" counts for the visit only, in
`sessionStorage`; nothing is written anywhere.

- **Planned checks T16 to T21:** the chart's band equals the sweep's sinking windows; the pins and
  soundings as links; tap-to-try; each fit maps to a media query that still exists in
  `app/globals.css` and to a merged retro; each stamp's people and words equal its retro's
  (`wentWrong[0]` verbatim, already public on its record); the sweep is fetched only by the chart.
- **Budgets.** Within Tb's number for the route; the chart's data at most 64 KB raw; CLS 0.

### Td (S): the doors

Two plain links into the trials: from Crew's keel, under its first rule ("Nothing merges until
three checks pass"), and from the Log's foot. Server HTML, 0 B of script. Their fit is measured
at both pages' worst widths first, by injecting them into production's DOM (memory, sprint 38).

- **Planned checks T22 to T24:** the doors, their targets and words; the named rewrites of the
  kept link allowlists and Tab bounds on `/crew` and `/log` (B4.8, B5.6 C5.3, the Tab orders),
  found by the contract mutant; `/crew`'s and `/log`'s script bytes unchanged.
- **Why last.** The record's story (Tc) should be in place before the crew's own pages send people.

### The demo

Quill on production after Td merges, as a notes sprint, as the yard's were. The questions:

- In five seconds on the trials page, can a visitor say what to do and whose links "them" are?
- Do they sink the links within a minute on a phone, and does the answer say whether the crew
  knew, in words a non-engineer reads?
- Does any number on the page disagree with what the frame shows?
- Does a window's card make someone open it?

### After the demo, if the trials earn it

- **With script (S).** The frame reloads with scripts on, the hull in 3D re-posing at 768 as you
  drag (Full and Calm only). Its contract names how far the scripted freeboard differs from the
  sweep, and gates INP.
- **The yard in the trials (S).** A step page of the yard in a phone's window, the step link above
  the waterline (Ha's claim, H1 to H7).

## The risks, and how each is handled

1. **Measuring and resizing a sandboxed same-origin frame live, on Safari.** Ta has no script, so
   Ta doesn't carry it. Pixel's spike during Ta tests it in Chromium and WebKit; Tb's contract
   starts from it and keeps a fallback (resize on release). Only the owner's phone tests real Safari.
2. **`frame-ancestors`.** Only the frame's own address gets `'self'`, by a later header rule;
   `/` and every other page keep `'none'`, so the kept check on `/` stays green unedited, and other
   origins still can't frame anything. A security header still loosens, so Lens accepts it with the
   reason in the PR. If Forge's scratch build shows the rule can't be scoped to the frame's
   address, `/` itself gets `'self'` and that check becomes a named rewrite for Lens.
3. **Scripts and states move the links.** The feed's states move them up to 14.67 px (open) and
   23.5 px (a second line at 1205 to 1272 × 960 and up), and `display: optional` can paint the
   fallback face. The frame shows the down state (call 3), so Ta to Tc's numbers are the frame's.
   The no-script number is Chromium's with the display face; Tb's live measure is the visitor's own
   browser. Anything that frames a scripted or live page later names its own difference.
4. **The committed sweep goes stale with merges.** From 1024 wide the links wait at the foot of
   the revision block, which changes whenever a new goal wraps differently. So Ta's staleness check
   compares the sweep with a fresh measure of the build and fails CI the day they differ, naming
   the command that rewrites it. That makes it a step in every later sprint: write the retro, then
   run the sweep, then add the label (about two minutes). Atlas adds that line to `.crew/STATE.md`
   at Ta's close. The sweep is imported into the bundle, never read at render, since pages
   regenerate on servers without the repository's files (memory, sprint 46).
5. **The novelty budget.** `design/brief.md` allows one signature transition, one live layer and
   one archive moment; the yard is the archive moment. The trials are a fourth, on their own route.
   It's the owner's call (below); it can be undone by removing the route, so the work goes on.
6. **Scrollbars.** A frame that can scroll draws a classic scrollbar in some browsers and lays the
   page out 15 to 17 px narrower than its window. The frame never scrolls, and T2 pins that its
   document is exactly the window's width. The crew's checks and the sweep measure windows without
   a scrollbar too; Iris says so in a visitor's words if it needs saying.
7. **Scaling without script.** Fitting a frame of any width to the column in CSS alone needs
   length division (`100cqi / 1366px`), which not every browser has. Forge measures it, with a
   server-computed fallback that never overflows; T2 pins the drawn shape and no sideways scroll.
8. **Thirteen thousand addresses.** Only the trials page and the crew's windows are prerendered,
   the rest are rendered on demand and cached, and only the trials page is in the sitemap.

## Budgets (every sprint)

| Budget | Limit | Now | Check |
|---|---|---|---|
| `/`, `/log`, `/log/13` script, WebGL refused | within 2,048 B of the 404's | 2,037 B | B2.10, unedited |
| `/crew` script, WebGL refused | B4.14's two limits | 18,831 B | B4.14, unedited |
| `/`'s first screen and HTML | unchanged | — | W1 to W17, B1.1, P3, P8, H9 to H11, unedited; the frame's `main` equals `/`'s (T2) |
| The 3D chunk | one file, ≤ 250,000 B gzip | 167,244 B | B3.6, B5.23, B4.40, H7, Y18, Y24, unedited: no new import of three |
| The trials page's script | Ta 0 B beyond the 404's; Tb's own number after the first touch | — | T8, then Tb's |
| LCP | text in main, outside the frame, ≤ 2,500 ms at 4x CPU | — | T8 |
| CLS | 0 | — | T8: the frame's box comes from the address |
| INP during a drag | ≤ 200 ms at 4x CPU, gated | — | Tb |
| Copper | never on the trials page | — | T8 |
| Fonts | no new face | 5,160 B left | B1.10, B2.10, unedited |
| CI | each shard under 20 minutes | — | reported by each sprint before its label |

## Out of scope for the milestone

- **Anything on `/`,** and a door from it: the five-second read comes first.
- **The bar.** Its four links share a row at 320 and 390 (B3.23), and the trials aren't navigation.
- **A live frame, and scripts in the frame,** until after the demo (calls 3 and 6).
- **Directions B and C,** unless the owner picks one.
- **Visitor input that writes anything.** "Found" lives in `sessionStorage`.
- **Device mockups, squash-on-resize, sound,** and the defaults Iris steered away from.
- **`/llms.txt`.** The toy is for people; the agents' map doesn't change.
- **Owner paths and `content/`.** No sprint here touches either. The brief's line is proposed in
  sprint 62's retro.

## The owner's calls: none blocks the work

1. **The direction.** Iris recommends A, on the canvas
   (https://claude.ai/artifact/MicDUbCifCHvCBsEfqZQS4). He may pick B (send it back) or C (the
   plane), or none. The build starts on A.
2. **The novelty budget.** Recommended: add one line to `design/brief.md`, "One proving ground, on
   its own route, off the first screen." The alternatives are widening the archive moment to "the
   record you can play", or keeping the budget, in which case the route comes out and the crew
   stands down. It can be undone either way, so the work goes on.
