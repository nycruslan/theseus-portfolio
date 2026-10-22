# Sprint 23 contract: B2, the facts and `/read`

Quill, 2026-10-22. Milestone B2 of the redesign (`ROADMAP.md`), on the approved direction
(`.crew/sprint/17/direction-iris.md`) and its frames `work-1440.webp`, `work-390.webp`,
`read-1440.webp` and `read-390.webp` in `.crew/sprint/17/design/`. One PR, `sprint/23-the-facts`, from
`main` at 7b4b48b. The frames draw the Full state, with Crew and the motion control in the bar. Those
are B4 and B3, so they are not built here.

## Outcome

A hiring executive who scrolls past the sheet reads the record as a drawing's schedule. Each section
has a big condensed head on the left and its entries on the right. Each entry shows its dates in the
left column and its company in large type. Under the JPMorgan summary, Detail A draws the gateway
from the summary's own words. Projects are rows, not cards. **Read as page** in the bar opens
`/read`. That is the same record as one plain, printable column, with the ship's drawing at the
foot, and it reads with scripts off. A mistyped address gets a page in the site's own style with a
way back. Nothing on either route moves.

## The calls I made

- **Atlas's calls 1 to 6 stand.** One PR. No motion and no view transition. `/read` has its own
  header strip, not the bar. The same ids on both routes. Detail A uses the summary's own words. The
  not-found page is styled. I have one correction, to call 4. `/read` has no Contact section (the
  frame puts the links in its title block), so there `#contact` is the title block's list of links.
- **Print stays, as a real control.** `read-1440.webp` draws it, and a hiring executive who wants
  a PDF for a colleague is exactly who opens `/read`. It is a `<button>` that only exists when
  scripts run, and it calls `window.print()`. With scripts off, nothing is rendered in its place. Its
  slot is reserved, so it appears without moving anything (CLS 0). Its cost is held to the script
  budget below. If Forge can't meet that budget, Print is left out and the PR says so. Keyboard
  print (Ctrl or Cmd+P) and the print stylesheet work either way.
- **Detail A is on `/` only.** `read-1440.webp` has none, and on the plain page the summary
  sentence already carries every word in it. If the summary stops holding any of the five phrases,
  Detail A isn't drawn at all, so it can never show words the owner no longer stands behind.
- **Read as page is in the bar at every width.** `work-390.webp` has no room for it, but a
  link that only some widths show would be a different site on a phone. Iris lays out the five
  items at 320 to 1023 px. B1.1, which stays unedited, keeps the phone's first screen honest
  however she does it.
- **A project's link is labelled from the owner's own links.** The frame's "GitHub" and
  "ruslanshulga.com" are the labels of the `profile.links` entries on the same host (data rules).
  Its accessible name adds the project's name, so a screen reader's links list doesn't show three
  "GitHub" links that go to two places.
- **Both routes print as ink on paper, in either scheme.** A visitor in dark mode who prints today
  gets light text on white paper. `/read` is the page made for printing, so this is the time to fix
  it.
- **The not-found page is one decision: go back.** It has a heading, one line and two links ("Back
  to the ship" to `/`, then "Read as page"). It doesn't get the bar: the bar's `#work` and `#contact`
  only mean something on `/`.

## Data rules (the pages and Probe's oracle implement these word for word)

All text comes from `content/profile.ts`, imported, never copied. It is shown verbatim, including
the en dash in the JPMorgan title. The frames draw an em dash there; that's a drawing slip. Separators
the page adds are " · " and ", " only.

- **`/` facts, after the revision block, in this order.** Each is a `section[aria-labelledby]`, and
  its h2 carries the id.
  - **Work (`#work`).** One list. One `li` per `profile.experience` role, in content order. Its
    `h3` is `company`. The `li` also holds `title`, `period` and `summary`.
  - **Projects (`#projects`).** One list. One `li` per project. Its `h3` is `name`, and `description`
    follows. A project with an `href` has exactly one link, to `href`. A project without one has no
    link.
  - **Stack (`#stack`).** One list, one `li` per tool, in order (as today).
  - **Education (`#education`).** One list. One `li` per entry. Its `h3` is `school`. The `li`
    also holds `credential` and `period`.
  - **Contact (`#contact`).** The three `profile.links`, in order.
  - In every `li`, the `h3` comes first in the DOM, whatever CSS puts in the left column.
- **A project link's label.** It is the label of the `profile.links` entry whose URL has the same
  host as the project's `href`. If no entry matches, it is that host without "www.". Today that gives
  Theseus → "GitHub" and ruslanshulga.com → "ruslanshulga.com". The link's accessible name is the
  project's name, then the label (for example `aria-labelledby` on the h3 and the link).
- **Detail A.**
  - It is drawn only from the `profile.experience` role whose `company` is "JPMorgan Chase & Co.".
    It is a `<figure>` inside that `li`, after the summary.
  - It has five labels, in reading order: "Around 8 product teams", "Model-agnostic AI gateway",
    "AWS Bedrock", "Azure OpenAI", "Anthropic API". Each one occurs in that role's `summary`, either
    as is or with its first letter lower-cased.
  - If any label doesn't occur, there is no figure.
  - The `<figcaption>` begins "Detail A." Iris sets the rest of it.
  - The connectors are `aria-hidden`.
- **`/read`, in order.**
  - First a `<header>` strip, outside `main`. It holds "Back to the ship" → `/`, then the text
    `theseus-portfolio.vercel.app/read` (the host of `SITE_URL` plus `/read`), then Print (scripts
    only).
  - `main#main[tabindex="-1"]` holds a `main > header` with the following:
    - the `h1` `name`;
    - `headline` · `location`;
    - the whole `bio` as one paragraph;
    - an element `#contact` holding the three `profile.links` (label and href).
  - The h2s follow, with ids and texts in this order:
    - `work` "Work": each role's `h3` `company`, then `title` · `period`, then `summary`.
    - `projects` "Projects": each `h3` is `name`, linked to `href` when there is one, then
      `description`.
    - `stack` "Stack": one paragraph, `profile.stack.join(", ")`.
    - `education` "Education": each `h3` `school`, then `credential` · `period`.
    - `ship` "The ship": the one `[data-plan]` drawing, then the count line exactly as `/` shows it
      ("22 planks: R replaced, O original"), the legend's two states as on `/`, and a link to
      `/sprints` (the Log).
  - `/read` has no revision block, no Detail A, no JSON-LD (the Person stays on `/` alone) and no
    bar.
- **The bar on `/`.** It holds the wordmark (plain text), then in its `<nav>`: Work → `#work`,
  Log → `/sprints`, Contact → `#contact`, **Read as page → `/read`**, and nothing else.
- **The not-found page.** It is `app/not-found.tsx`. It has a `main#main` holding an `h1` "Page not
  found" and one line of Iris's copy. Its links are "Back to the ship" → `/`, then "Read as page" →
  `/read`. Its title isn't the home page's.

## Checks

Each check is shown in a browser against the preview, or by `pnpm test:e2e` (Probe's specs). The
owner judges B2.1 to B2.4 first.

**B2.1 The facts read as a schedule on `/`.**
- From 1024 px:
  - each section's h2 sits left of its list (the h2's right edge is left of the list's left edge);
  - in Work and Education, each `li`'s period sits left of its `h3`, and its top is within the
    `h3`'s first line box.
- Below 1024 px, the h2 is above its list, and each period is above its `h3`.
- No project row draws a box: there is no border on its left or right, and no background but
  transparent.
- The facts follow the data rules, and B1.7 and profile-sections C1 to C8 stay green unedited.
- Shown by screenshots at 390, 1024 and 1440 beside `work-*.webp`, and Probe's rects.

**B2.2 Detail A.**
- It meets the data rules (Probe's oracle checks the five labels against the summary).
- Its words are real text, in the HTML response, and the same with scripts off.
- It has no link, button or `[tabindex]` inside.
- It is wholly inside its column at 320, 390 and 1440, with no page overflow.
- Its text sizes are step tokens and its colours are tokens.
- Each label is at least 4.5:1 on its own ground, in both schemes.
- In forced colours, every box has a border that differs from Canvas, and its text is CanvasText.
- It is visible under print media.
- A unit check on fixtures: a summary missing any phrase yields no figure.
- It is absent from `/read`.

**B2.3 The bar gains Read as page.**
- B1.3 is rewritten. The nav's links are exactly those in the data rules, in order.
- At 320, 390 and 1440, every bar link is at least 24 × 24 px and nothing in the bar passes the
  viewport.
- At 1440, Read as page is the right-most item, as in `work-1440.webp`.
- Following it lands on `/read` with the `h1` `name`.
- With any fact section or Detail A scrolled under the bar at 1024, and hovered, the element at
  every bar link's centre is in the bar, and each link still lands (the sprint 22 z-index hazard,
  generalised).
- On `/`, the Contact section's first link is the 12th Tab stop: skip, 4 bar links, 3 title-block
  links, the Log link, 2 project links, then it. That is `tabUntil`'s bound. A further stop before
  it means Probe raises the bound and reports it; that is a harness change, not a weaker test.

**B2.4 `/read` is the plain page.**
- It returns 200, with the same facts with scripts on and off.
- The skip link is the first link and lands on `main`.
- Its structure is exactly the data rules': text compared with `content/profile.ts` imports. One
  `h1`, and no skipped heading level.
- `/read#work`, `#projects`, `#stack`, `#education` and `#contact` each land with the target's
  top inside the viewport, at 390 and 1440.
- At 1440 it is one column, as `read-1440.webp` shows (Iris sets the width).
- Shown by screenshots at 390 and 1440 beside `read-*.webp`.

**B2.5 The ship on `/read`.**
- There is one `[data-plan]`, from the same component as `/`. It is `aria-hidden`, in the HTML
  response, and the same with scripts off.
- Exactly 22 planks are rendered, and their `data-plank` → `data-sprint` map equals `/`'s.
- At 320, 390 and 1440, every plank's box is inside the viewport.
- The lettering is at least 11 px. A plank number is at least 4.5:1 on its plank in both schemes,
  or it is placed by a leader as in sprint 22's decision 5.
- Nothing in the drawing is hit or focused.
- Its outerHTML is at most 32,768 B.
- The count line and the legend match `/`'s text, and the Log link goes to `/sprints`.

**B2.6 The strip and Print.**
- The strip is a `<header>` before `main`, holding the data rules' items and nothing else.
- With scripts off:
  - no Print element is rendered;
  - there's no button on the page.
- With scripts on:
  - Print is a `<button>` named "Print", at least 24 × 24 px at 390;
  - clicking it calls `window.print` once (Probe stubs it).
- CLS is 0 over load plus 2 s at 390, 1024 and 1440, with Print appearing.
- The Tab order is skip, Back to the ship, Print, then `main`.

**B2.7 It prints as a document.**
- Under print media, with the light scheme and with the dark scheme emulated, on `/read` and `/`:
  - body text is at least 7:1 against white;
  - every fact and the drawing are visible;
  - the strip's link and Print, and the bar, are not displayed;
  - the strip's address is displayed.
- Each fact entry on `/read` has `break-inside: avoid`.
- Probe reports the PDF page count of `/read` (Letter and A4). It isn't gated; I judge it at the
  demo.

**B2.8 The not-found page.**
- `/no-such-page` returns 404. It has no canonical link and no og:url (smoke, unedited), and it has
  `robots` `noindex` (Next adds it).
- Its title differs from `/`'s.
- It meets the data rules. "Back to the ship" goes to `/` and lands there.
- It reads the same with scripts off.

**B2.9 The site's invariants hold on `/read` and the 404.**
- Each check below holds on both routes, in both schemes:
  - every text colour and size is a token, and body text is at least 16 px;
  - axe is clean at 390 and 1440, with and without the skip link showing;
  - the first paint has the scheme's background without JS;
  - nothing overflows at 320;
  - every link and button is at least 24 × 24 px at 390;
  - there is one `main`, its sections are named regions, and no heading level is skipped;
  - B1.6 holds: nothing is `--accent` at rest, hovered or focused, links are ink and underlined
    (except the bar's nav), and the ring is 2 px of ink, 2 px out;
  - `document.getAnimations()` is empty at load, 2 s later, and after scrolling to the bottom and
    back;
  - in forced colours, a focused link shows exactly one ring;
  - no TODO(owner) value renders.
- On `/`, the 24 px rule now covers the project links (no card exemption).
- Riders, on both routes:
  - in forced colours, an original plank and its legend swatch fill differently from a seated
    plank and its swatch, and both differ from Canvas in border or fill;
  - the folded revision table's labels still show at 390.

**B2.10 LCP, fonts and script.**
- On `/read`, the LCP element is in `main > header`, is text, and lands within 2,500 ms at 4× CPU,
  at 390 × 844, 1024 × 768 and 1440 × 900 (B1.9's harness). The 1.5 s target is reported.
- `/read` loads exactly two woff2, at most 86,016 B together, with the display face preloaded.
- B1.10 stays unedited, so the condensed face is declared once in `app/`, in a module both pages
  import.
- Script bytes, as the sum of the bodies of every script file the route requests, compared with
  `/sprints`':
  - `/` and the 404 within 2,048 B;
  - `/read` within 2,048 B, Print included.
- This check is new. B1 set this budget, but no spec measures it.

**B2.11 `/read` is findable and shareable.**
- Its canonical and og:url are `https://theseus-portfolio.vercel.app/read`.
- It has one og:image and one twitter:image, each served as `image/png`.
- Its description is set.
- The sitemap lists `/read`, and robots.txt doesn't disallow it.

## Budgets that apply to B2

| Measure | B2 budget | Ground |
|---|---|---|
| LCP | ≤ 2,500 ms at 4× CPU, text in `main > header`, on `/` and `/read` (1.5 s reported) | direction; B1.9's harness |
| CLS | 0 over load + 2 s, fonts and Print included | direction; B1.8 |
| INP | not gated: Print's only handler opens the system dialog | — |
| JS to read the facts | 0 KB on every route; script bytes within 2,048 B of `/sprints'` on `/`, `/read` and the 404 | direction; B1's budget, now with a check |
| Fonts | 2 latin woff2, ≤ 86,016 B, display face preloaded, on `/` and `/read` | B1.10, measured in sprint 22 (80,892 B) |
| Drawing | `[data-plan]` outerHTML ≤ 32,768 B on `/read` as on `/` | B1's C6 |
| Detail A | outerHTML ≤ 4,096 B | my estimate: five labels, three connectors and a caption come to about 1.5 KB; this leaves room for SVG connectors, not for a drawing library |
| Print | page count reported, not gated | no measurement yet; I judge it at the demo |
| 3D, draws, frame time, loft | not B2 (B3) | — |

## Riders

| Rider | Disposition |
|---|---|
| Forced colours: original planks and their swatch fill `GrayText` (Lens nit, PR #62) | **Rides,** checked in B2.9 on both routes |
| The folded revision table: a plain `content: attr(data-label)` before the alt-text form (Lens nit, PR #62) | **Rides.** Lens reads the CSS, and B2.9 checks that the labels still show at 390. WebKit's handling of the table under `display: block` and grid is checked only if a WebKit browser is in reach; otherwise it is reported unverified |
| `app/opengraph-image.tsx`'s Geist comment | **Rides** (one line) |
| B1.1's contact below the fold when a goal wraps to three lines | **Doesn't ride:** B2 doesn't touch the revision block at 1440. But this PR's own retro becomes row 1 in its CI run, so Atlas keeps sprint 23's goal to two lines in the Description column, or B1.1 goes red |
| The social card's typeface, and the favicon's copper mark | **Follow-ups,** unless Iris says they're cheap. The card also draws a copper bar, which is copper on something that isn't live |
| `/sprints` grouping past about 30 entries; the bar on the log | B5 |

## Check disposition

There are 93 tests in `e2e/*.spec.ts`, counted by `test(` title, with a per-scheme or per-route
template counted once. **80 keep, 12 rewrite, 1 retire.**
- A rewrite keeps every assertion it had, on the new object or on more routes.
- The retirement needs the owner's approval in this PR (batch D).

| File | Test | Disposition | Reason |
|---|---|---|---|
| cards.spec.ts | one card per project | rewrite | Same row, h3, CSS-content, aria-hidden svg, one-link, href and name-contains-project assertions. The visible text now ends with the link's label |
| cards.spec.ts | the whole of a linked card is its link | **retire (D)** | Projects are rows with one small link, as the frames draw them. B2.9 now holds that link to 24 × 24 px, and B2.3 holds the bar above any hovered row |
| cards.spec.ts | tokens in both schemes; reduced motion and hover move nothing; reflow at 320 and 390 | keep | They select `section[aria-labelledby="projects"] li`, which the rows still are |
| content.spec.ts | no TODO(owner) value renders | rewrite | Adds `/read` and the 404 |
| invariants.spec.ts | tokens on :root; contrast (per scheme); address bar; palette vs site.ts and icon; light vs dark; fluid scale; no color literal | keep | These hold on the tokens, whatever the route. If Detail A needs a new token, the literal check's declaration allowance gains it, which makes that one a rewrite |
| invariants.spec.ts | text from tokens; axe; no-JS background (per scheme); 320 overflow; landmarks and headings | rewrite | The same assertions on `/`, `/read` and the 404 (B2.9) |
| invariants.spec.ts | links of at least 24 px | rewrite | Stricter: the card exemption goes, and it adds the routes |
| keyboard.spec.ts | skip link first; skip lands on main (404 included); Tab order and rings; forced-colours one ring | keep | Contact's first link is the 12th stop, within the bound (B2.3). `cardLink` still finds each project's one link |
| keyboard.spec.ts | a card shows keyboard focus as it shows hover | rewrite | It hovers the project link, not the row. Focus still differs from rest, and hover still differs from rest |
| plan.spec.ts | B1.4, B1.8, B1.9, C6, C9 | keep | `/` is unchanged above the facts. B2.5 and B2.10 apply them to `/read`, as a new test or by adding the route |
| profile-sections.spec.ts | C1 to C6, C8 | keep | The h2 ids, the lists and the `h3`s are held by the data rules |
| sheet.spec.ts | B1.1, B1.2, B1.5 (both), B1.7, B1.10, B1.11 | keep | B1.1 constrains the bar's phone layout, and B1.10 the font module |
| sheet.spec.ts | B1.3 the labelled bar | rewrite | Adds Read as page → `/read` and the landing on `/read` |
| sheet.spec.ts | B1.3 the bar stays above a hovered card | rewrite | The rows don't reach under the bar's links at 1024, so its precondition can't hold. The same hit and landing assertions run with each fact and Detail A under the bar (B2.3) |
| sheet.spec.ts | B1.6 nothing is copper (per scheme and route) | rewrite | The routes gain `/read` and the 404 |
| smoke.spec.ts | all 4 | keep | "a missing page doesn't claim to be the home page" unedited |
| sprints-entry.spec.ts | all 3 | keep | |
| sprints.spec.ts | all 40 | keep | `/sprints` is untouched. C2.2 checks the sitemap with `arrayContaining` |

**For the owner to approve:**
- **(D)** "the whole of a linked card is its link" retires.

## Out of scope

- **B3:** the 3D model, the loft, the Full/Calm/Off control.
- **B4:** `/crew`, the Crew link, the live layer and copper.
- **B5:** `/log`, the ghost hull, the bar on the log, and the Date column.
- **Also out:**
  - the view transition between `/` and `/read`;
  - the social card's restyle and the favicon (riders above);
  - any change to `content/`.

## Needs owner decision

1. **Approve batch D.** Without it, `/` keeps cards that the frames don't draw.
2. **For the demo, not blocking:**
   - Print is kept as a scripts-only control.
   - Read as page shows at every width, though `work-390.webp` leaves it out.
   - Detail A is on `/` only.
   - Say so if you'd rather have any of these otherwise.

## Needs decision (Iris)

1. **The bar with five items at 320 to 1023 px.** `work-390.webp` draws four. B1.1 at 390 and
   B2.3's 320 checks are the limits.
2. **A step token for every size the facts use.** The frames use h2 72, company 36, education 30
   and 26, contact 52 and 38, the date column 14, and Detail A's labels and caption. The
   invariants accept only step tokens. A new step is named here, and Probe adds it to `STEP_TOKENS`.
3. **Detail A at 320 and 390:**
   - whether the three provider boxes sit in a row at 288 px;
   - the caption's wording after "Detail A.";
   - its forced-colours and print look;
   - the gateway box's inverted fill in the dark scheme.
4. **`/read`:**
   - the column width and measure;
   - which view of the drawing it shows (the frame shows profile and half-breadth plan at 1440),
     and whether that view shows plank numbers;
   - whether the strip sticks;
   - Print's box, and its reserved slot;
   - the count line's sentence with the Log link.
5. **Project rows below 1024 px.** The frame puts the link under the description.
6. **The not-found page's look and its one line of copy.** The heading is "Page not found".
7. **The print stylesheet.** Which tokens go to ink on paper, and the address line's look.
8. **The forced-colours rider's values:** `GrayText`, or another system colour.
9. **Whether the social card's typeface and the favicon are cheap enough to ride.**
