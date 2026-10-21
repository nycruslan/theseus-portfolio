## Goal

Roadmap item "Education and stack": show the owner's education and stack (`content/profile.ts`) on the page. Chosen from the roadmap; the 3D hero above it is L and waits (see `.crew/sprint/6/decisions.md`).

**Size:** M · builder Forge · checks first by Probe · Lens in CI · Iris advisory.

## Contract

`.crew/sprint/6/contract.md`: two new sections, Stack and Education, order Experience, Projects, Stack, Education, Contact; facts verbatim, nothing added, nothing interactive, reflows on phones. Checks C1–C7 in `e2e/profile-sections.spec.ts`.

## Results

- C1–C6 in `e2e/profile-sections.spec.ts` pass; the full suite passes (47 passed, 1 skipped: the existing `content.spec.ts` fixme). `pnpm verify` exit 0. CI `check` and `gate` green.
- Lens: ship on a7195be and on b7e0576 (two nits, both in notes, fixed in the close-out).
- Iris (advisory): ship 7.3/10, `.crew/sprint/6/review-iris.md`. Took items 1 (`gap-y-1`) and 3 (`text-pretty` on the credential) in fix round 1; item 2 (drawn dots between tools) is a follow-up.
- Screenshots (not in git): Forge's at 390 and 1440 in light and dark, and Iris's PR-vs-main sets at 320/390/1024/1440, showing the page identical to main down to Projects and the two new sections below.

## Decisions

`.crew/sprint/6/decisions.md`: the goal over the 3D hero (L), section order, and one existing test line changed (`reveal.spec.ts` C2's section list, made stricter).

## Not verified

Production itself (proxy 403; origin/main stood in). Iris's screenshots predate fix round 1's 4 px row-gap change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01BNEYKy1aLTvK1HNAfW411d
