# Sprint 23: B2, the facts and `/read`

**Goal (from the roadmap):** the facts below the sheet are laid out as the approved frames show,
with Detail A; "Read as page" opens `/read`, the same record as one plain, printable column with
the ship's drawing at its foot; and a mistyped address gets a page in the site's style.

**Size:** M.
- Contract: `.crew/sprint/23/contract.md` (Quill), with one amendment (decision 7 below).
- Build notes: `.crew/sprint/23/notes-iris.md` (Iris).
- Decisions: `.crew/sprint/23/decisions.md` (Atlas).
- Iris's review: `.crew/sprint/23/review-iris.md`. **Verdict: ship, 8.5/10**, better than production
  at every width and in both schemes, no musts.

## What a visitor sees

Below the sheet, the record reads as a drawing's schedule: a big condensed head on the left of each
section, the entries on the right, each role's dates in their own column and its company in large
type, and the heads in line with the wordmark. Under the JPMorgan summary, Detail A draws the
gateway from the summary's own words, as real text. Projects are rows with one small link, labelled
from the owner's own links ("GitHub", "ruslanshulga.com"). Contact is three display links. The bar
gains **Read as page**, which opens `/read`: the same record as one plain column, with a header
strip (Back to the ship, the address, Print), the ship's drawing at its foot with the count line
and legend from `/`, and a link to the Log. It reads with scripts off and prints as ink on white in
either scheme, three Letter pages. A mistyped address gets "Page not found" in the site's style
with two ways on. Nothing on any route moves. The favicon and the share card's bar are ink now, so
copper means "live now" and nothing else.

## Results

The suite is 141 of 141 (`pnpm test:e2e`, CI `check` on cfcef9e and this head). Probe's checks
went on the branch first (899c558): 34 red on today's page, 107 green. All of B2.1 to B2.11 are
tests in `e2e/facts.spec.ts`, `e2e/read.spec.ts`, `e2e/not-found.spec.ts` and the rewritten
specs; B2.2's rule is unit-checked on 12 fixtures through `lib/detail-a.ts`.

| Check | Result |
|---|---|
| B2.1 schedule | h2 left of its list from 1024, periods left of their h3 and inside its first line; stacked below; rows draw no box; h2s at 40 px like the wordmark, lists end at 1,400 like Read as page |
| B2.2 Detail A | 1,017 B (budget 4,096), five labels from the summary, no focusables, in column at 320/390/1440, 4.5:1 in both schemes, forced colours and print |
| B2.3 the bar | Work, Log, Contact, Read as page; fits at 320/390/1440 on one row; above every hovered fact section and Detail A at 1024; Contact's first link is the 12th Tab stop |
| B2.4 `/read` | 200, the data rules' structure with scripts on and off, fragments land at 390 and 1440, one 760 px column |
| B2.5 the ship | one `[data-plan]`, 22 planks with `/`'s map, 10,004 B (budget 32,768), 11 px numbers from 768, nothing hit or focused |
| B2.6 strip and Print | Print only with scripts, `window.print` called once, CLS 0 at three sizes, Tab order skip, Back, Print, main |
| B2.7 print | ink on white in both schemes on both routes; entries keep together; `/read` is 3 Letter pages, 3 A4 |
| B2.8 the 404 | 404, noindex, its own title, the two links, the same with scripts off |
| B2.9 invariants | tokens, axe 0, no-JS paint, 320 overflow, 24 px targets (project links included), landmarks, `getAnimations()` 0, one ring in forced colours, on `/`, `/read` and the 404 |
| B2.10 budgets | LCP on `/read` 172 to 316 ms at 4× CPU (text, the JPMorgan summary); two woff2, 80,856 B, display face preloaded; script bytes `/` and the 404 equal to `/sprints` (458,689 B), `/read` +732 B for Print (budget +2,048) |
| B2.11 findable | canonical and og:url `/read`, one og and one twitter image as PNG, description, sitemap, robots |

Riders done: forced-colours fills for original planks and swatches (GrayText), the folded revision
table's plain `content` first, the Geist comment in the share card, the favicon and the card's bar
in ink.

Screenshots (in `.crew/screenshots/sprint-23/` and the reviewers' scratchpads, out of git): `/`
from Work down at 390, 1024 and 1440 in both schemes beside `work-*.webp`; `/read` at 390, 1024
and 1440 beside `read-*.webp`, with scripts off, and its PDFs; the 404 at three widths; forced
colours and print.

## Decisions

In `.crew/sprint/23/decisions.md`. The ones a reader needs:
- **The contract's B2.10 is amended** for `/read`: the LCP element is text in `main` outside the
  drawing, within 2,500 ms, rather than in `main > header`. As the frame lays the page out, the
  JPMorgan summary is the largest first-screen text at every size (about 90 words at the same
  measure as the bio's 40). On `/`, B1.9 keeps `main > header`.
- The strip's address is in the DOM at every width, shown from 1024 and under print, hidden on
  phones (the frame omits it there, and it doesn't fit beside Back and Print).
- The 404's heading uses the text face: importing the condensed face in the root not-found would
  ship and preload it on `/sprints` too. Iris accepted it and set its size.
- The facts span the sheet's frame (16 px in from 1024), not the viewport, so the heads align with
  the sheet's text edge.

## Needs owner decision

1. **Approve batch D:** `cards.spec.ts` "the whole of a linked card is its link" retires, because
   projects are rows with one small link, as the frames draw them. B2.9 holds that link to 24 × 24
   px and B2.3 holds the bar above any hovered row.
2. **For the demo, not blocking:** Print on `/read` is a control that exists only when scripts run;
   Read as page shows at every width; Detail A is on `/` only; the strip's address shows from
   1024 and in print. Say so if you'd rather have any of these otherwise.

## Follow-ups

- Next 16.4.0 carries a known security advisory, by Next's own build notice. The upgrade is the
  next S sprint, after this merges.
- The 404 paints in the fallback face on a first visit (no font preload on the prerendered 404;
  true before B2).
- Iris's cheap changes (dark Detail A boxes, the project link's gap below 1024, the figcaption's
  gap at 390), the social card's typeface, and B4's fifth bar link, which won't fit the phone row
  at 16 px.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015tLt3puxdQbc9KTsErx8AV
