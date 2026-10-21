## Goal

Redesign, direction step: the site in `PRODUCT.md` and `design/brief.md`, put on a Design canvas for
the owner to approve. This is the roadmap's top item (the owner's redesign goal of 2026-10-21); no goal
was typed for this run.

## Size

L, direction step. No product code, no `e2e/` change. **The owner approves or comments on the canvas,
not in this PR**: https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5. The build (Quill's contract, then M
sprints, the hero first) starts only once the owner approves there.

## What's here

- `.crew/sprint/17/direction-iris.md`: Iris's direction, the canvas link, what changed from sprint 15,
  the owner's four calls, the budgets and a suggested build order.
- `.crew/sprint/17/render/`: the three.js sources that rendered the canvas's model images from
  `lib/half-model.ts`'s geometry, for Pixel to reuse. Nothing imports them.
- Iris's three memory lines.

## The direction, in brief

The brief's "draw the hull, then rebuild it at sea", raised in three places: a registered loft (the
model renders orthographic exactly on its inked profile, then one dolly-zoom lifts it off the page,
once a visit, the text never moves); a white card model on drafting film, no painted sea; and four
states with one material each (ink merged, graphite in progress, copper live now only, vellum removed).
Sofia Sans replaces Geist. Every fact is `content/profile.ts` verbatim; the revisions come from the
real retros and merge times.

## Decisions for the owner (on the canvas)

1. The model's material: white card (proposed) or wood.
2. Copper means "live now" only, so links become ink.
3. The "Approved" column: "Owner" for PRs the owner accepted and "Gate" for `merge.mjs` merges, or every merge as the owner's.
4. Keep or drop "Detail A", a small schematic drawn from the JPMorgan summary's own words.

## Not verified

The renders are software-rendered frames, not a phone: the 30 fps phone budget needs Pixel's spike
before the 3D sprint. The Studio's event schema isn't checked; the live view uses this sprint's own
activity as its example.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NxZ5R8hskYjNN8aCj6MWTP
