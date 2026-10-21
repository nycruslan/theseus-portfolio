Verdict: ship

# Sprint 2, Lens code review

PR #12, branch `sprint/2-dark-mode`, reviewed at `2a33b4889b9639ca98e6553bc5c171ddad4dae01`.
Scope: `git diff origin/main...HEAD`, checked against `contract.md` (C1 to C8), `decisions.md` items 1
to 4 and `direction.md`. The product code is `app/globals.css` and `app/layout.tsx`. I also read
Probe's `e2e/dark-mode.spec.ts`, looking for checks that could pass without testing anything.
Everything below comes from my own builds and browser runs. I didn't rely on the builder's account.

## Findings

No Important findings. Two Minor findings and one Nit. None of them is in the product diff, and none
blocks the merge.

1. **Minor (e2e, Probe): the C5 grep misses Tailwind's arbitrary dark media variant.**
   `e2e/dark-mode.spec.ts:474-487`. The banned list catches `dark:` and `@variant dark` / `@custom-variant dark`. It
   doesn't catch `[@media(prefers-color-scheme:dark)]:`, because there `dark` is followed by `)`,
   not `:`. I compiled `[@media(prefers-color-scheme:dark)]:bg-foreground` with the repo's
   `tailwindcss` 4.3.3, and it emits a second `@media (prefers-color-scheme:dark)` rule. That's
   exactly the hidden second dark rule the check's own comment says it guards against. It uses a
   token, so C6 passes too, and tokens C5 only reads `globals.css`. Today's product code has no such
   class, so this is a gap in the guard, not a defect in the build. Fix: in the C5 grep, ban
   `prefers-color-scheme` in every file under `app/` and `components/` except `app/globals.css`.
   That one pattern covers the arbitrary variant, inline `<style>` blocks and `matchMedia` strings
   alike.

2. **Minor (pre-existing, made a little more visible by C2): the 404 page ignores the tokens, and now
   its address bar doesn't match it.** There's no `app/not-found.tsx`, so Next renders its
   built-in fallback. That fallback inlines `body{color:#000;background:#fff}` and a
   `prefers-color-scheme:dark` override to `#fff` on `#000`
   (`node_modules/next/dist/client/components/http-access-fallback/error-fallback.js`). In the
   browser at 390 px, `/nope` paints `rgb(0, 0, 0)` in dark and `rgb(255, 255, 255)` in light.
   The root layout's new theme-color metas still say `#091413` / `#e6f3f1`, so on a phone the
   address bar is hull-green above a pure-black page. On `main` the 404 already ignored the palette.
   This sprint adds the mismatched bar. The contract scopes everything to `/`, so this is outside
   it. Fix, in a later item: a small `app/not-found.tsx` that uses the tokens. It's a server
   component with no new colors. Route it to item 3 or item 6.

3. **Nit (e2e, can't be edited this sprint): one tokens.spec name is now stale.**
   `e2e/tokens.spec.ts:340`'s describe block is still named "C5 the dark block stays parity-only".
   The block is a designed theme now. The assertion is still right (one dark block, five tokens). The
   contract says existing e2e files stay unedited, so Probe can rename it in a later sprint.

## The product diff, checked

- **`app/globals.css`.** `color-scheme: light dark` is in the base `:root` rule, outside the dark block.
  The dark block sets exactly the five tokens, using Iris's values. I recomputed every pair from the
  hex values (WCAG 2.x):

  | Pair | Dark | Light |
  |---|---|---|
  | foreground / background | 15.30 | 14.53 |
  | muted / background | 7.60 | 6.15 |
  | accent / background | 7.45 | 6.06 |
  | foreground / rule | 8.39 | 10.88 |

  That meets C3 (7 / 7 / 4.5) and tokens C4 (4.5). The oklch comments are accurate. `#eb8a64` is
  oklch(72.9% 0.130 42) and `#2d4543` is oklch(37.0% 0.030 189). The `@source` housekeeping comment
  (sprint 1 Nit 2) is in place.
- **Compiled CSS** (`.next/static/chunks/*.css`, 10,424 bytes). It has one `@media
  (prefers-color-scheme:dark)` rule, and `color-scheme:light dark` sits in the base `:root`. Lightning
  CSS adds its `light-dark()` polyfill pair, `--lightningcss-light` / `--lightningcss-dark`, to both
  `:root` rules because `color-scheme` is declared. Nothing reads them, they don't change rendering, and
  tokens C5 checks the source, so this is only something to know about if a later check reads the
  compiled CSS.
- **`app/layout.tsx`.** It's a typed `Viewport` export, alongside `metadata`, as Next 16 expects. The served head has
  `<meta name="theme-color" content="#e6f3f1" media="(prefers-color-scheme: light)">`, the dark
  twin with `#091413`, and `<meta name="color-scheme" content="light dark">`, all before the
  title. The two literals duplicate the tokens, but the comment says so, and C2 pins them to the
  resolved `--background`, so a drift fails CI. `ensureStatic` still holds: `/` and `/_not-found`
  are prerendered (`○`).
- **Light unchanged.** The only declarations that apply in light are `color-scheme` and the two
  unused polyfill variables. With a light preference, the used scheme is light, which is what
  `normal` gave before. C7 holds the five values as literals. I didn't do a pixel comparison
  against production. That's Iris's visual half of C7.
- **Running site** (served build, Chromium 1194, 390 px, both schemes). Body background and color
  equal the tokens. Links are `rgb(235, 138, 100)` in dark and `rgb(148, 65, 38)` in light. There's no
  horizontal overflow, no console errors, and axe reports zero violations and zero incomplete in each
  scheme, so nothing contrast-related slipped into "needs review". Whole-page selection in dark shows
  foreground on the verdigris rule, legible everywhere, links included.

## The e2e spec, checked for vacuous passes

Each check has something that makes it able to fail:
- C4 asserts that `color-contrast` is in `passes`, so the rule ran.
- C5's no-JS equality tests are paired with a "the two schemes differ" test, and they assert
  `self.__next_f` is undefined, so the scripts really didn't run.
- C2 resolves an invalid `content` to `(not a color)`.
- C1 checks the computed `color-scheme` and the meta tag separately, so removing either one fails.

Probe's mutation run (`probe-checks.md`) covers the grep checks. The one gap I found is finding 1.
C7's comparison with `origin/main` is skipped on a shallow clone, but the literals still cover it.

## Evidence

- `pnpm verify` at `2a33b48`: lint, typecheck, knip and build all pass (exit 0).
- `PLAYWRIGHT_PORT=3463 pnpm test:e2e` at `2a33b48`, through the scratchpad Chromium 1194 shim:
  29 passed and 1 skipped (the sprint 0 `test.fixme` in `content.spec.ts`). All 14 dark-mode checks
  pass, and the 15 existing checks pass unedited.
- Scratch browser script (scratchpad, not committed): the values quoted above, plus screenshots of
  dark selection and the dark/light 404.
- Tailwind compile of the arbitrary variant: emits `@media (prefers-color-scheme:dark) { .\[\@media\(prefers-color-scheme\:dark\)\]\:bg-foreground {...} }`.

## Not verified

- A pixel diff of light against production. Iris does that.
- The real mobile address-bar color on a device. Only the meta values are checked.
- Browsers other than Chromium.
