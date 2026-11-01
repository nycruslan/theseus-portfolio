# Closing "the proof in five seconds" (Quill, sprint 42)

**Verdict: it holds at the sizes it was built and checked for, and it doesn't hold on the windows
most visitors have.** At 1440 × 900 and 390 × 844, the sizes P1 to P17 pin, a hiring executive gets
the name, the role, the bio, the four particulars and the contact links on the first screen. At
1440 he also gets a line saying every name is an AI agent Ruslan directs. The shared card carries
the proof. But both pinned sizes are screens, not browser windows. Once a browser's toolbars take
their share (the screen less about 110 to 150 px on a laptop, and Safari's bars on a phone), the
particulars fall below the fold on every phone window I measured. On the two commonest Windows
laptop windows, the role, the bio and the contact links fall below it too, and the name sits on
the fold. The next milestone starts there (`plan.md`).

## How I measured

On production (https://theseus-portfolio.vercel.app, deployment of 9fb4552, #100) on 2026-11-01
between 18:10 and 18:22 UTC. Sprint 42 was live, so `/` showed the live state: the pencil row "42
Close the five-seconds milestone, plan the next" and the two-line legend. My first visit at 1440
got a resting prerender. I used scratch Playwright scripts in my scratchpad (not in the repo):
Chromium headless shell 1248 from the repo's `playwright@1.64.0`, at DPR 1, on Full with WebGL as
headless Chromium gives it. Each script finds every phrase's text box with a `Range`, so each
number below is the phrase's own box in page pixels, not its element's. Each figure's position is
its box's bottom divided by the window's height: below 1.00 means it's in the first view. I took
screenshots at every size and looked at them.

## P1 to P17 on production

| Check | On production | Holds? |
|---|---|---|
| P1 particulars server-rendered, verbatim | Four rows, the plan's terms and phrases. With scripts off at 390, `dl[data-particulars]` and `p[data-crew-key]` are both in the HTML. | Yes |
| P2 the rule on fixtures | A data test, so it can't be read on production. Green in #100's CI. | Yes (CI) |
| P3 particulars in the first screen | 1440 × 900: y 408 to 531. 390 × 844: y 653 to 812. B1.1's items are inside at both sizes (contact links end at 866 resting and 874 live at 1440, and at 629 at 390). | Yes, at the pinned sizes |
| P4 clear of the hull | At 1440 they sit under the body plan, with no hull or shadow ink in their box (screenshots, light and dark). | Yes |
| P5 still, readable in every mode | CLS 0 at all 21 sizes measured. Print and forced colours weren't re-run here. | Yes (CI for print and forced colours) |
| P6 LCP stays the name | The `h1` at 1440 (1,196 ms cold, 372 ms warm). The bio's paragraph at 390 (300 ms), which P6 allows. | Yes |
| P7 inert, axe | axe (WCAG 2.2 AA tags) shows 0 violations at 1440 and 390, light and dark. | Yes |
| P8 the key | At 1440 × 900, y 797 to 817, the one line. At 390 it follows the rows (y 1,365), as its contract allows. Hidden from 1024 to 1439, by decision 9 of sprint 40. | Yes, as contracted |
| P9 `/crew` says "AI agent" | Seven times, "Lead, AI agent" to "Design, AI agent", while live. | Yes |
| P10 `/log`'s key is `/`'s | Same text. | Yes |
| P11 the goals rule | Retros 38 to 41: 62 to 69 characters, no code, no path. Production's fifth row is still "B4e: replay the last merged sprint on /crew…" (sprint 37). It ages out when sprint 42 merges, as long as 42's goal keeps the rule. | Yes, completes with sprint 42 |
| P12 `/crew`'s riders | Code checks, not re-run on production. | Yes (CI) |
| P13 the dot above the chip | Not re-measured. | Yes (CI) |
| P14 Work's sentences | `[data-sentence]` counts per entry are 3, 2, 2 and 1, the summaries' sentences. | Yes |
| P15 the card | 200, `image/png`, 1200 × 630. It shows the name in the condensed face, "VP Engineering at JPMorgan Chase." and the four particulars. Alt text: "Ruslan Shulga, VP Engineering at JPMorgan Chase." | Yes |
| P16 the text face's fallback | `body`'s computed font is `"Sofia Sans", "Sofia Sans Local", sans-serif`. | Yes |
| P17 the two gaps | Not re-measured. | Yes (CI) |

## What the first reader gets, measured

The pinned sizes first, then laptop and phone screens. "Links" is the bottom of the title block's
contact links.

| Window | Name (h1) | Particulars | Key | Links | Fold |
|---|---|---|---|---|---|
| 1440 × 900 | 567–657 | 408–531 | 797–817 | 866 / 874 | 900 |
| 390 × 844 | 372–426 | 653–812 | 1,365 (after rows) | 629 | 844 |
| 1920 × 1080 | in | 587–694 | 959–979 | 1,029 | 1,080 |
| 1536 × 864 | in | 458–564 | 830–849 | **907** | 864 |
| 1366 × 768 | in | 365–506 | hidden | **823** | 768 |
| 1280 × 800 (live) | 513–597 | 336–477 | hidden | **817** | 800 |
| 1280 × 720 | in | 336–477 | hidden | **817** | 720 |
| 1024 × 768 | 427–501 | **769–849** | hidden | 752 | 768 |
| 1180 × 820 | in | **799–879** | hidden | 782 | 820 |
| 430 × 932 | in | 682–823 | 1,393 | 658 | 932 |
| 375 × 667 | in | **666–825** | 1,584 | 642 | 667 |
| 360 × 640 | 352–406 | **656–815** | 1,557 | 632 | 640 |

The windows: each screen less a browser's toolbars and the system's bars. The heights are my
estimates of Chrome on macOS and Windows, Safari on an iPhone at load with its toolbar shown, and
Chrome on Android. None was measured on a real device.

| Window (from screen) | Name (h1) | Role | Particulars | Key | Links | Fold |
|---|---|---|---|---|---|---|
| 1920 × 950 (1920 × 1080, Windows 100%) | 730–819 | 867 | 587–694 | **959–979** | **1,013** | 950 |
| 1536 × 715 (1920 × 1080 at 125%, the commonest Windows laptop) | 600–689 | **737** | 458–564 | **830–849** | **907** | 715 |
| 1512 × 865 (MacBook Pro 14") | 592–681 | 729 | 449–556 | 822–841 | **899** | 865 |
| 1470 × 840 (MacBook Air 13.6") | 577–667 | 715 | 435–541 | 807–827 | **884** | 840 |
| 1440 × 790 (MacBook Air 13", 1440 × 900) | 567–657 | 705 | 408–531 | **797–817** | **874** | 790 |
| 1366 × 625 (1366 × 768) | **542–629** | **676** | 365–506 | hidden | **823** | 625 |
| 1280 × 680 (1280 × 800) | 513–597 | 644 | 336–477 | hidden | **817** | 680 |
| 1180 × 740 (iPad Air, landscape) | 479–559 | 606 | **799–879** | hidden | **782** | 740 |
| 1024 × 640 | 427–501 | 547 | **769–849** | hidden | **752** | 640 |
| 430 × 746 (iPhone Pro Max, Safari) | 399–454 | 492 | **682–823** | 1,393 | 658 | 746 |
| 412 × 780 (Pixel, Chrome) | 387–441 | 479 | **669–828** | 1,398 | 645 | 780 |
| 393 × 659 (iPhone 15 and 16, Safari) | 374–428 | 466 | **655–814** | 1,384 | 631 | 659 |
| 390 × 664 (iPhone 12 to 14, Safari) | 372–426 | 464 | **653–812** | 1,382 | 629 | 664 |
| 375 × 548 (iPhone SE, Safari) | 362–416 | 454 | **666–825** | 1,584 | **642** | 548 |

Bold marks what is below the fold or cut by it. Why it happens: from 1024 the drawing band's height
is a fixed share of the width (0.3381, `app/globals.css`, `.sheet-row`). It's 475 px at 1440 and 508
px at 1536, whatever the window's height, so a shorter window loses the title block, not the
drawing. Below 768 the drawing and the motion control fill y 50 to 345 before the name starts. Iris
recorded 1366 × 768, 1440 × 800 and 1536 × 864 as "already below the fold today" in sprint 34
(`.crew/sprint/34/notes-iris.md`, 1). No sprint has taken it up since, and no check pins a window
shorter than 768.

## What a visitor takes away

- **At 1440 × 900, the sizes the checks pin, the milestone works.** In five seconds: a ship drawn
  as a lines plan, "Ruslan Shulga", "VP Engineering, AI Platform", JPMorgan Chase, the four
  particulars (a team of 7, several thousand employees firm-wide, around 8 product teams, about
  55%), and "Every name is an AI agent Ruslan directs." He would stay. One reservation: the
  particulars are set at 13 px, the table's size. They're present but quiet beside a 90 px name,
  and whether they're read in five seconds is the comprehension test's question, which no one
  has run.
- **On a Windows laptop at 125% (1536 × 715), he'd likely leave or have to scroll.** The first
  window shows the drawing, four particulars with no subject, and "Ruslan Shulga" on the fold. No
  role, no employer in his own words, no contact. At 1366 × 625 the name itself is cut. An
  executive at a bank is the reader most likely to be on exactly this machine.
- **On a MacBook (1440 × 790), the owner's own kind of screen,** the name, the role and the bio
  show, but the key and the contact links don't. The owner's B3 and B4 demos will be judged on a
  window like this one.
- **On an iPhone in Safari (390 × 664),** the name, role, bio and contact show, but none of the
  particulars do. The first row, "Leads", starts 11 px under the fold. Nothing on that first screen
  says who built the site: the bio's sentence about AI agents is the revisions' caption, at y 901.
- **The card works.** It's legible at thumbnail size and says the role and the scale. It doesn't
  mention the crew, which is fine for a card.
- **The rows read plainly once sprint 42 merges.** Four of five are visitor sentences today, and
  the fifth (sprint 37's) ages out with this sprint, if sprint 42's goal keeps the rule.

## Also seen

- **The display face misses slow first visits, by design.** `display: optional`
  (`app/fonts.ts`) keeps CLS at 0 by painting the fitted fallback when the face isn't there for
  the first paint. I ran cold first visits to `/`, four at 1440 and four at 390 per network:
  - unthrottled: 2 of 8 painted the name in the fallback (Liberation Sans);
  - DevTools-like Fast 4G: 0 of 8;
  - Slow 4G: 8 of 8, the name and the text alike.

  Iris accepted this in sprint 22 ("honest, and no shift"). It's for her to weigh again, not a
  failure of this milestone: on slow lines a first-time visitor never sees the signature face.
- **A led-out "42" sits on the Base line at 1440** (the live pencil on seat 5.0, light and dark,
  1366 to 1536 too). This is sprint 41's follow-up for Iris and Pixel, now visible on production.
  Once sprint 42 merges, the seated plank keeps that seat.

## The left-opens under Pa, Pb and Pc, checked against the code on 2026-11-01

| Left open | Status |
|---|---|
| Pa: from 1024 to 1279 the particulars are below the fold (Iris) | Open, measured above (1024 × 768: 769–849). Taken into the next milestone (Wc). |
| Pa, Pb: P3's, P8's and P9's default-server passes under `PLAYWRIGHT_BASE_URL` (Probe) | Open. `particulars.spec.ts:414` and `plain-words.spec.ts:369, 457, 691, 853` still skip the whole describe under `PLAYWRIGHT_BASE_URL`. |
| Pb: the key is hidden from 1024 to 1439 (Iris) | Open (hidden at 1024, 1180, 1280 and 1366). Taken into the next milestone (Wc). |
| Pb: the 3D label over the copper dot (Pixel) | Open. Not re-measured; rides with Wb, which touches the narrow drawing. |
| Pc: the 404's first visit paints in the fallback face (Forge) | Open. `app/not-found.tsx:13` keeps the display face off the 404 on purpose, and the text face has no preload there. |
| Pc: Lens's two nits on #100 (Forge) | Both open. `lib/card.ts:13` still says the fonts are "Read at build only" though `/log/[n]` renders on request. `app/opengraph-image.tsx:70` draws the table's head rule even when `card.rows` is empty. |
| Pc: the card drawn as a sheet (Iris) | Open, not in any plan. |
| Pc: Detail A's dark-scheme boxes on a real phone | Open: needs a real phone. |
| Sprint 41: the led-out 5.0 number (Iris, Pixel) | Open, now visible (above). Rides with Wa, which touches the drawing. |
| Waiting for a PR the owner reviews anyway: the legend's "Original", the commit-hash link (C5.3), the unknown record's scripts-off 404 | Open. `components/plank-key.tsx:39` still prints "Original". |
| `/` and `/crew`'s dev-only instant-navigation message (B4b) | Not taken: no `export const instant` in `app/`. I didn't run a dev server to see whether the message still shows. |

## Not verified

- Real devices. The window heights are estimates, and the cloud has no phone or GPU.
- The owner's optional five-second test, which nobody has run.
- Print, forced colours, P12, P13 and P17 on production (CI covers them).
- The hull's look under a real GPU: headless Chromium draws WebGL in software.
