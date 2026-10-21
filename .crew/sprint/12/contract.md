# Sprint 12 contract: the build log ("Watch the team build")

Size: L, a contract sprint, no product code. The owner accepts it by merging this PR (`needs-owner`).
The build is two later sprints' (the split is below). It stands on Iris's direction,
`.crew/sprint/12/direction-iris.md` (cited as "direction §n"), and on the retro files as they are on
`main` (sprints 1 to 11). Every number below is Iris's measurement in her prototype of `main`'s build
at e8be1af, or comes from the files; where neither is true, the check says so. Nothing was built or
run for this contract.

## Outcome

A visitor reading the bio's last sentence ("This site is where a team of AI agents shows what it can
ship on its own.") can follow one link, "Build log", to `/sprints`: a single readable page with one entry
per sprint, newest first, each showing the sprint's goal, its size in words, its pull request, whether
it was the owner's call, and, in full, what went wrong. Every entry comes from that sprint's
`retro.json` at build time, so the page grows by itself with each merged sprint, and nothing on it is
typed by hand or taken from `content/`.

## Who does what

- **Probe** writes the specs of each build PR first, red, before Forge starts (no `test.skip`, `fixme`
  or `fail`): `e2e/sprints.spec.ts` for PR A, `e2e/sprints-entry.spec.ts` for PR B.
- **Forge** builds both PRs. Pixel is not needed: nothing here moves or draws.
- **Iris** reviews the look against direction §7 in each PR (advisory). **Lens** reviews in CI.
- Quill and Atlas write no product code. The existing specs are not edited (see "Existing guards").

## Out of scope

- A status word ("Merged", "Shipped", "Failed") or any printing of `outcome`, `evidence`, `followUps`,
  `proposals`, `minutes`, `agents`, `tokens`, `model`, `lens`, `fixRounds`, `goalFrom`, SHAs or paths
  (direction §3.3 to 3.5, §7).
- Filters, sorting controls, search, tabs, "show more", pagination, a cap on entries, dates, per-sprint
  pages (`/sprints/12`), an RSS feed, and a teaser of the latest sprint on `/` (direction §8).
- Any change to `content/`, the owner's paths (`.claude/`, `.github/`, `.crew/` scripts and tests,
  `package.json` scripts, toolchain settings) or the existing `e2e/` specs. Editing past retros: they
  stay as they are, including the snake_case ones.
- A new colour or type token, a new dependency, a client component, any animation.
- A `needsOwner` field in the retro template (proposed to the owner in the retro, not built).
- Reading a retro from anywhere but `.crew/sprint/<n>/retro.json`: no GitHub API call, no `git log`,
  no labels, no dates from the clock.

## The data rules (what the build must do, fixed here so Probe can test them)

The reader is one pure function in `lib/`, `readSprintLog(dir)`, and both `/sprints` and the home
link call it, so the count on `/` cannot differ from the entries on `/sprints`. It takes the folder as
an argument (default `.crew/sprint` under the working directory) and imports only `node:fs` and
`node:path` with relative imports, so a Playwright test can call it on a temporary folder of fixtures.
(There is no unit runner for product code; the harness tests are the owner's. A Playwright test with no
`page` is the way to test it.)

**Which files.** Every `.crew/sprint/<n>/retro.json`. A folder with no `retro.json` is a sprint in
progress and is skipped without a word.

**Valid entry (required).** `sprint` is a positive integer and `goal` is a string that is not blank. Both
retro shapes have both fields (sprints 1 to 4 snake_case, 5 on camelCase).

**Fail loudly, not skip, for a file that is wrong.** A `retro.json` that does not parse, lacks a valid
`sprint` or `goal`, repeats another file's `sprint`, or whose `sprint` differs from its folder's number
makes the reader throw with the file's path and the reason, so `pnpm build` fails. Why not skip, as
direction §3.7 first said: `check` in CI builds every PR (a broken retro is caught on its own sprint PR,
before it can merge), while a quiet skip would shrink the public log and the "· 11 sprints" count with
nobody told. A retro is a team-written file, so this is a team bug, and a cheap one to fix. Visitors
never see a half log: a failed build leaves production on the last good one.

**Tolerate, never fail, for an optional part that is wrong.** The part is left out and the entry renders:
- `size`: only `S`, `M` or `L` count (words: "Small sprint", "Medium sprint", "Large sprint").
- `pr`: only a positive integer gives a link ("Pull request #N", base from a team constant in
  `lib/site.ts`, `https://github.com/nycruslan/theseus-portfolio`, not from `content/`).
- Went wrong: `wentWrong` if it is an array, else `went_wrong` if it is, else none. An item is a string,
  or an object with a string `what`; anything else, or a blank text, is skipped. The first three kept
  items render, in the file's order. `evidence` is never read.
- With nothing left in any of size, owner's call and pr, the meta line is left out; with no items the
  "What went wrong" block is left out (direction §3.3, §3.4).

**"Owner's call" comes from `outcome`, by one rule:** `outcome` is a string that matches `/\bneeds-owner\b/i`.
Both shapes have `outcome`; a missing or non-string one means no mark. Why `outcome` and why this rule:
- `outcome` is written at close-out, before the merge, so it is false as a *status* (sprints 1 and 2 say
  "not merged", yet #9 and #12 are on `main`; sprint 5 and 6 say "merged if merge.mjs lands"). It is
  right about *who decided*, which is what the mark says, and which is true before and after the merge.
- The token `needs-owner` is the label the team puts on a PR the owner decides, and it is in the
  `outcome` of every sprint the owner decided: 1 and 2 ("left open with needs-owner"), 7 ("open,
  needs-owner"), 9 and 10 (the whole string). Direction §3.3 added "starts with `not merged`" and "starts
  with `open`"; on `main` each is already caught by the token, so they are dropped (a rule with fewer
  clauses has fewer false positives).
- No list of sprint numbers anywhere in code or specs' expectations for sprints after 11.
- Known weakness, accepted: an outcome that says "merged, no needs-owner was needed" would be marked. The
  retro proposal for the owner is a `needsOwner` boolean in the template, which the reader would prefer.

**Order and presentation** (direction §2.3, §3.2): sorted by the numeric `sprint`, descending. The
goal has a leading `Roadmap item:` or `Roadmap item N:` removed (case-insensitive), then its first letter
capitalised; backticks are dropped from the goal and from every item.

**A real space between the number and the goal (this overrides direction §3's markup).** Below 768 the
number span is inline, and Iris's markup puts the goal right after it with no whitespace, which reads as
"Sprint 11Stack separators…" in the h3's accessible name and in `textContent`. The build must put a real
space between the number span and the goal text (for example `{" "}` after the span, with the span's margin
adjusted so the look does not change), at every width. From 768 the number hangs 16 px left of the goal
(C6.1), and the space must not move it: the hang is set by the span's own width and margin, not by the
space. Where the direction's markup and this paragraph differ, this paragraph wins.

**The count** `n` is the length of the reader's result. The home line reads `Build log`, then a no-break
space, a dot and `n sprints` (`1 sprint` when n is 1). When n is 0 the home line is left out (a link to
an empty page helps nobody) and `/sprints` is not linked.

**Built once.** `/sprints` and the count are static at build time. The deployed site never reads a
file at request time (so nothing depends on `.crew` being deployed). Under this repo's
`cacheComponents` setting, reading files during render has its own rules: Forge reads the relevant guide in
`node_modules/next/dist/docs/` first, and shows `pnpm build`'s route table with `/sprints` static.

**The preview edge case (an open sprint's own entry).** A sprint's retro is written at close-out, in the
same PR that carries it, so:
- before close-out the open sprint has no entry, and the count excludes it;
- on that PR's preview the entry is there, and the count includes it; the page prints no status, so
  nothing is false; "Owner's call" shows if its `outcome` has the token; its PR link opens the open PR;
- on production the entry appears when the PR merges, because a retro only reaches `main` through its
  own squash merge: **every entry on production is a merged sprint**, whatever its `outcome` said;
- a sprint PR closed without merging never reaches `main`, so it is never listed.
No check needs a special case for it: the checks derive their expected entries from the files in the
checkout under test, so preview and production both pass.

## Existing guards, and what they do and do not cover

Read first, as the memory notes ask. All of these run on `/` only, so the new page has none of their
protection until its own spec runs the same checks on it.

| Existing spec | On `/` after PR B | On `/sprints` |
|---|---|---|
| `invariants.spec.ts`: tokens, contrast, axe (both schemes, 390 and 1440, skip link showing or not), 24 px targets at 390, overflow at 320, heading levels, the literal scan of `app/` and `components/` | stays green unedited (the home line is a `text-muted` span and an `inline-block` link of 24 px or more) | **not covered**: C9 and C10 re-run them |
| `keyboard.spec.ts`: skip link first, Enter lands on `main`, Tab visits every link in DOM order with one ring, in both schemes | stays green unedited: its expected stops come from the DOM, so the new link is one more stop, and "the next Tab focuses the first link inside `main`" is now the home line | **not covered**: C10 |
| `reveal.spec.ts`: `sectionIds` is exactly five sections on `/`, the header never animates | green: the log is a route, not a sixth section, which is why it is not a section of `/` | n/a; C11 |
| `hero.spec.ts`, `hero-3d.spec.ts`: the hero sits after the header; its box is 64 px from the header | green: they read the header's rect, and the home line sits inside the header | no hero on this page (C1) |
| `profile-sections.spec.ts`, `cards.spec.ts`: section order, Stack, Education, cards | green: the home line is in the header, outside every section and card | n/a |
| `smoke.spec.ts`: h1 is the owner's name, sitemap is served, 404 claims no canonical | green | the sitemap's contents are **not covered**: C2 |
| `content.spec.ts`: `test.fixme` | untouched | n/a |

One risk the table cannot hide: `invariants.spec.ts`' literal scan bans hex-like fragments (`#add`,
`#bad`, `#dead`) in `app/` and `components/`, so a hash link or id must not start with those letters.

## Checks

Probe's oracle for every "expected" below is the retro files in the checkout, read by the spec itself
(`valid` = the rules above applied with a few lines of the spec's own, not by importing the reader), so
the checks stay true as retros are added. History is frozen, so a few **anchors** on sprints 1 to 11 pin
the reader independently of the spec's own oracle. No check contains the number of entries as a literal;
the floor is "at least 11 and every anchor present". Viewports: 320 x 800, 390 x 844, 768 x 900,
1024 x 800 and 1440 x 900, in light and dark, unless said otherwise.

### PR A: the route (`e2e/sprints.spec.ts`)

**C1. The route and its skeleton** (direction §1.1, §2).
1. `/sprints` returns 200 with scripts on and off. One `main#main[tabindex="-1"]`; the first `a` in the
   DOM is `a[href="#main"]`; one `h1` reading "Build log"; one `section` in `main`, a region named
   "Sprints", whose h2 has the id `sprints`; the header's first child is `p` holding `a[href="/"]`
   whose text is `profile.name`.
2. No `[data-hero]`, `canvas`, `svg`, `img`, `table`, `button`, `details` or `input` anywhere in
   `main`; no `[aria-expanded]`.
3. `main`'s computed `max-width`, padding and gap match `/`'s `main` (read from `/` in the same test),
   so the two pages open the same way.

**C2. Metadata** (direction "Also"). Title includes "Build log" and is not `/`'s. Canonical is
`https://theseus-portfolio.vercel.app/sprints`; `og:url` is the same; `og:description`, `twitter:description` and the
meta description are not `profile.bio` (the shared `openGraph` object carries the bio, and
`app/layout.tsx` sets `twitter.description: profile.bio`; Next merges metadata per top-level key, so a
page that spreads `openGraph` must replace its description, and Forge must also override `twitter` with
its own description). `/sitemap.xml` lists both `/` and `/sprints`. `/robots.txt`
does not disallow `/sprints`.

**C3. Order and count.**
1. `ol` items in the section: `valid.length` of them, no fewer than 11. Their sprint numbers (read from
   the number span, or from the h3's accessible name; not from the `sr-only` prefix, which holds only
   "Sprint ") are exactly `valid` sorted descending by the number in the file.
2. Anchors: the entry for 10 comes before 9 and the entry for 2 before 1 (a sort by folder name puts 9
   after 11 and 10 before 2; this fails that sort), and the last entry is 1.

**C4. One entry's words** (direction §3.1 to 3.3). For every valid retro:
1. The h3's accessible name is `Sprint N ` plus the goal as transformed above, with one real space
   between the number and the goal at every width (never "Sprint 11Stack"; see "A real space" above); its
   visible text has the number and the goal in that order. Anchors, word for word: sprint 1 "Design tokens (5 colors, 5 fluid type
   steps in app/globals.css, used across the page)"; sprint 8 "The subtle 3D hero, Part A of the sprint 7
   contract (static SVG lift half-model, C1-C9)"; sprint 11 "Stack separators: a drawn middle dot between
   the tools in the Stack section (Iris's sprint 6 item 2)".
2. Meta line: the size word for `S`/`M`/`L` and none for anything else; "Owner's call" exactly when
   `outcome` matches the token. Anchor: among sprints 1 to 11 it is on 1, 2, 7, 9 and 10 and on no other.
   Items are joined by ` · ` and the line never starts with a dot.
3. PR link: when `pr` is a positive integer, one `a` with the text "Pull request #N" and the href
   `https://github.com/nycruslan/theseus-portfolio/pull/N` (a literal in the spec: the repo is a fixed
   fact); none otherwise. At 320, 390 and 1440 its height is at least 24 px and its colour is `--accent`.
4. No entry contains the words "Merged", "Shipped" or "Failed" as a status label (only in a goal or
   item's own text; the spec removes the rendered goals and items before scanning).

**C5. What went wrong, all of it** (direction §3.4).
1. Each entry has an `h4` "What went wrong" and a `ul` exactly when it has kept items; the count of `li`
   is `min(3, kept)`; each `li`'s text equals the `what` with backticks removed and whitespace
   normalised, in file order. Anchor: sprint 11 renders exactly 2, and every anchor sprint renders
   between 1 and 3.
2. Nothing is truncated or hidden: no text ends in an ellipsis that the source lacks; `main` has no
   `details`, `summary`, `button`, `[aria-expanded]`, `[hidden]` or element with `display: none`, except `script`, `template` and `style` elements, which
   browsers hide by default and Next may inject (the scan skips them; `/sprints` carries no JSON-LD, so
   nothing of the page's own is hidden in them); every
   `li` is visible and its `scrollHeight` equals its `clientHeight`.
3. Not rendered: no `outcome` string and no `evidence` string from any retro appears in `main`'s text,
   unless it is a substring of a rendered `what` or of a rendered goal. Only strings of more than two
   words are scanned: a one-word outcome such as "merged" would match any goal or item that happens to
   contain it, so it is neither a proof nor a failure. No backtick appears anywhere in `main`. Links in `main`
   are only the back link and the PR links (the set of hrefs is checked).

**C6. Spacing and the hang** (direction §3.1, §3.6, §4). Tolerance 1 px, measured from `getBoundingClientRect`
and, for the first line, from a `Range` over the first character.
1. From 768: each entry's number has its right edge 16 px left of the h3 text's left edge, and shares the
   first line (its vertical centre within the first line box). Numbers right-align: the right edges of
   sprint 9's and 11's numbers are equal. Below 768 the number is inline: its left edge is the column's.
2. The list dot (the `::before` of each `ul > li`): 3 x 3, `border-radius` 50% or larger, background
   `--muted`, its left 12 px left of the item (that is, 9 px clear of the text) and its centre on the
   item's first line within 1 px. Item text starts at the column's left edge in every entry.
3. Rule to h3 24 px; h3 to meta line 0; meta line to the "What went wrong" label 16 px; label to first
   item 4; item to item 8; the next entry's rule 32 px below the last line of this one; the first
   entry's rule 24 px below the section's h2; header to section 64.
4. Every entry starts on a rule: a top border of 1 px in `--rule`, on every `li` of the entry list.

**C7. Colour and type, in tokens only** (direction §5, §7). The existing token helpers, run on `/sprints`:
1. Every text colour is one of the five tokens and every size one of the type steps (the invariants'
   `textStyles` check); only `sm`, `base`, `lg` and `2xl` steps appear; weights are only 400, 500 and
   600; one font family throughout, none matching `/mono|courier|consolas/i`.
2. Accent is on links only: every element whose colour is `--accent` is an `a`.
3. Nothing in `main` has a background colour other than transparent, a border radius other than 0, a
   box shadow, or an outline at rest. The one exception is the 3 px dot above. No element in the list
   has a computed `border-left`, `border-right` or `border-bottom` (no rail joining entries) and no
   `transform`.

**C8. Phones and widths** (direction §6). At 320, 390, 768, 1024 and 1440, in both schemes: the page's
horizontal overflow is 0 (`horizontalOverflow`), and no element's right edge is past the viewport's. At
320 the meta line wraps after a dot, never before one: no line of the meta text starts with a dot (via
`Range` rects), and a PR link is on one line (its box is one line tall).

**C9. Accessibility** (the invariants' checks, on this route).
1. axe with the strict tag set invariants uses finds nothing, at 390 and 1440, with nothing focused and
   with the skip link showing, in both schemes; `color-contrast`, `landmark-one-main` and `region` pass.
2. Text contrast thresholds (foreground 7, muted and accent 4.5 on the background), both schemes.
3. Headings: one h1, then the Sprints h2, then each entry's h3, and the h4 only under an h3; no level
   skipped.
4. Every link outside the skip link is at least 24 x 24 px at 390.

**C10. Keyboard.** The skip link is the first stop and hidden until focused; Enter lands on `main`
(focused, no ring); Tab then visits the back link, then each PR link in DOM order (newest first); each
stop is seen, with one clear ring of at least 2 px in a token colour, in both schemes. No `tabindex`
other than `main`'s.

**C11. Nothing moves, nothing needs scripts.**
1. With scripts off the server HTML already holds every entry (the count equals C3's).
2. With reduced motion `document.getAnimations()` is empty. With motion allowed, every animation's
   target is an `h2` (the sprint 5 rise, inherited), and nothing under the entry list animates or
   transitions except the colour of a link on hover.

**C12. The reader on bad data** (a Playwright test with no `page`; it calls `readSprintLog` on a folder
the test writes into the temp directory). Fixtures, one folder each:
1. Snake_case (`went_wrong`, `fix_rounds`) and camelCase (`wentWrong`) retros both give an entry; a retro
   with both fields uses `wentWrong`. Out-of-order folders (`2`, `10`, `9`) come back as 10, 9, 2.
2. Missing or wrong *optional* parts leave the entry in with that part undefined: no `size`, `size: "XL"`,
   no `pr`, `pr: "36"`, `pr: -1`, `outcome` missing or a number, `wentWrong` a string, an item that is a
   number, `null` or an object with no `what` or a blank one, four items (three kept). The two
   shapes have the same result for the same content.
3. Required parts throw an error whose message contains the file's path: invalid JSON; no `sprint`;
   `sprint: "7"`; `sprint: 0`; blank `goal`; two folders with the same `sprint`; folder `5` holding
   `sprint: 6`. A folder with no `retro.json` is skipped and does not throw. An empty folder gives `[]`.
4. "Owner's call" is true for `outcome` strings `needs-owner`, `Not merged: left open with needs-owner`
   and `OPEN, NEEDS-OWNER`, and false for `merged`, `shipped once the gate lands`, a missing `outcome`,
   and `needs-owners` (the word boundary).
5. Goal and items: `Roadmap item 4: section reveal` gives `Section reveal`; `roadmap item: a subtle 3D`
   gives `A subtle 3D`; backticks removed; a goal that is only `Roadmap item:` is blank, so it throws.

**C13. Read only team files, touch no one's else** (process, shown in the PR, with one spec scan).
1. A scan in the spec: the reader's source and `app/sprints/` contain no `content/` path and no import of
   `@/content/profile` other than `profile.name` for the back link's text.
2. `git diff --name-only origin/main` lists no `content/`, owner path (listed in `CLAUDE.md`) or existing
   `e2e/` spec. Atlas's scope check and `gate.yml` decide, as every sprint.
3. `pnpm verify` and `pnpm test:e2e` pass; `pnpm build` lists `/sprints` as static.

### PR B: the way in (`e2e/sprints-entry.spec.ts`)

**C14. The home line** (direction §1.2, §1.3, §6). On `/`:
1. `main > header` has as its last child a `p.text-step-base` holding `a[href="/sprints"]` whose text is
   `Build log`, then a `span` whose text is exactly ` · ${n} sprints` (`1 sprint` for 1; the span's first character is U+00A0, the no-break space of the data
   rules, never an ordinary space, and the spec writes it as the escape `\u00a0· ${n} sprints`), where `n` is
   the number of entries `/sprints` renders and equals the number of valid retro files. The spec reads
   `n` from `/sprints` and the files and asserts they agree; it holds no number.
2. The link is `--accent` with an underline, the span `--muted`; the link's height is at least 24 px at
   320 and 390. The link has the Contact links' classes (compared by computed `color`, `text-decoration`,
   `text-underline-offset`, `display`).
3. The line after the bio changes nothing above it: the h1, headline, location and bio paragraph text
   equal `profile`'s (read from `content/profile.ts`, never copied); the `[data-hero]` box is still the
   header's next sibling; the Theseus project card's `href` equals `profile`'s.
4. At 390 x 844 the hull box's top edge is above the fold (the home line adds one 27 px line and the
   16 px gap to the header: direction §6). Probe measures the box's top on `main` first and quotes the
   value in the spec's message. At 320 and 1440 the header and the hull still stand 64 px apart (the
   line is inside the header).
5. Tab: skip link, then the home link, then the first project link, in light and dark, one ring (the
   existing keyboard test already requires this by DOM order; this adds the home line as the *second* stop).
6. The home page still has exactly five sections in the order the existing specs require (C2 of
   `reveal.spec.ts` and C1 of `profile-sections.spec.ts` stay green and unedited), and no `a[href="/sprints"]`
   anywhere else on `/`.

**C15. Both ends agree** (needs both PRs). From the home line, click the link: `/sprints` loads, and its
back link goes to `/`. The count on `/` equals the number of entries on `/sprints`. That the count and
the page grow with a new retro is not shown in a browser, because it would need a rebuild with a new
file; C12 (the reader, on added fixtures) and the derivation of every expected value from the files
stand for it. No spec rebuilds the site.

## The build, split

**PR A (sprint 13, M): the route.** Forge adds `lib/` reader, `REPO_URL` in `lib/site.ts`,
`app/sprints/page.tsx`, the entry component, metadata and a sitemap entry for `/sprints`. Probe pushes
`e2e/sprints.spec.ts` (C1 to C12) first and it goes red on CI before Forge's first push; the head that
merges has it green. Iris looks at 320, 390, 768, 1024 and 1440, both schemes. `/` is not touched, so
the existing specs are not even at risk. The page is reachable only by URL and the sitemap until B,
which is harmless.

**PR B (sprint 14, S): the way in.** Forge adds the home line to `app/page.tsx` (additions inside
`header`; the Contact links, the sections and the owner's text unchanged), calling the same reader.
Probe pushes `e2e/sprints-entry.spec.ts` (C14, C15) first. If the owner chooses the footer option
below, only C14's location changes; nothing in A does.

Why two and not one: A on its own is a coherent page; B on its own would link to nothing. Doing both in
one M sprint puts a new route, a new reader and an edit to the owner's page in one review, 15 checks, and
every existing spec at once. Cutting B to its own S lets A merge and Iris judge the page before it gets
the first copper on the owner's home page.

## Risks

- **The page grows by every merged sprint, and nothing caps it.** Iris measured 5471 px at 1440 and
  7657 px at 320 for 11 entries (about 500 and 700 px each). At the daily cap of six sprint PRs, that is
  several thousand pixels a day. That serves a visitor who wants the process, and fails one who wants
  the latest: the newest entry is first, which helps. Out of scope today and not a check, because a cap
  would make the checks false as retros are added. **Trigger:** Quill puts a "log length" item on the
  roadmap when the log reaches 30 entries (the checks' 11 is a floor, not a count).
- **Public copy with no review of its own.** Retro text becomes visible to every visitor when a sprint
  merges, and the close-out push that writes `retro.json` is a notes-only push, which keeps Lens's last
  ship (`CLAUDE.md`, merge policy). So the text of a `what` reaches the public with no review of that
  text (see Needs owner decision, 3). Builders can't fix it: `lens.yml` is the owner's.
- **Team jargon on a public page.** Several goals and items are written for the team ("C10-C16 rewritten",
  "failIfMajorPerformanceCaveat"). The design deals with it by keeping the log off `/` and not
  rewriting a word; the lede says what the entries are. It does not make them easy reading, and this
  contract does not rewrite them.
- **A retro that is wrong now fails the build** (the loud choice above). A close-out that writes
  `"sprint": "13"` blocks its own PR until fixed. That is a feature, but it is a new way for a close-out
  to cost a push.
- **`cacheComponents`.** Reading files at build time under this setting is the one piece of the
  framework I could not confirm from the docs in this sprint; Forge reads the guide before writing, and
  C11.1 plus the route table in C13 are the proofs.
- **The owner's name on the back link** is `profile.name` as the owner wrote it; no other owner text
  appears on `/sprints`.

## Proposals for the retro (owner's paths; not done here)

- The sprint skill's `retro.json` template (`.claude/skills/sprint/SKILL.md`) gets a note that the file
  now feeds the public log, that the three `wentWrong` entries are published as written, and an optional
  `needsOwner` boolean the reader would prefer to the outcome text.
- `lens.yml` reviews a `retro.json` diff at close-out as copy, not as a note.

## Needs owner decision

By merging this PR the owner accepts the following; the first two are Iris's.

1. **The name "Build log" and the intro copy.** Both are team copy on a public page. Iris's lede: "A team
   of AI agents rebuilds this site one sprint at a time. Each entry comes from that sprint's retro: what
   it set out to do, its pull request, and what went wrong. Owner's call marks a sprint the team handed
   to the owner to decide." The alternative name is the roadmap's "Watch the team build", which reads as
   a call to action, not as what the page is. **I recommend "Build log" and the lede as written.** It
   says what the page is and promises nothing; the lede's last sentence is the only one that needs the
   owner's eye, because it names the owner.
2. **The way in: a copper line under your bio, above the hull, or a footer line under Contact.** The line
   is the first link on the page and the first copper a visitor sees. **I recommend the line under the
   bio.** The bio's last sentence is the claim; the proof is one click away at the moment the visitor
   reads it. A footer is quieter and is reached by few. The cost of the recommendation is real: it puts
   team copy directly under the owner's words on the page recruiters read, and it makes the header one
   line (27 px, plus the 16 px gap) taller. If the footer wins, PR B's C14 moves its location and its
   spacing check; nothing else in this contract changes.
3. **What gets published.** All eleven retros' `what` items, verbatim (up to three each), the day this
   ships, then each new sprint's as it merges, with no review of that text apart from Lens on the code
   (the close-out push is a notes-only push). Among them: sprints 1 and 2 say the owner's placeholder
   content ("Company name" stand-ins) held the team's work back; sprint 10 says the sprint became an
   owner decision because the contract's premise failed. They are true and they are the point of the
   page. Accept them as written, or ask for the entries you'd rather not show to be reworded in the
   retro, which is the only place the text can be changed (past retros are not edited by this work).
4. **A malformed retro fails the build** instead of being skipped (decided here, above). Say if you'd
   rather it were skipped with a warning.
5. **The "Owner's call" rule** (a retro's `outcome` containing `needs-owner`), and the mark's meaning:
   "the team handed this sprint to the owner to decide". No status word is printed, because `outcome` is
   written before the merge and is false for sprints 1 and 2.

Nothing here changes `content/`, the owner's paths, `package.json`'s scripts or any existing spec.
