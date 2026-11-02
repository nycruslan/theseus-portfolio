# Closing "the proof in the first window" (Quill, sprint 46)

**Verdict: it holds.** On production, at every laptop, tablet and phone window the W checks name, the
first window shows Ruslan's name, his role, his own lead, his contact links and the four
particulars; at the laptop and tablet windows the revisions' caption and the crew key show too.
At 1440 × 900 nothing moved. Of the W checks' passes that can run on a deployment, 12 passed, and
the 2 that failed (W5 and W7) failed on reads that hold only in the feed's down state, not on
anything a visitor sees (below). Sprint 42 found the name on the fold at 1536 × 715 and cut at
1366 × 625. Today the name, role, bio and links all sit inside both windows, with 15 to 18 px to
spare.

## How I measured

- **Where:** production at https://theseus-portfolio.vercel.app, on 2026-11-02 from 09:29 to
  09:39 UTC. https://ruslanshulga.com isn't reachable from this sandbox (the proxy answers 403 to
  CONNECT), so I didn't read it. The deployment carries sprint 45's row and Wc's rules. Sprint 46
  was live, so `/` showed the live state: a pencil row "46" and a two-line legend at some widths.
- **The W specs, unedited:**
  `PLAYWRIGHT_BASE_URL=https://theseus-portfolio.vercel.app pnpm exec playwright test
  e2e/window.spec.ts e2e/phone-window.spec.ts e2e/tablet-window.spec.ts`. The result was 12
  passed, 2 failed, 7 skipped, in 1.9 min. `playwright.config.ts` drops its web server when
  `PLAYWRIGHT_BASE_URL` is set.
- **The table below:** my own scratch script, outside the repo. It used `@playwright/test` 1.64.0's
  Chromium headless shell 1248 at DPR 1, on Full, the visitor's default. Each box is the element's
  own, in page pixels. "Links' foot" is the bottom of the title block's three contact links. I
  looked at screenshots at 1536 × 715, 1366 × 625, 1024 × 640, 390 × 664 and 1440 × 900.

## The W checks on production

| Check | On production | Holds? |
|---|---|---|
| W1 laptop windows hold the facts (default pass) | Passed. Table below: every item is inside at all eight windows. | Yes |
| W2 nothing moves at 1440 × 900 | Skipped under `PLAYWRIGHT_BASE_URL` (it reads the feed's down state, `.crew/sprint/45/decisions.md` 11). My read: the `h1` is at 567–657 and the links' foot at 874, as on 2026-11-01 while live. | Yes (CI) |
| W3 drawing whole and clear, 240 px floor | Passed. The drawing is 249 px at 1366 × 625 and 240 at 1280 × 620. | Yes |
| W4 the model lands, 1366 × 625 and 1536 × 715 | Passed (SwiftShader). | Yes |
| W5 a resize refits it | **Red on production, not on the page.** At 900 it compares the links with main's default-server boxes (839.97). While live they sit at 847.83: the live row and its legend sit 7.9 px lower by design (B4b). The 700 px step passed. | Yes; the check needs a guard |
| W6 still, the name first | Passed: CLS 0, and the `h1` is the LCP at 4× CPU. | Yes |
| W7 sweeps at 1366 × 625 and 1536 × 715 | **Red on production, not on the page.** Axe and overflow passed. Two reads assume no plank is in pencil. (1) Forced colours flags `path.plank-erase`, whose stroke is `Canvas` by design: it erases the neighbours' seams under the pencil's dash (`app/globals.css:609`). The screenshot shows the drawing whole. (2) Full and Off differ by the "46" lettering span (Full 288,256; Off 311,222). Full leads it out onto the film chip under the hull, Wa's rider. | Yes; the check needs a guard |
| W8 phone windows hold the facts (default pass) | Passed. | Yes |
| W9 narrow drawing whole, model lands at 390 × 664 | Passed. The drawing is 146 px, its floor. | Yes |
| W10 the control, 44 px targets | Passed. | Yes |
| W11 still on phones, `svh` only | Passed. | Yes |
| W12 3D label leaves the dot showing | Skipped (fixtures only). | Yes (CI) |
| W13 tablet windows hold the facts (default pass) | Passed. | Yes |
| W14 the key shows from 1024 to 1439 (default pass) | Passed. | Yes |
| W15 default passes under `PLAYWRIGHT_BASE_URL` | This run is its proof: W1, W8, W13 and W14 ran here. | Yes |
| W16 tablet drawing whole, model lands | Passed. | Yes |
| W17 still at tablet windows | Passed. | Yes |

W5 and W7 have no guard because they were written before sprint 45's lesson that only a
pass that holds in every feed state may run under `PLAYWRIGHT_BASE_URL` (`.crew/STATE.md`). CI's
server is always the down state, so CI isn't affected. Ka's contract takes it as Probe's rider.

## What the first reader gets, measured

Bold is below the fold or cut by it. Phones are held to 8 px less (W8), and the rest to the fold.

| Window | `h1` | Role | Bio lead | Links' foot | Particulars | Key | Caption | Drawing |
|---|---|---|---|---|---|---|---|---|
| 1280 × 680 | 372–456 | 479–503 | 513–587 | 634 | 212–336 | 601–620 | 382–401 | 280 |
| 1280 × 800 | 492–576 | 599–623 | 633–707 | 754 | 332–456 | 721–740 | 502–521 | 400 |
| 1366 × 625 | 341–428 | 451–476 | 486–559 | 607 | 199–305 | 570–589 | 351–370 | 249 |
| 1440 × 790 | 506–595 | 618–644 | 654–728 | 775 | 364–470 | 736–755 | 517–536 | 414 |
| 1470 × 840 | 556–645 | 668–694 | 704–778 | 825 | 414–520 | 786–805 | 567–586 | 464 |
| 1512 × 865 | 581–670 | 693–719 | 729–803 | 850 | 439–545 | 811–830 | 592–611 | 489 |
| 1536 × 715 | 431–520 | 543–569 | 579–653 | 700 | 289–395 | 661–680 | 442–461 | 339 |
| 1920 × 950 | 666–755 | 778–804 | 814–888 | 935 | 524–630 | 896–915 | 677–696 | 574 |
| 1280 × 620 | 332–416 | 439–463 | 473–547 | 594 | 190–296 | 561–580 | 342–361 | 240 |
| 1920 × 620 | 336–425 | 448–474 | 484–558 | 605 | 194–300 | 566–585 | 347–366 | 244 |
| 1440 × 900 | 567–657 | 680–705 | 715–789 | 874 | 408–531 | 797–817 | 578–598 | 475 |
| 1920 × 1080 | 730–819 | 842–867 | 878–951 | 999 | 587–694 | 959–979 | 741–760 | 638 |
| 1024 × 640 | 332–406 | 429–453 | 463–560 | 632 | 120–296 | 583–622 | 364–383 | 240 |
| 1024 × 768 | 332–406 | 429–453 | 463–560 | 632 | 120–296 | 583–622 | 364–383 | 240 |
| 1180 × 740 | 390–470 | 493–517 | 527–624 | 697 | 177–354 | 617–656 | 399–418 | 298 |
| 1220 × 640 | 332–414 | 437–461 | 471–568 | **641** | 190–296 | 560–599 | 341–361 | 240 |
| 1247 × 640 | 332–414 | 437–462 | 472–570 | **643** | 190–296 | 560–599 | 341–361 | 240 |
| 1366 × 950 | 542–629 | 652–677 | 687–761 | 848 | 365–506 | 771–791 | 552–572 | 450 |
| 820 × 1100 | 345–415 | 432–455 | 464–535 | 598 | 622–728 | 999–1019 | 780–800 | 277 |
| 768 × 950 | 328–396 | 413–436 | 444–515 | 578 | 602–708 | **979–998** | 760–780 | 260 |
| 390 × 664 | 228–282 | 299–321 | 330–423 | 476 | 488–646 | **1250** | **718** | 146 |
| 393 × 659 | 228–282 | 299–321 | 330–423 | 476 | 488–647 | **1216** | **719** | 146 |
| 412 × 780 | 327–382 | 399–421 | 429–522 | 575 | 587–729 | **1299** | **801** | 252 |
| 430 × 746 | 306–361 | 378–400 | 409–502 | 555 | 567–708 | **1278** | **780** | 226 |
| 375 × 548 | 228–282 | 299–321 | 330–446 | 499 | **511–670** | **1428** | **742** | 146 |
| 360 × 560 | 240–294 | 311–333 | 342–458 | 511 | **523–682** | **1440** | **754** | 146 |
| 390 × 844 | 317–371 | 388–410 | 419–511 | 564 | 576–735 | **1305** | **807** | 240 |
| 320 × 568 | 255–309 | 326–347 | 375–491 | **588** | **600–758** | **1517** | **830** | 146 |

- Every window in W1's, W8's and W13's sets holds its facts. No page scrolls sideways at any size.
- Below the fold by the contract's own terms:
  - the particulars at 375 × 548 and 360 × 560, which Wb allows;
  - the key and caption on phones (the milestone's out of scope);
  - the key at 768 × 950, outside W14's widths.
- 1220 × 640 and 1247 × 640 end the links 1 and 3 px under the fold, as Wc accepted
  (`.crew/sprint/45/decisions.md` 5).
- 320 × 568 is reported only. It loses the links and the particulars there.

Compared with sprint 42's close, at the same windows:

| Window | Name | Role | Links' foot | Particulars |
|---|---|---|---|---|
| 1536 × 715 | 600–689 to 431–520 | 737 to 569 | 907 to 700 | — |
| 1366 × 625 | 542–629 (cut) to 341–428 | — | 823 to 607 | — |
| 390 × 664 | — | — | — | foot 812 to 646 |
| 1024 × 640 | — | — | 752 to 632 | 769–849 to 120–296 |

## The five-second read, as the hiring executive

- **On the commonest Windows laptop window (1536 × 715), he stays.** In one look he gets the drawn
  hull and the four particulars beside it, then "Ruslan Shulga" in the condensed face at 90 px,
  "VP Engineering, AI Platform", JPMorgan Chase and the contact links. Beside them are the
  revisions, captioned "This site is where a team of AI agents shows what it can ship on its own",
  and the key, "Every name is an AI agent Ruslan directs." What made him leave on 2026-11-01 (no
  role, no contact, the name on the fold) is gone.
  - One reservation: at the short windows the particulars sit at the top right, above the name, so
    the eye can meet "a team of 7 across AI research, backend and platform" before learning whose
    team it is. The name's size wins within a second, so I'd leave it. Iris may weigh it.
- **On an iPhone in Safari (390 × 664),** the name, role, bio, links and all four particulars are
  in. Belief 1 lands. Belief 2 doesn't: nothing in the first window says who builds the site, by
  this milestone's choice; the bar's Crew link is there. The drawing is at its 146 px floor, so the
  signature hull reads as a strip. That's the price of the facts, and the right trade.
- **On a tablet (1024 × 640),** everything is in. One thing reads badly: the description column
  shows about 30 characters, and three rows read "Fit the name, facts and contact l…" one under
  another. To a stranger it looks like one row repeated, not three planks. It ages out as the rows
  turn over. The lesson is for every milestone's goals: they should differ within their first 30
  characters.
- **What would still make him leave?** Nothing in the first window now. His next question is
  belief 2's: is the AI crew real and governed, or a gimmick? The site shows that the crew works
  (`/crew`, `/log`), but not what holds it to account. The next milestone answers that
  (`plan.md`).

## Left open, sorted by what each waits for

Each was checked against the code on 2026-11-02.

- **Taken already, found in the code:**
  - Wa's Lens nits: the chip rule is now scoped to `/`'s sheet (`app/globals.css:827`), and
    `e2e/ghost.ts` no longer says 690.
  - Wb's comment nit and W11's resize wording were Wc's riders.
- **Waiting for a sprint that touches their code:**
  - **W5's and W7's deployed passes.** They read the down state, as above (Probe). This is Ka's
    rider.
  - **Lens's nit on #108:** `openHome` and `shownOn` are still copied in `e2e/window.spec.ts:106`
    and `:165`, and in `e2e/phone-window.spec.ts:100` and `:154`, beside `e2e/window.ts`. Probe's
    memory line on `e2e/window.ts` goes with it (Probe).
  - **The model's hand-off (LCD text) at Wa's and Wc's widths.** No check reads it, and Wa's rule
    from 1280 loses it at 1300 × 650 on unchanged code (Forge and Probe, with the next sprint on the
    short layout).
  - **`/crew`'s foot row over its canvas** (LCD text, unchecked). Ka takes it if Iris's placement
    touches `/crew`'s foot.
  - **A 24 px default font scrolls the phone sheet sideways** (Forge and Iris, with the next sprint
    on the phone sheet's type).
  - **Iris's memory lines 66 and 67** (Iris).
  - **The five-seconds milestone's three "for a PR the owner reviews anyway" riders:** the legend's
    "Original", C5.3's commit-hash link, and the unknown record's scripts-off 404. Since #84
    (2026-10-25), `gate` leaves a loosened check to Lens (`.github/workflows/gate.yml`, the header),
    so they wait only for a sprint that touches their code.
- **Accepted and reported:** 1220 × 640 and 1247 × 640, 1 and 3 px.
- **Waiting for a real device:** Safari on a real phone and tablet, and real Mac and Windows Chrome
  with a GPU. Chrome 153's headless shell and SwiftShader stood in for them.
- **Waiting for the owner, optional:** his B3, B4 and B5 demos on his own laptop window, now that
  Wa has merged, and the five-second test with a stranger.

## Also seen

- In forced colours, the legend's "Original" swatch paints maroon at 1366 × 625. That's another
  reason to settle "Original" while no original plank is left (Quill's screenshot in forced
  colours, light scheme, 1366 × 625, kept outside the repository).

## Not verified

- https://ruslanshulga.com: not reachable from this sandbox.
- The fixture passes of W1, W2, W8, W13, W14, W12 and Wa's rider: they need this checkout's build
  pointed at fixtures, so they ran in #102's, #107's and #108's CI, not here.
- Real devices, a GPU, Safari, and the five-second test with a stranger.
