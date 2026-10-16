# Team state

The running progress log, so the next sprint starts with what the team already knows instead of
rediscovering it. Atlas adds one entry per sprint, newest at the bottom. When this file passes about
150 lines, fold the oldest entries into a short summary at the top.

## Sprint 0 — seed created by humans

- **Outcome:** shipped.
- **What:** a minimal, static portfolio page rendered from `content/profile.ts`, plus the team setup
  (`/sprint` skill, `engineer` subagent, event hooks).
- **Lesson:** start from a deliberately simple base so every improvement is visible.

## Sprint 1 — design tokens (PR #9, left open for the owner)

- **Outcome:** built and verified, but not merged. Five colour tokens ("new copper on old bronze") and
  five fluid `clamp()` type steps are in `app/globals.css` and used across the page. Tailwind now
  scans only `app/` and `components/`, which halves the CSS (19.9 KB to 10.3 KB). Lens and Probe
  both said ship twice, and CI is green on `9461555`. Iris's advisory verdict is changes, 6.8/10,
  on owner-only items: the placeholder gate and the 7.0 bar. The PR is open with `needs-owner`,
  because the cloud proxy refuses the `theseus/*` verdict statuses, so `merge.mjs` can't see a
  verdict (see `.studio/sprint/1/decisions.md` items 5 to 7).
- **Lesson:** from a cloud routine, no sprint can merge until verdicts can reach GitHub. Check
  that the status post works at the first reviewer's stop, not at merge time. Also: try a "small"
  design fix in the browser before dispatching it. Lens-2 showed the proposed no-break-space fix
  made things worse (`review-lens-2.md`).

## Routine run, 2026-10-13 (no new sprint)

- **Outcome:** stood down. PR #9 is still open with `needs-owner` and no owner reply, and nothing
  about the cloud proxy changed, so a sprint 2 would also end unmergeable, on top of unmerged
  tokens that dark mode (item 2) builds on.
- **Lesson:** before starting a sprint, list open PRs (`gh api repos/<owner>/<repo>/pulls`) and
  read any `needs-owner` one. This run nearly re-ran sprint 1 because `.studio/sprint/` is absent
  on `main` until a sprint merges.

## Sprint 2: dark mode (PR #12, left open for the owner)

- **Outcome:** built and verified, but not merged. The theme switches in CSS only:
  - `color-scheme: light dark` and a theme-color per scheme.
  - The dark accent is copper `#eb8a64` (7.45:1), and the dark rule is verdigris `#2d4543`.
  - Light is pixel-identical to main.

  Lens and Probe said ship on `2a33b48`, with no fix rounds, and CI is green. Iris's verdict is changes, 6.8/10, only on the placeholder gate and the 7.0 bar, so the PR waits with `needs-owner`. Verdict comments now reach GitHub from the cloud (the sprint 1 blocker is gone).
- **Lesson:**
  - Writing the checks first caught a contract bullet that couldn't pass before anyone built anything. Next's flight scripts carry `prefers-color-scheme` (`probe-checks.md`).
  - Until the owner settles the rubric's placeholder gate, every visual sprint will stop at `needs-owner`. Pick non-visual items, or settle the rubric first.

## Sprint 3: project cards (PR #16)

- **Outcome:** each project is a "plank" in `components/project-card.tsx`: a `--rule` frame (full-bleed rules
  on phones, a full frame from md), an ink title with a copper underline, a muted aria-hidden arrow, the whole
  card is the link, and a 2 px copper focus ring. Lens, Probe and Iris (advisory, 7.3/10, the first sprint over
  7.0) said ship on 57999ec with no fix rounds. Probe's C10 test added a `test.skip(`, which scope.mjs
  rejects, so a spec-only fix (a10d633) went to a fresh Lens and a fresh Probe, and both said ship.
- **Lesson:**
  - A builder who measures in the browser catches what a direction misses (the 1 px border, the seam over
    the focus ring).
  - Run scope.mjs's weakening rules on a new spec before review. Any added `test.skip(`, even a
    conditional one, needs the owner.
