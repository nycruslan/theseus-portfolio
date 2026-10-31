## Sprint 38: the next milestone's plan, and its first sprint's contract

**Goal (roadmap):** the redesign milestone is complete (B1 to B5 merged, B4e as #95), with only the
owner's demos left. The roadmap named no next milestone, so this notes-only sprint has Quill plan
one and write its first sprint's contract, so the next run starts its checks and build at once.

**Size:** M by the decisions it carries, with no product code.

## What's in it

- `.crew/sprint/38/plan.md`: **the proof in five seconds**, a new milestone. On `/`'s first screen,
  at 1440 and on a phone, a hiring executive reads the owner's scope and scale in his own words,
  and can tell that the names in the revision block are AI agents he directs. Three sprints:
  - **Pa (M)** the particulars: four rows, each a term and a phrase quoted word for word from the
    JPMorgan summary in `content/profile.ts` (the team of 7, workflows several thousand employees
    use firm-wide, around 8 product teams on the gateway, about 55% less manual processing).
    Server-rendered and in the first viewport at 1440 × 900 and 390 × 844. Iris places it first.
  - **Pb (M)** who built it, in plain words: a key under `/`'s revision rows, each crew member
    labelled an AI agent on `/crew`, the same words in `/log`, and retro goals in a visitor's
    words from this sprint on. It carries the riders on `/crew` (Lens's four nits on #95, the long
    cache `expire`, Iris's chip over the copper dot).
  - **Pc (S)** the facts, scannable and shared: Work's summaries sentence by sentence, and a social
    card with the bio's first sentence and the particulars in the site's typeface, plus the
    facts-and-fonts riders.
- `.crew/sprint/38/first-contract.md`: **Pa's contract**, checks P1 to P7, with the data rule worded
  once for Forge and Probe's oracle.
- `ROADMAP.md`: a new "Now" section. The redesign moves under it as finished, keeping its notes and
  the demos left for the owner. Quill also corrected rider lines that were already done in code
  (Lens's nits on #91 and #74, B5a's `/log` riders).
- `.crew/sprint/38/decisions.md` 1 to 4, `retro.json`, sprint 37's `merge.json`, and three of
  Quill's memory lines.

**Measured, not assumed** (Quill, on production on 2026-10-31 at 1440 × 900, 1280 × 720, 390 × 844
and 360 × 640): one of the seven figures in `content/profile.ts` is in the first view, and the other
six sit 1.1 to 2.0 screens down (3.0 at 360 × 640) inside one paragraph. "AI agents" appears once,
in a 13 px muted caption, and `/crew`'s body never says "AI". Rows injected into the current title
block push the contact links to y 909 to 936 at 1440 × 900, past B1.1's fold, so Pa's placement is
a design call made before the build. Atlas checked that the four quoted phrases each match
`content/profile.ts` once.

## For the owner

Nothing waits. This PR touches no owner path and edits nothing in `content/`: the particulars
quote the owner's facts and add no figures. After the fact, the owner may overrule the phrases,
the particulars' place on the approved sheet, or the plain-words rule for goals (proposed in the
retro, since the sprint skill is the owner's). The redesign's demos are unchanged. Optional, at a
demo: the five-second comprehension test in `plan.md`.

## Not verified

A real phone or GPU. No product code changed, so the site and its suite are unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvddchZW9qnzzXnFTUN
