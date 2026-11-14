# Try to sink it: the milestone's demo (Quill, sprint 67)

**Verdict: the trials hold, nothing reopens work, and the crew stands down once sprint 67 merges.**
All four of the plan's questions hold on production, and the doors are where the contract put
them. In five seconds the trials page says what to do and whose links: "Sea trials", then "Try to
sink Ruslan's contact links.", in the first screen at every window I read. On a phone a held finger
sank the links in about 2 s, from a page that had loaded in 0.6 to 0.7 s. The page's number matched a
direct measure of the frame's own page at every window and path I read, to 0.03 px. `/` hasn't
moved: its contact links sit where the plan measured them on 10 Nov, to 0.1 px, and it has no link
to the trials.

Nothing I found makes the site say something false or hides a fact, so no defect reopens work
(`ROADMAP.md`'s stand-down conditions). Three things would still make a peer think less of the
work. The trials page logs 48 console errors on every view. Its caption drops a line after first
paint on some cold loads, so the chart jumps 20 px, and T8 is red against production for that
reason. And while the crew works, `/` at 1440 × 900 sits 7.9 px lower than the trials say, which
the caption explains but the card's description doesn't. Each is a follow-up with an owner
("Left open"). Neither "after the demo" item earns a sprint (below).

## How I measured

- **Where:** https://theseus-portfolio.vercel.app, 2026-11-14. It serves #134 (d957542). `/crew`'s
  HTML has `<p data-trials-door="" class="keel-door"><a href="/trials" class="crew-link …">Try to
  sink Ruslan's contact links`, and `/log`'s has `<p data-trials-door="" class="log-door"><a
  href="/trials">` with the same words. The frame's revision block starts at "66 Doors into the
  trials from Crew and the Log". Sprint 67 was live during my reads: `/`'s top row read "67 The
  trials' demo, and a Log door that wraps · drawing now", with "In progress" and "Drawing now" in
  its legend. https://portfolio.ruslanshulga.com answered 403 to CONNECT through this sandbox's
  proxy (the cards' own URLs point there), so I read the cards from the vercel.app host by the
  same paths.
- **With what:** my own scripts in the session's scratchpad (not in git), on Playwright 1.64.0's
  Chromium headless shell (1248):
  - `first.js`: the h1, dare, lead, readout, verdict, answer, frame, waterline, caption, corner,
    form, chart and fits on `/trials`, `/trials/320x568`, `/trials/320x460` and `/trials/1366x595`.
    I read them at 1440 × 900, 1366 × 768, 390 × 664, 390 × 844, 360 × 640 and 320 × 568, scripts
    off and on (48 loads), with a direct measure of the frame's own page by the sweep's rule and the
    console's errors;
  - `sink.js`: a held finger (CDP `Input.dispatchTouchEvent`, a touch context, 2×) dragging the
    frame's corner up and left from `/trials` at 390 × 664 and 320 × 568, then a tap on the chart;
  - `doors.js`: each door's place, height, the element above it and the page's overflow at six
    windows, scripts off and on, then each door followed by a click at 1440 × 900 and a tap at
    390 × 664. It also reads `/`'s freeboard and its links to the trials;
  - `home.js` and `flip.js`: `/` against the frame's address and the trials' number at the same
    windows;
  - `cls.js`, `cls-site.js` and `caption.js`: what shifts on the trials page at load (24 cold
    loads), the same read on `/`, `/crew` and `/log` (24 loads), and the caption's height from
    the first frame over 12 cold loads at 1440 × 900;
  - `framebytes.js`: what the frame fetches and logs on one cold load at 390 × 664.

  Screenshots are in the scratchpad's `shots/`, and the four cards in `cards/`.
- **The specs, unedited, against production:** all four trials spec files. The trials pages carry
  no feed (the frame is the down state, by call 3), and T2 and T4 skip their down-state comparisons
  under `PLAYWRIGHT_BASE_URL`. T22 and T23 read each page against itself. So every test in them
  holds in any feed state (`.crew/STATE.md`, Specs). The command was
  `PLAYWRIGHT_BASE_URL=https://theseus-portfolio.vercel.app pnpm exec playwright test
  e2e/trials.spec.ts e2e/trials-drag.spec.ts e2e/trials-chart.spec.ts e2e/trials-doors.spec.ts
  --workers=2`. The result is under "The spec run".

## The questions

| The plan asks (`.crew/sprint/62/plan.md`, "The demo") | What production showed | Holds? |
|---|---|---|
| In five seconds on the trials page, can a visitor say what to do and whose links "them" are? | "Sea trials" and then "Try to sink Ruslan's contact links." are in the first screen at all six windows: the dare at 131.4–155.7 on every phone and 182.4–210.7 at 1440 × 900. The lead follows ("Pick a window and his first page is drawn at its size. The window's foot is the waterline…"). The window, the signed freeboard and the verdict ("Held by the crew's checks") sit at 280–340 on phones. The frame's top is at 380 (405 at 320 × 568). With script, the caption's "Drag the frame's corner to try another window" is in view at 390 × 664 (571–630), and so is the corner (527–571). "Them" is Ruslan's three contact links, said in the dare. The title ends "— Ruslan Shulga" and the frame draws his name. On a phone the frame's 1440 × 900 page is about 350 px wide, so the name in it is small. The dare carries it. | **Yes** |
| Do they sink the links within a minute on a phone, and does the answer say whether the crew knew, in words a non-engineer reads? | **Sinking:** a held finger dragged the corner from `/trials` and settled on `/trials/320x460` ("Sunk", −114.2 px), in 1.97 s at 390 × 664 and 2.09 s at 320 × 568. Mid-drag the page read "800 × 503", "−75.0 px" and "Measured live in your browser". The address was replaced, `history.length` stayed 2, and the page didn't scroll. A tap on the chart's band settled on 1280 × 480 ("Sunk", −110.6 px) within 1 s. Without script, the crew's windows are links and the form takes any window (T6 green). **The answer:** the gap's says it outright: "…6.2 px under the waterline, and the crew knew." A sunk window's says "You sank them… in a window the crew's checks leave alone: they hold the links up in 80 others." The near miss says "With no check holding them here, a change could sink them, and this page would say so." All three are plain except the gap's middle sentence: "this window was outside the set, and Atlas … ruled that its check would report where the links land here rather than hold them" is an engineer's sentence. **On a phone the answer is a scroll down.** After the sink it starts at 748.9 at 390 × 664 and 793.2 at 320 × 568. The verdict word ("Sunk", "The crew's own gap") is in view at 316 and 341. | **Yes**, the verdict in view and the "crew knew" sentence one scroll down |
| Does any number on the page disagree with what the frame shows? | **No.** `[data-freeboard]` equals a direct measure of the frame's own page, by the sweep's rule, within 0.03 px on every load in `first.js` (four paths × six windows × scripts on and off). For example, 37.0 against 37.03, −6.2 against −6.20 and 0.7 against 0.70. T3 (the dimension and the waterline) and T11 (mid-drag, on its re-run) are green. **Against the live `/`, one window differs, as designed and disclosed.** At 1440 × 900, `/` reads 29.17 while the crew is drawing, and the trials say 37.0. That's the live legend's 7.86 px, the same drop the yard's demo measured (`.crew/sprint/61/demo.md`, 866.31 default against 874.17 live). At thirteen other windows `/` and the trials agree to 0.1 px: 1536 × 715 and 700, 1366 × 625 and 595, 1280 × 800 and 760, 1024 × 768 and 640, 390 × 664, 320 × 568, and 1440 × 870, 865 and 860. Under the frame the caption says "His first page as the site builds it, without the crew's live updates". The card's description doesn't ("…contact links end 37.0 px above the foot of the first screen"). | **Yes** on the page; the description lacks the caption's qualifier |
| Does a window's card make someone open it? | Each window has its own 1200 × 630 card (T15 green, and I read four). It shows the size, the number in the display face ("Under by 6.2 px."), the verdict ("The crew's own gap."), the dare and the address. That's a dare with a number, and a peer will open it to argue with it. For a sunk window the dimension hangs into the hatched sea, which reads at a glance. **The card's window is blank paper.** It doesn't show his page in it, so the card reads as a diagram, not as a website going under, and a non-engineer gets no picture of what sank. | **Yes** for the peer it's meant for; the blank window is its one weak point |
| The doors (Td): are they found from `/crew` and `/log`, and does nothing above them move? | **`/crew`:** the door is the last line of rule 1, right after "Nothing merges until three checks pass…" and its source. That puts it 1.84 screens down at 1440 × 900 (top 1651.9) and 2.4 to 4.1 screens on phones, 44 px tall there. It reads as the natural next step: the rule says checks hold the site, and the link says try to beat them. **`/log`:** the door is the page's last line, 32 to 40 px from its end. That's 4.1 screens down at 1440 × 900, and 9.0 at 390 × 844, 11.5 at 390 × 664 and 18.3 at 320 × 568. Only a visitor who reaches the end of 66 revisions finds it. "Rebuild it yourself" stays the Log's first-screen invitation. **Nothing above moves:** T23 is green on production on both pages at five widths, with fonts loaded and blocked. Neither page overflows sideways. `/` has no link to `/trials` at six windows, scripts on and off (T22's nowhere-else pass is green too). Each door, clicked at 1440 × 900 and tapped at 390 × 664, lands on `/trials` with a 200 and "Sea trials". | **Yes** on `/crew`; on `/log` only at the foot, as placed |

## The visitor's read

- **The hiring executive on `/`:** the same first screen as before the milestone. The contact
  links' freeboard equals the plan's 10 Nov reading at every window it named: 29.2 at 1440 × 900
  (live), 21.7 at 1366 × 625, 0.7 at 1366 × 595, 11.7 at 1024 × 640, 201.8 at 390 × 664 and −6.2 at
  320 × 568. There's no door and no new line, and no layout shift in eight cold loads at 1440 × 900
  and 390 × 844.
- **The person sent a trials address on a phone:** they land on the dare, a number and a verdict,
  with the frame starting under them. On `/trials/320x568` they read "−6.2 px" and "The crew's own
  gap" in the first screen. On a 320 × 568 phone the waterline itself is a scroll down (682.1), as
  T7 allows. One drag of the corner sinks the links, and the address they'd send is replaced as
  they go.
- **The second reader on `/crew`:** the door comes right after the rule it tests, which is the
  best place on the site for it.
- **What would make them leave:** an engineer who opens DevTools sees 48 red errors per view (see
  "Left open"). On some cold loads at 1440 × 900 the chart jumps 20 px half a second in. Neither is
  in the first screen's words, and both are the kind of thing this page's readers notice.

## The spec run

The four files, unedited, against production with 2 workers: **20 passed and 2 failed, in 5.2
minutes** (22 tests). I re-ran the two reds once: T11 passed and T8 failed again.

- **Green:** T1 to T7, T9, T10, T12 to T15, T16 to T21, T22 (both pages and nowhere else) and T23
  (both pages).
- **T11 red, then green.** The first run read `data-measure` as null mid-drag at 1440 × 900. The
  controller loads on the first pointerdown, from production over the network, and the drag
  outran it. The re-run passed. A pass that depends on the network's speed is a deployed-read
  guard to name (Probe), not a defect. My own finger drag read live mid-drag on both phones.
- **T8 red twice, on CLS alone.** Every other part of T8 passed: axe, tokens, targets, forced
  colours, bytes and LCP. The shifts were 0.0007 (`/trials` at 320 × 568) and 0.0763
  (`/trials/320x568` at 1440 × 900) in the first run, then 0.00065 and 0.00048 in the second. My
  `cls.js` found two kinds:
  - **Sub-pixel, most loads:** 0.0002 to 0.0007, from the bar's nav, the readout and the found
    count, with no change in y or height. `/` and `/log` showed none in their eight loads each.
  - **The caption losing a line, 1 of 24 loads in `cls.js` and 3 of 12 in `caption.js`:** CLS
    0.0719 at 1440 × 900. On those loads the first paint (217 to 304 ms) came while the text face
    was still `loading`. The figcaption was 59 px tall, and at 420 to 462 ms it fell to 39, so the
    chart moved up 20 px (`figure.trials-chart` 671 → 651). On loads whose first paint had the face
    loaded, it was 39 px throughout. So the face applies after first paint here, and with
    `display: optional` it shouldn't (B1.8). I didn't find why. CI's local server serves the fonts
    at once, so CI doesn't see it.

## Left open

None of these reopens work. Each rides with the next sprint that touches its code.

- **Pixel (with Forge): the frame's console.** Every trials view logs 48 errors in Chromium:
  "Blocked script execution in '…/trials/frame' because the document's frame is sandboxed and the
  'allow-scripts' permission is not set." The frame's page carries `/`'s 49 script tags, 9 with
  `src`. In one cold load at 390 × 664 its 8 script requests cost 2,258 B on the wire, since they
  mostly share the top page's chunks, so bytes matter less than Ta's "465 KB" suggested. The errors
  are what a peer sees. Serving the frame's document without its script tags answers both, and T9's
  "no CSP refusal" rules out blocking them by CSP instead (sprint 64's follow-up).
- **Forge: the cold-load caption jump.** The root cause comes first: why the text face applies
  after first paint on `/trials` under `display: optional`, when `/` holds still. Then the fix.
  T8 is the check, red against production now.
- **Probe: T11's deployed read.** Its mid-drag read can outrun the controller's first load over the
  network. Wait for the controller under `PLAYWRIGHT_BASE_URL`, as sprint 65's follow-up asks of
  T18, or name the race in the spec.
- **Iris: words.**
  - The gap's middle sentence in a non-engineer's words.
  - The window descriptions' "end N px above the foot of the first screen" could carry "as the
    site builds it", as the caption does. While the crew works, 1440 × 900's real `/` is 7.9 px
    lower.
  - The live region's message after a drag names every fit it found. From `/trials` to 320 × 460
    it named five, in about 90 words. A count may serve a screen-reader user better.
- **Iris (with Forge): the card's window.** Draw his page's silhouette in the card's blank window,
  at least the name block and the links' line, so the card shows what went under. It's
  server-rendered, so it costs no client bytes.
- **Still waiting, unchanged:**
  - Iris on whether a crew's dot wins a tap over a sounding (sprint 65, decisions 10), and the
    found count's baseline;
  - Pixel's loader-failure nit, the long frames during a drag at 4x, and a Tab before the
    controller loads;
  - Probe's Safari and Firefox at 390 × 664;
  - the bar's 44 px targets below 1024.
- **Sprint 67's own riders** (the Log door's `nowrap`, the print check, one constant for the dare)
  aren't on production, so I didn't judge them.

## What's next: stand down

**Neither "after the demo" item earns a sprint.**

- **With script** (the frame running `/`'s scripts, the hull re-posing as you drag) shows nothing
  new: the plan's own call 6 said the freeboard is the same by design. It would bring the live
  feed's 7.9 px back into the frame, and the drag's long frames are already 167 to 268 ms at 4x.
  The visitor gets spectacle and the page loses its claim to measure exactly what it shows.
- **The yard in the trials** puts a second toy inside the first. No reader I speak for is missing
  it, and the hiring executive never sees it.

So the crew stands down after sprint 67 merges, on the roadmap's three conditions: the owner sets a
goal or answers a pick, a defect on production makes the site say something false or hides a fact,
or the owner plays the trials on his own phone and wants more. If he wants one more sprint on the
trials anyway, the one I'd pick is S: a quiet console and a caption that doesn't jump. Not either
spectacle.

The owner's cheap check is still the one the cloud can't make: Safari on his phone, a real finger
on the corner, and Copy link into a message, to see the card and the address arrive.

## Proposed for `ROADMAP.md` (Atlas ticks it)

Rename "## Now: try to sink it" to "## Finished: try to sink it", and put this paragraph at its
head, above the outcome:

> Ta to Td merged by 2026-11-14 (Td, #134, last). Quill ran the milestone's demo on production in
> sprint 67 (`.crew/sprint/67/demo.md`), and the plan's four questions hold:
>
> - The dare, "Try to sink Ruslan's contact links.", is in the first screen at every window.
> - A held finger sinks the links in about 2 s on a phone, and the verdict says whose gap it is.
> - The page's number equals the frame's own measure to 0.03 px.
> - Each window's card is its own dare.
>
> The doors sit under Crew's first rule and at the Log's foot, with nothing above them moved, and
> `/` is unchanged. Left open: the frame's 48 console errors per view (Pixel); a 20 px caption jump
> on some cold loads, with T8 red on production (Forge); T11's deployed race (Probe); the gap's
> middle sentence, the descriptions' "as built" and the card's blank window (Iris); the owner's
> look on Safari on his phone.

Then replace the demo's unticked item with:

> - [x] The milestone's demo (sprint 67, PR #135): Quill on production, `.crew/sprint/67/demo.md`.
>   The trials hold, so the crew stands down. Sprint 66's door follow-ups rode along.

and the "After the demo, not scheduled" line with:

> - **Then the crew stands down.** Neither the scripted frame nor the yard in the trials earned a
>   sprint at the demo (`demo.md`, "What's next"). Work reopens when the owner sets a goal or
>   answers a pick, when a defect on production makes the site say something false or hides a
>   fact, or when he plays the trials on his phone and wants more.
