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

## Sprint 4: accessibility pass (PR #17)

- **Outcome:** a CSS-only "Skip to content" link (first Tab stop, `components/skip-link.tsx`), `main#main`
  with `tabIndex={-1}`, one shared 2 px `--accent` `:focus-visible` ring in `@layer base`, the card arrow
  turns copper on keyboard focus, the card link uses `outline-none` (Tailwind's `outline-hidden` paints a
  second ring in forced colors), and Contact links are `inline-block` (24 px targets). Lens, Probe and Iris
  (advisory, 7.5/10) said ship on 863efa2, no fix rounds; at rest the page is pixel-identical to main.
- **Lesson:**
  - Writing checks first caught a contract file-scope that made a check unbuildable (C8). Contracts
    should name the outcome and let file lists be a guide, not a fence.
  - The skip link skips nothing while `main` wraps the whole page: an a11y feature can pass every check
    and still not serve its stated reason. Name the visitor's outcome as a check (Contact reachable in N Tabs).
  - Production is unreachable from cloud sessions (proxy 403); C9-style comparisons use an origin/main build.

## Sprint 5: section reveal on scroll (PR #22)

- **Outcome:** each section's h2 rises 16 px into place over the first 64 px of the section's entry,
  CSS only (`view-timeline` on the section, gated by `@supports (animation-timeline: view())` and
  `prefers-reduced-motion: no-preference`, `backwards` fill, `will-change: contents` on the h2 to keep
  rest pixel-identical). Nothing fades and nothing clickable moves. Lens ship on 0ae070e after two fix
  rounds; CI green; Iris's 7.2 changes was on the previous head. `keyboard.spec` `settled()` now waits
  only for clock animations plus two frames.
- **Lesson:**
  - A scroll-driven animation is one frame stale after a jump scroll: never move click targets with it.
  - A fade tied to scroll leaves sections mid-fade at load in some window heights, which fails axe
    contrast. The suite's fixed viewports miss such bands; sweep heights for motion work.
  - Helpers that await every animation hang on view-timeline animations; filter to `document.timeline`.

## Sprint 6: education and stack (PR #27)

- **Outcome:** Stack and Education sections in `app/page.tsx` on `Section` (so they inherit the
  heading rise): Stack a `flex-wrap` list of plain words, Education shaped like an Experience entry,
  facts verbatim. Lens ship on a7195be and on b7e0576 (Iris's cheap advice, one fix round), CI and
  gate green, Iris ship 7.3 (advisory). Chosen over the 3D hero, which is L and needs an owner contract.
- **Lesson:**
  - Specs that hard-code the page's section list (`reveal.spec.ts` C2) break on any new section;
    a contract that adds a section should name that line as an expected edit.
  - agent-browser isn't on PATH in cloud sessions; builders and Iris fell back to Playwright scripts.

## Sprint 7: 3D hero contract (PR #28)

- **Outcome:** the L lane's first step, no product code. Iris's direction (`direction-iris.md`): a
  shipwright's lift half-model, seven planks with one copper plank, hung after the header, moving only
  on scroll, an inline SVG every visitor gets and WebGL as an idle-loaded upgrade. Quill's contract
  (`contract.md`) splits it into Part A (static SVG, C1–C9) and Part B (WebGL, C10–C16) and binds it to
  the existing specs with none edited. Lens said changes three times (two fix rounds), each time on
  new findings, mostly in Part B; Atlas cut scope so Part B's checks are a draft. PR #28 waits for the
  owner (`needs-owner`), with `lens` red.
- **Lesson:**
  - Reading the existing specs before the contract found that the color scan bans `oklch(`/`oklab(`
    calls and hex-looking SVG ids, and that `reveal.spec` C2's section list makes the hero a `div`:
    each would have failed a correct build.
  - LCP on this page is body text (the bio, or the first Experience summary at 1440), not the h1.
  - Checks written for code nobody has spiked (Part B's WebGL in a software-rendering CI browser) keep
    failing review: contract only what a spike or the current page can ground, and draft the rest.
