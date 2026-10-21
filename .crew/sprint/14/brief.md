# Sprint 14: the build log's way in (PR B)

**Goal (roadmap):** "Watch the team build", PR B: the copper "Build log · N sprints" line under the bio
on `/`. **Size: S** (one addition inside `header` in `app/page.tsx`, calling the reader PR A shipped).

**Contract:** `.crew/sprint/12/contract.md`, section "PR B: the way in", checks C14 (1–6) and C15. The
owner accepted it by merging #37, with the recommended location (under the bio), not the footer.

## Order

1. **Probe** writes `e2e/sprints-entry.spec.ts`, one test per check (C14.1–C14.6, C15), derived from the
   retro files and `/sprints` as the contract says, no literal counts. It must fail on main (no home line).
   Keep the mutant pass small (cap about 10): the sprint 13 lesson.
2. **Forge** builds in `app/page.tsx` (and nothing in `content/`, owner paths or existing specs), plus
   these riders from sprint 13 (`.crew/sprint/13/retro.json` followUps):
   - Iris item 1 (`.crew/sprint/13/review-iris.md`): wrap each meta-line dot in a span with `mx-1` so the
     PR link's focus ring clears it; C6 and C8 of `e2e/sprints.spec.ts` must stay green.
   - Lens nits: the `lib/sprint-log.ts` header comment names `turbopackIgnore` on both reads but only
     `readdirSync` has it (make the comment true); `components/sprint-entry.tsx:63` keys items by text
     (key by index or text+index so duplicate items can't collide).

## Out of scope

Everything in the contract's "Out of scope"; Quill's log-length grouping (follow-up for a later sprint).
