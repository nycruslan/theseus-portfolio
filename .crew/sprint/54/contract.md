# Sprint 54's contract: Yb, a card for every step

**Outcome.** A link to any step of the yard (`/log/n`) unfurls as that step: both ships as they
stood after sprint n, the sprint's own line, and the owner's name and role. The link to step 23,
where the last original plank leaves, unfurls as the question: *Which one is the Theseus?* `/` and
`/log` keep their cards.

Size S by the plan (`.crew/sprint/52/plan.md`, "Yb"), run as the plan staffs it: Forge builds,
Probe writes Y9 to Y11 red first, Iris judges the card at 1200 × 630 and at the crops the big
networks show. The frame is Iris's "share card for /log/23" in
`.crew/sprint/52/design/yard-states.webp`.

## What the card says (every word from the record, `profile` or the page's own rule)

- **Head line, small and muted:** `Sprint n · <the UTC day it merged>`, the day in the Log's own
  words (`lib/log-dates.ts`).
  - The frame's "Sprint 23 of 51" is dropped (Atlas): "of N" moves with every merge while a network
    caches the card it fetched once, so it would be false within a day. "Sprint 23" pairs a sprint
    number with a step count, which also misreads (22 merges, since 16 never merged).
- **Headline, the display face:** the sprint's goal (its retro's `goal`, as the page's description
  already is). On the step where the last original leaves (k = `PLANKS.length`, the step that
  carries `p[data-yard-question]`), the headline is `Which one is the Theseus?`.
- **Body:** the page's count line for that step, the same rule word for word (`countLine` in
  `components/log.tsx` moves to a plain-text function in `lib/` that both the page and the card
  call; the page's nowrap span stays). At the question's step the frame's crew-written sentence
  ("in 23 sprints") is replaced by it: 22 merges, not 23 sprints.
- **The drawings:** the Theseus above the ghost, each as `shipsAt(merged, n)` gives it, drawn by
  the lines plan's paths in the card's light tokens (the Off drawing; satori draws no WebGL). The
  current plank marked as on the page.
- **Foot, under an ink rule:** `profile.name` in the condensed display face, `profile.headline`,
  and `portfolio.ruslanshulga.com/log/n` from `SITE_URL`.
- The image's alt (`og:image:alt`) is the headline and the head line in one sentence.

## Checks (Probe, red on main first)

- **Y9:** every merged step's `/log/n` carries one `og:image` and one `twitter:image` whose path is
  its own segment's, served 200 as `image/png`, 1200 × 630. /log/13's bytes differ from /log/23's
  and from `/`'s. `/` and `/log` serve the same bytes as before (compare against the root card).
- **Y10:** the card's words come from the record and `profile`: the step's `og:image:alt` holds the
  goal (or the question at the k = 22 step, and on no other step), `Sprint n` and the merge day; the
  card text module, read in Playwright's runner, matches an oracle built from the retros, `profile`
  and the count rule. No "of N" figure anywhere on it.
- **Y11:** each step's `og:title` and `twitter:title` are `Sprint n: <goal>`, or `Sprint n: Which
  one is the Theseus?` at the question's step. The document title, description, canonical and
  og:url stay as B5.8 pins them, and B5.8's "own card" passes are kept unedited.

## Budgets

- No bytes on any page: the card renders at build from `generateStaticParams`'s steps (as each
  record already does), and no client code changes. Y8's script bytes are reported before and
  after (Lens's nit on #119).
- The build's time: report it before and after, since 52 more PNGs render.

## Out of scope

- A 3D render on the card, the page's own layout, `/` and `/log`'s cards, a step 0, the tally.
- The lines figure on a card.
- Any change to `content/` or an owner path.

## Rides along

- Lens's nit on #119: the stale layout comments in `app/globals.css` (169, 1788, 2262, 2332),
  `components/foot.tsx` and `components/bar.tsx`, brought to the phone row under the h1.
