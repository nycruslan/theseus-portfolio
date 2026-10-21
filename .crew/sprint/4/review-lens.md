# Sprint 4: Lens's review of 863efa2

Verdict: ship

I reviewed `git diff origin/main...HEAD` against `contract.md` and `decisions.md` without relying on
`build-pixel.md`. The change does what the contract asks, and I found no Important issue. There are
two Nits, neither of which blocks the merge.

## How I checked

- **Cascade.** I compiled `app/globals.css` with the repo's Tailwind (4.3.3, `compile` plus `build`
  over the PR's classes; script in my scratchpad) and read the output:
  - Layer order is `theme, base, components, utilities`, and the new `@layer base` block joins the
    base layer after preflight. Its `:focus-visible` (0,1,0) comes after preflight's
    `:-moz-focusring:where(:not(iframe))` (also 0,1,0), so it wins in Firefox too.
  - The card link's `.focus-visible\:outline-none:focus-visible` sits in `utilities`, so it beats
    the base ring. If the ring were unlayered, the link would also draw a ring, so the comment's
    reasoning holds.
  - `focus-visible:outline-hidden` (the old class) compiles to `outline-style:none` plus
    `@media (forced-colors: active) { outline: 2px solid transparent }`. Forced colors paints that
    transparent ring, which caused the second ring. `outline-none` has no forced-colors branch, so
    the switch fixes the root cause. The `li` keeps `outline-style: var(--tw-outline-style)`
    (initial `solid`, not inherited), so the card still draws its ring in forced colors.
  - `[tabindex="-1"]:focus` is (0,2,0) and beats `:focus-visible` (0,1,0) whatever the order, so
    `main` shows no ring after the skip link is used.
  - On the skip link, `focus:not-sr-only` is emitted before `focus:fixed`, `focus:px-4` and
    `focus:py-2`. So `position: fixed` and the padding override its `position: static` and
    `padding: 0`. The reveal is CSS only and has no transition.
- **Layout at rest.** While hidden, the skip link is `absolute` inside the flex-column `body`, so it
  takes no part in flex layout. On the Contact links, `inline-block` gives a box exactly as tall as
  the 1.6 line box the inline link already produced, so the `li` height doesn't change. Probe still
  owns the C9 numbers.
- **404.** The skip link lives in `app/page.tsx`, not in the layout, so the 404 has no
  `href="#main"`.
- **Tests.** I read every check in `e2e/a11y.spec.ts` against the contract and asked of each one
  whether it would fail if the code were broken:
  - Removing `inline-block` fails C8 (21 px).
  - Removing the arrow variant fails C5.
  - Going back to `outline-hidden` or making the ring rule unlayered fails C6 (two outlined
    elements).
  - Dropping the `[tabindex="-1"]` rule fails C2.
  - Dropping `bg-background` fails C1 (the background is neither a token nor opaque).

  None of the checks uses `test.skip`, `test.fixme`, `test.fail`, retries or ignores. The
  `project-cards.spec.ts` change is the single added line `"Skip to content",`.
- **Scope.** `scopeNotes` from `.crew/scope.mjs`, fed the PR's per-file patches, returns `[]`. The
  diff touches no owner path and no `package.json`. The memory files it changes are the team's.
- **Gates.** `pnpm lint` and `pnpm typecheck` pass locally. On GitHub, CI `check` (verify, harness
  tests, e2e) and `scope` are green on 863efa2. I didn't run e2e in this checkout, as instructed.

## Findings

1. **Nit: `app/globals.css:85`. `[tabindex="-1"]:focus { outline: none; }` matches more than its
   comment says.** The comment says the rule is about `main`, but the selector strips the ring from
   any focused element with `tabindex="-1"`. Today only `main` has one, and a11y C4 enforces that.
   The patterns this site may add later, though, put `tabindex="-1"` on elements that do need a
   visible ring and then focus them from script: ARIA menu items, listbox options, roving-tabindex
   items, a dialog container. Each of those would lose its ring without anyone noticing.
   Fix: scope it to the landing target, e.g. `main[tabindex="-1"]:focus` or `#main:focus`.

2. **Nit: `e2e/a11y.spec.ts:442` and `:481` (Probe). C5 and C6 find "this project's link" with
   `tabUntil(page, projectLink)`, where `projectLink` matches any project link.** The loop always
   stops on the first linked card but then inspects card `index`. With today's single linked
   project the checks are correct. When a second project gets an `href`, both checks fail even
   though the code is fine: C5 reads the second card's arrow, which is muted, and C6 finds 0 rings
   in the second card. Fix: tab until the focused element is `card.locator("a")`, as
   `project-cards.spec.ts` C6 does, or pass a per-card selector such as
   `${PROJECTS} li:nth-child(${index + 1}) a`.

## Deviations from the brief, judged

- The contract asked for "one shared `:focus-visible` rule for links". The builder wrote a universal
  `:focus-visible` rule. That's better: any control added later gets the same ring by default.
- The builder also added `[tabindex="-1"]:focus`, a second rule the contract didn't foresee. C2
  ("main shows no outline while so focused") needs it, so the contract was incomplete here. That
  doesn't make the rule wrong; see Nit 1 for how far it reaches.
- The Contact links' `inline-block` is covered by decision 4.
- `ROADMAP.md` marks sprint 3's item done and annotates items 4 and 6. That is Quill's bookkeeping
  and changes none of the owner's content.

## Not verified

- Behaviour in real forced-colors mode on Windows. Playwright's emulation is what C6 exercises.
- Safari, where links are not Tab stops by default. That is pre-existing and not in this sprint.
