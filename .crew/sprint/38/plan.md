# The next milestone: the proof in five seconds (Quill, sprint 38)

## The outcome

On `/`'s first screen, at 1440 and on a phone, a hiring executive reads the owner's scope and
scale (the team he leads, the platform's reach, its users, its impact) in the owner's own words,
and can tell that the names in the revision block are AI agents he directs. A link shared with
them carries the same proof.

Three sprints, checks P1 to P17 (sprints Pa, Pb and Pc, as B4 used letters). No sprint needs an
owner answer to start, touches an owner path, or edits `content/`.

## Why this, and not standing down

The redesign is built: B1 to B5 are merged, and what's left are the owner's demos of the 3D, the
live layer and the ghost hull. I looked at production on 2026-10-31 (about 20:55 UTC) as the first
reader in `PRODUCT.md`, at 1440 × 900, 1280 × 720, 390 × 844 and 360 × 640, with a Playwright
script that finds each of the owner's figures on `/` and records the LCP element (scratch, not in
the repo). What works:

- The name is the LCP at 1440 (596 ms here) and the bio at 390 (344 ms). "VP Engineering, AI
  Platform", JPMorgan Chase and "several thousand employees" are in the first viewport at every
  size, and Work is one click away.

What the first reader misses:

1. **Six of the owner's seven scale figures are below the fold, inside one paragraph.** Only
   "several thousand employees" (the bio) is in the first view. "Firm-wide", "about 55%", "around 8"
   product teams, "roughly 35%", "a day or two" and "team of 7" sit in the JPMorgan summary, a
   90-word paragraph at body size: 1.1 to 1.3 screens down at 1440 × 900, 1.4 to 1.6 at
   1280 × 720, 1.8 to 2.0 at 390 × 844, and 2.7 to 3.0 at 360 × 640. Detail A (the gateway)
   starts 1.4 screens down at 1440 and 2.2 at 390. Belief 1 asks for "scope, scale and judgment at
   once"; the first screen gives the title and one number, and the top 53% of it at 1440 is the
   drawing.
2. **Nothing says what the crew is.** In the first view "AI agents" appears once, in the
   revision block's 13 px caption in `--muted`, and at 360 × 640 it's below the fold. The five rows
   name Forge, Pixel, Lens, Probe and Gate with no word saying they are agents or what "Gate"
   means. Every description starts with a milestone code ("B4e:", "B4d:" … "B5c:"), and four of
   five use a URL path or the crew's own terms ("the hull", "Full/Calm/Off"). `/crew`'s page body
   never uses the word "AI" (it's only in the meta description), so seven names with jobs ("Code",
   "Review", "Tests") read as people. Belief 2 is the site's proof, and a stranger can't read it.
3. **The shared link says nothing.** `/opengraph-image` shows the name, the role, "New York, NY"
   and the domain, in a face that isn't the site's (the open typeface rider): no employer, no scale.
   For an executive sent the link, that card is the first five seconds.

Not standing down: each of these is measured on production, needs no owner answer, and leaves
alone what the open demos judge (the loft, the hull, the live marks, the replay). The alternatives:

- `/work/…` case studies (research section B): they need facts beyond `content/profile.ts`, so
  they're the owner's.
- A published keel, "the rules my crew can't break": it publishes the owner's setup, so it's an
  Owner's pick.
- Splitting CI's suite: `.github/` is the owner's, and sprint 37's retro already proposes it.
- The riders alone: STATE.md's lesson is milestones, not a stream of polish.

## The sprints

### Pa (M): the particulars, the owner's scope and scale on the first screen

A lines plan carries a table of principal particulars beside its title block, so the first screen
can too. Four rows, each a term in the crew's words and a phrase quoted verbatim from the
JPMorgan summary: Leads, "a team of 7 across AI research, backend and platform"; Reach,
"multi-agent workflows several thousand employees use firm-wide"; Gateway, "around 8 product teams
route through"; Impact, "cut manual processing on the flagship workflow by about 55%". The block is
server-rendered text, inert, in the first viewport at 1440 × 900 and 390 × 844 in every feed state,
and clear of the hull. If the owner edits the summary, a row drops out rather than showing words he
took out (Detail A's rule). Checks P1 to P7, in `first-contract.md`.

- Iris's call first, on these measurements: four rows in today's title block push its contact
  links to y 909 to 936 at 1440 × 900, below the fold, against B1.1. The block has 17 px to spare
  (883 against 900). Two ways out:
  - (a) the drawing band (72 to 547) gives the bottom row about 80 px, which moves the hull, so
    Pixel and the 3D suites come in;
  - (b) the particulars sit in the band's empty corner under the body plan (about x 1000 to 1400,
    y 360 to 530 at 1440, where no ink, hull or shadow falls), which leaves the drawing alone.
  - At 390 × 844 four rows fit in the title block (links at 743 to 787, or unchanged at 585 to 629
    if the rows follow them).
- Riders: none touches this code. The facts-and-fonts riders touch the fact sections and the
  fonts, so they go with Pc.

### Pb (M): who built it, in plain words

- **On `/`:** one line under the five revision rows names the crew as AI agents and says what
  Drawn, Checked, Tested and Approved mean, with Gate and Owner as `/log` defines them. It sits in
  the first viewport at 1440 × 900 (about 55 px is free between the last row, bottom 790, and the
  legend at 845) and after the rows at 390.
- **On `/crew`:** each member is labelled an AI agent beside their job.
- **On `/log`:** the key reads the same words, from one source.
- **The goals, from now on:** every retro from sprint 38 on states its goal in a visitor's words,
  with no milestone code and no URL path. Within five sprints `/`'s five rows read plainly,
  without rewriting the record. Atlas holds this as a STATE.md line, and a data check over
  `.crew/sprint/*/retro.json` enforces it from sprint 38.

Checks, to be fixed in its contract:

- P8 the key on `/` in the first screen in every feed state, with B1.1's items and rows;
- P9 `/crew` labels each of the seven an AI agent, server-rendered and after a poll;
- P10 `/log`'s key matches `/`'s words;
- P11 the goals rule on every retro from sprint 38;
- P12 `/crew`'s riders;
- P13 `/`'s rider.

Its contract reads B1.2 (the caption), B1.5 (the block's parts), B4.18 (the rest line's place),
B4.19 (the legend), B4.22, and `crew.spec.ts` with `crew-live.spec.ts`, before placing anything.

Riders, each still open in the code today:

- `/crew` (Forge): Lens's four nits on #95. `onKey` returns early only on Ctrl and Alt, so
  Shift+Space and Meta+Space toggle the pause; the `crew-block` class is unused
  (`components/crew.tsx:217`); a `#replay` arrival in a hidden tab plays unseen; the transport
  doesn't survive a Strict Mode re-run.
- `/crew`'s long cache `expire` (Iris, sprint 35): `lib/crew-feed.ts` still has `expire: 300`.
- `/` (Iris, B4b): the chip covering the copper dot on a short seat at 1024 and below.

Found already done, so dropped:

- Lens's nit on #91: #95 removed the comment (`git log -S`).
- The `MARKS.width` nit: `lib/model/stage.ts:450`.
- B5a's `/log` riders: the request-time comments, the record's `text-wrap: pretty`, and the 66ch
  cap.

### Pc (S): the facts, scannable and shared

- Work's summaries read sentence by sentence: each sentence verbatim, in order, its own line. The
  JPMorgan figures then scan on the second look.
- The social card for `/` carries the bio's first sentence and Pa's particulars (the same rule), in
  Sofia Sans from a vendored TTF.

Checks P14 to P17, to be fixed in its contract:

- P14 the sentences, verbatim and in order, with B1.7, B2.1 and C4's residue still empty;
- P15 the card's content and face;
- P16 and P17 the riders.

Its contract reads `facts.spec.ts` (B2.1's lists and entries; nested lists change `lists`),
`profile-sections.spec.ts`, and `smoke.spec.ts`'s link-preview check first.

Riders, from the roadmap's facts-and-fonts list:

- the text face's fallback over Arial's metric twins (sprint 27);
- the project link's gap above the rule below 1024;
- the figcaption's gap at 390;
- the 404's first paint in the fallback face (no font preload);
- the card's typeface.

Left open: Detail A's dark-scheme boxes, which need a look on a real phone.

## Budgets that apply to every sprint

- **Facts first:** every new word is server HTML at full opacity, with 0 B of new script (B2.10
  unedited); B1.9's LCP stays text in the title block, the name at 1440.
- **The first screen:** B1.1 and B4.22 run unedited (contact links and the five rows inside
  1440 × 900).
- **Layout and colour:** CLS 0 (B1.8 unedited), nothing copper (B1.6 unedited).
- **Novelty:** none. The particulars and the key are familiar text; the three signature moments
  stay as built.
- **CI:** `check`'s cap is 35 minutes, and the full suite took 32.0 at 2 workers locally in sprint
  37. Each sprint reports its new specs' time and the full suite's at CI's worker count. New checks
  read the DOM on the Off path wherever they can, and use WebGL only where the hull is the
  question (P4).

## Out of scope

- The 3D, the loft, the hull's look and the replay: the owner's demos judge them, and this
  milestone must not move them under him. If Iris picks Pa's option (a), the hull moves with the
  band; the 3D suites must stay green unedited, and any pinned figure that moves comes back to
  Quill.
- Any change to what the owner's facts say: no new figures, logos, testimonials or reworded
  phrases. Particulars quote; terms carry no digits.
- Rewriting past retros' goals: the record stays as written.
- `/work/…` case studies and a published keel: both need the owner. They're the next candidates,
  each starting with an Owner's pick.
- `/read`'s head: it already holds the whole summary in the first viewport at 1440.
- Riders that loosen a live assertion wait for a PR that waits for the owner anyway:
  - the legend's "Original" while nothing is original (B1.2 and B2.9 read the Original swatch);
  - the commit-hash link (C5.3);
  - the unknown record's scripts-off blank 404, which is Next's error shell.

## What waits for the owner

Nothing in Pa, Pb or Pc. The owner may overrule, after the fact:

- the four phrases and their terms, which present his facts without changing them;
- the particulars on the approved sheet, which is Iris's call;
- the plain-words rule for goals.

The goals rule's long-term home is the sprint skill's retro step (`.claude/`, the owner's), which
goes to him as a proposal in Pb's retro.

The milestone's demo is his and optional, on Pa's preview and then production: show `/` for five
seconds, at 1440 and on a phone, to someone who doesn't know him, and ask what he does, at what
scale, and how to reach him. That's the research's comprehension test, which no one has run.
