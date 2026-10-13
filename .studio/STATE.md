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
