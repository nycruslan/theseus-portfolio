# Sprint 12 direction: the build log ("Watch the team build")

Iris, step 1. I checked it against the running build of this branch (`pnpm build`, `next start -p 3341`).
Production is unreachable from the sandbox, and this branch's product code is `main` at e8be1af,
so the build stands in for it. I prototyped the page by injecting DOM and CSS into that build with
Playwright, rendering all eleven retros as they are on `main`, at 1440, 1024, 390 and 320 in both
schemes. Every number below was measured there. No product file was touched.

## The position

This is a **ship's log, ruled like a ledger**: one page, one column, and the sprint numbers stand
in the margin the way station numbers are painted along a hull. It speaks the home page's language
exactly: the same column, h1, section label, Experience-shaped entries and copper links. Two
things are new, and both are things the site already does: a number hung into the gutter (the
planks and the hull already hang 32 px past the column), and the 3 px drawn dot (the Stack's
separator) used as the list mark. It is a page to read, not a dashboard to monitor. The content
that sets it apart is that the team publishes what went wrong every time, so that is shown in
full and never hidden behind a control.

Mode: Read. The visitor wants to understand how the site gets built.

## 1. Where it lives and how a visitor reaches it

1.1 **Its own route, `/sprints`.** Not a section of `/`. Here's why:
- `/` is the owner's page for recruiters. The goals and failures are written for the team ("C10-C16
  rewritten", "Iris's sprint 6 item 2", "failIfMajorPerformanceCaveat").
- The log grows by up to six entries a day, and in the prototype eleven entries already make a page
  5471 px tall at 1440 and 7657 px at 320.
- On `/` it would push Contact further down every day.

1.2 **One way in, from `/`: a line that ends the header, directly under the bio.** The bio is the
owner's text, and it ends "This site is where a team of AI agents shows what it can ship on its own."
That claim is where a visitor wants proof, so the link sits right after it:
- `header > p:last-child`, `text-step-base`, inside the existing `header` (`flex flex-col gap-4`),
  after the bio `p`.
- Its content is an `a href="/sprints"` with the text **`Build log`**, using exactly the Contact
  link's classes (`inline-block text-accent underline underline-offset-4 hover:text-foreground`).
  After it comes a `span.text-muted` with `&nbsp;· {n} sprints`, where n is the number of entries
  `/sprints` renders (11 on `main` today). The separator is a no-break space before the dot, so the
  dot never starts a line (sprint 1's lesson).
- In the prototype (`home-link-1440-light.png` and `home-link-390-light.png` in my scratchpad), this
  is the first copper on the page, and it sits right above the hull's one copper plank. The new
  plank and the log of planks fitted read as a pair. That pairing is the reason it goes here and
  not in a footer.
- Nothing else on `/` changes. The Theseus project card keeps its href, which is the owner's content.

1.3 **The way back from `/sprints`**: the header's first child is `p.text-step-base` holding
`a href="/"`, with `profile.name` as its text and the same link classes as 1.2.

## 2. The page

The skeleton is `app/page.tsx`'s, element for element:
- the `SkipLink`;
- the `@container` wrapper;
- `main#main` with `tabIndex={-1}` and the same classes (`mx-auto flex w-full max-w-2xl flex-col gap-16 px-6 py-24`).

There's no hero model on this page.

2.1 `header.flex.flex-col.gap-4` contains, in order:
- the back link (1.3);
- `h1.text-step-2xl.font-semibold.tracking-tight` reading **`Build log`** (the home h1's classes, so
  both pages open the same way);
- one lede, `p.text-step-lg.text-pretty`. Proposed text, which is team copy, not owner facts (see
  Needs decision): "A team of AI agents rebuilds this site one sprint at a time. Each entry comes
  from that sprint's retro: what it set out to do, its pull request, and what went wrong. Owner's
  call marks a sprint the team handed to the owner to decide."

2.2 There is one section, `<Section id="sprints" title="Sprints">` (the existing component). Its h2
keeps the page's uppercase label and the sprint 5 rise, unchanged.

2.3 Inside it is one `ol.flex.flex-col.gap-8`, one `li` per sprint. **Newest first**, sorted by the
retro's numeric `sprint` field descending. Don't sort by folder name, which puts 9 before 11 and 10
before 2. On `main` the order is 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1.

## 3. One entry

The structure follows the Experience entry: h3 title, a muted meta line straight under it, then the
body with a small gap. These are the classes, in order:

```
li.border-t.border-rule.pt-6
  h3.relative.text-balance.text-step-lg.font-medium.break-words
    span.mr-[0.5ch].tabular-nums.text-muted
        .md:absolute.md:top-0.md:right-full.md:mr-4
      span.sr-only "Sprint "
      "11"
    "{goal}"
  p.text-step-sm.leading-6.text-muted          (the meta line)
    "Small sprint" &nbsp;· "Owner's call" &nbsp;· a "Pull request #36"
  div.mt-4                                       (only when there is something that went wrong)
    h4.text-step-sm.font-medium.text-muted "What went wrong"
    ul.mt-1.flex.flex-col.gap-2
      li.relative.text-pretty.text-step-base.break-words  + the drawn dot (3.6)
```

3.1 **The number.** Below `md` it sits inline before the goal, muted, with half an `ch` of space,
and the goal wraps under it. From `md` (768 px) it hangs in the gutter: its right edge is **16 px**
left of the column's text edge, and it sits on the h3's first line in the same step, so the two share
a baseline. Every number right-aligns on that edge, so 9 and 11 line up by their last digit.
Measured: at 1440 the number spans x 363 to 392 and the text starts at 408; at 1024, x 157 to 184
and 200. At 768 a three-digit number (about 38 px wide at 21 px) still clears the viewport edge by about 18 px. The `sr-only`
prefix makes the heading read "Sprint 11 Stack separators…".

3.2 **The goal** is the retro's `goal`, word for word, except for these presentation changes:
- a leading `Roadmap item:` or `Roadmap item N:` is removed (it's process, not the goal), and the
  first letter is then capitalised;
- backtick characters are dropped wherever they appear in team text (goal and items). There's no
  code font: this page uses Geist and nothing else.

On `main` that gives these headings:
- sprint 1 is "Design tokens (5 colors, 5 fluid type steps in app/globals.css, used across the page)";
- sprint 8 is "The subtle 3D hero, Part A of the sprint 7 contract (static SVG lift half-model, C1-C9)";
- sprint 11 is unchanged.

3.3 **The meta line** is `p.text-step-sm.leading-6.text-muted`. It takes up to three items, in this
order, joined by `&nbsp;· `. Each item is left out when its field is missing, and so is the whole `p`
when all three are.
- **Size**: `S`, `M` or `L` becomes **"Small sprint"**, **"Medium sprint"** or **"Large sprint"**,
  as words in the line and never as a letter in a pill.
- **"Owner's call"** shows when the retro's `outcome` contains `needs-owner`, or starts with
  `not merged` or `open`. On `main` that is sprints **10, 9, 7, 2 and 1**, and no others.
- **The PR link**: `a` with the text **"Pull request #N"**, linking to
  `https://github.com/nycruslan/theseus-portfolio/pull/N`, with the 1.2 link classes. `leading-6`
  gives the meta line a 24 px line box, so this inline-block link measures **24 px tall**, which
  meets WCAG 2.2's minimum target size. Measured 98–100 × 24 at every width.

No status word like "Merged". Here's why: a retro's `outcome` is written at close-out, before
the merge, so it is the state *then*. Sprints 1 and 2 say "not merged", but #9 and #12 are on `main`
(46ed7ee and a467de5). Printing the outcome would publish things that are false. A retro only reaches
`main` through its own sprint PR's squash merge, so on production every entry *is* merged, and what's
worth telling apart is who decided. That's what "Owner's call" says, and it is true at close-out and
after. The raw `outcome` text never renders.

3.4 **What went wrong: all of it, but only the `what`.**
- Every `what` in `wentWrong` or `went_wrong` renders, in full and in the retro's order. There's no
  truncation, no ellipsis, no disclosure and no "show more".
- At most **3** items render. Every retro on `main` has 3 or fewer (sprint 11 has 2). If a future
  retro has more, the PR link carries the rest.
- An item may be an object with `what` or a plain string. An object with no `what` is skipped.
- `evidence` never renders, and nor do SHAs or paths, beyond what the team wrote into `what` itself.
- With no items (missing, empty, or all skipped), the whole `div.mt-4` is left out: no h4 and no
  empty list.

3.5 **Fields that never render**: `minutes`, `agents`, `tokens`, `model`, `lens`, `fixRounds` /
`fix_rounds`, `followUps`, `proposals`, `goalFrom`, `head_reviewed`, and every `lens_*` count. They
make a stat line, and a stat line makes a dashboard. Minutes exist only from sprint 5 on, so they
would also be ragged.

3.6 **The list mark** is the Stack's drawn dot, hung outside the text so every item's text keeps the
column's left edge:
- `before:absolute before:-left-3 before:top-[calc(0.5lh-1.5px)] before:size-[3px] before:rounded-full before:bg-muted before:content-['']`;
- that centres it on the item's first line: measured top 12.9 px at 1440, 11.3 px at 320, and
  `liLeft` equals `h3Left` at every width;
- below `md` it hangs into the 24 px column padding (9 px clear of the text), and from `md` into the
  gutter, under the number's column;
- there's no `list-disc` and no typed bullet character.

3.7 **Missing data in the entry itself.** An entry needs a numeric `sprint` and a non-empty `goal`,
and a retro without either is left out (the build should say so, not fail the page). Both retro shapes
are read: snake_case in 1–4 and camelCase in 5 onward.

## 4. Spacing, as one system

| Between | Value | Source |
|---|---|---|
| header and section, sections | `gap-16` (64) | main, as on `/` |
| header children | `gap-4` (16) | as on `/` |
| section label and first entry's rule | `gap-6` (24) | `Section` |
| entries (rule to previous entry's last line) | `gap-8` (32) | Experience's `gap-8` |
| rule to the entry's h3 | `pt-6` (24) | a rule groups with the entry below it (32 above, 24 below) |
| h3 to meta | 0 | Experience's h3 to period |
| meta to "What went wrong" | `mt-4` (16) | |
| label to first item | `mt-1` (4) | |
| between items | `gap-2` (8) | |
| number to text, from md | `mr-4` (16) | |
| dot to text | 9 (`-left-3`, 3 px dot) | |

**Every entry starts on a rule**, the first one included. That's the ruled logbook page, and it
uses `--rule`, the existing quiet hairline (1 px, decorative). Don't raise it.

## 5. Colour and type

- These are tokens only, the same five as everywhere: foreground for goals and items, muted for the
  number, meta, label, "Owner's call" and dots, accent for **links only** (the back link, the PR links
  and the home link), rule for the entry rules. Nothing in the log has a background colour.
- These are steps only, as listed above: 2xl, lg, base and sm. Weights are only the page's 600 (h1) and
  500 (h3, h4, h2). Geist is the only family, with `tabular-nums` on the number only.
- Dark mode needs no override. The prototype at 390 and 1440 dark reads the same as light.
- Nothing new moves. Hover is a colour change on links, as on `/`. Reduced motion loses nothing.

## 6. Phones (390 and 320)

- It's one column with no hang: the number is inline (3.1), and the dots hang into the 24 px padding.
- The meta line wraps after a dot, never before one. At 320 sprint 10's meta breaks after "Owner's
  call ·", with the link on line two, and the link stays whole.
- The longest unbroken word on `main` is "failIfMajorPerformanceCaveat" (28 characters). It fits 272
  px at 320, and `break-words` is the guard for a longer one.
- There's no horizontal scroll: measured `scrollWidth - innerWidth = 0` at 320, 390, 1024 and 1440.
- The home link (1.2) adds one line to the header (27 px at 390, plus the 16 px gap). At 390×844 the hull is still in the first
  viewport.

## 7. What it must never look like

Each of these is a fail on sight. Most can be checked in the browser.
- **Dashboard chrome**: stat tiles, counters in boxes, KPI rows, token, minute, model or agent
  readouts, "fix rounds: 2", progress bars, charts, sparklines, `canvas` or `svg` anywhere in `main`
  on `/sprints`.
- **Badge soup**: pills or chips for size, status, role or outcome; any element in the log with a
  background colour or a border radius (the 3 px dots are the one exception); traffic-light status
  colours (green merged, red failed, amber); copper on anything that isn't a link.
- **The template timeline**: a vertical rail joining entries, circles or nodes on a line, alternating
  left and right entries, date pills.
- **Cards**: rounded or framed boxes per sprint, shadows, the project-card plank frame (on this site
  a plank frame means "a project you can open").
- **The hacker cliché** that "watch the build" invites: a monospace page, terminal green, a blinking
  cursor, `$` prompts, typewriter reveals.
- **GitHub cosplay**: octicons, avatars, branch or commit glyphs, SHAs, "merged" purple.
- **Hidden failure**: accordions, "show more", a collapsed what-went-wrong, filters, tabs or sort
  controls. Everything is on the page in order.
- **Raw retro text**: the `outcome` sentence, `evidence`, follow-ups or proposals.

## 8. What I rejected, from the prototype

- **What went wrong, item 1 shown and items 2–3 in a `details`.** When open, the toggle sits in the
  middle of the list. "1 more" was the weakest control on the page, and it hid the very thing that
  makes this page worth reading. Showing all of it cost 1457 px at 1440, and it reads as a real log.
- **The latest sprint as a teaser section on `/`.** It brings jargon onto the recruiter page and
  goes stale between builds of the same data. The header link (1.2) does the job in one line.
- **A colophon footer under Contact as the only way in.** Few visitors reach it, and the claim it
  proves is in the header.
- **A meta line that leads (number and size above the goal).** It inverts the Experience shape. The
  hung number gives the scan anchor without breaking the family.
- **Status from `outcome`** ("Merged", "Not merged", "Shipped"): false for 1 and 2 (3.3).

## For Quill: checks that follow from this

Each one can be shown in a browser on `main`'s retros:
- the route and its links (1.2, 1.3);
- the order 11 to 1 (2.3);
- the h3 text after prefix stripping (3.2);
- "Owner's call" on exactly 10, 9, 7, 2 and 1 (3.3);
- the PR link's text and href, and its height of at least 24 px (3.3);
- the item counts per entry (3.4): sprint 11 has 2 and the rest have 3;
- no backtick, outcome sentence or evidence string in the page text (3.2–3.5);
- the number's right edge 16 px left of the h3 text from 768 and inline below (3.1);
- dot `left` −12 px and first-line centring (3.6);
- the spacing table (4);
- computed colours only from the five tokens, and no background or radius in the log (5, 7);
- no overflow at 320 (6);
- the home header link's text, classes and the count matching the entries rendered (1.2).

Also: `/sprints` in `app/sitemap.ts`, and its own canonical and title through `lib/metadata`. The
PR base URL should come from a team constant, not from `content/` (the Theseus project href is
the owner's).

## Needs decision (owner)

- **The lede's wording (2.1)** and **the name "Build log"**. Both are team copy on a public page,
  and taste on large work is yours. The alternative name is the roadmap's own "Watch the team build",
  which reads as a call to action rather than a title.
- **The way in from `/` (1.2)**: a copper line under your bio, above the hull. It's the first link
  a visitor sees. The alternative is a footer line under Contact, which is quieter and less often
  found.
