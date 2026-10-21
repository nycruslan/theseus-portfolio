# Probe: sprint 2 contract as Playwright checks

Spec: `e2e/dark-mode.spec.ts` (new; `tokens.spec.ts`, `smoke.spec.ts` and `content.spec.ts` untouched).
Run at head `62bfe4f` (contract + direction, no implementation yet): `PLAYWRIGHT_PORT=3417 pnpm test:e2e`
(Chromium 1194 through a `PLAYWRIGHT_BROWSERS_PATH` shim, config untouched).

Result at head: 14 new checks, **3 fail** (C1 both halves, C2), 11 pass. Existing specs: 15 pass, 1 skipped
(the sprint 0 `test.fixme` in `content.spec.ts`).

The ones that already pass are guards, not misses: they hold today's state (light values, no script, no
literals, axe clean, the dark accent at 8.45:1) and must still hold after the builder changes the dark
accent, rule and `color-scheme`. Only C1 and C2 describe something that does not exist yet.

| Id | Test name (prefix) | Today | Why |
|---|---|---|---|
| C1 | `C1 color-scheme, its meta tag and native controls follow the scheme` (browser) | fail | `:root` `color-scheme` is `normal`; no `<meta name="color-scheme">`; native control and `Canvas` backgrounds are the same in both schemes (`rgb(255, 255, 255)`). |
| C1 | `C1 (grep) color-scheme is declared in the base :root rule, outside the dark block` | fail | `app/globals.css` has no `color-scheme` declaration in the base `:root` rule. |
| C2 | `C2 theme-color: one tag per scheme, each equal to its --background` | fail | 0 `<meta name="theme-color">` tags (needs 2). |
| C3 | `C3 foreground, accent and selection text meet their thresholds (light)` | pass | Uses sprint 1 light values (14.53, and 10.88 on `--rule`). |
| C3 | same, `(dark)` | pass | Foreground 15.30, accent 8.45 (apricot, will drop to about 7.45 with the direction's copper), foreground on rule above 4.5. A real guard: it fails if the new copper is too dark. |
| C4 | `C4 axe reports no violation of any impact (light)` | pass | Also asserts `color-contrast` is among the passed rules, so the rule ran. |
| C4 | same, `(dark)` | pass | As above. |
| C5 | `C5 with JavaScript off, the first paint already uses the light --background` | pass | Page scripts confirmed not run (`self.__next_f` undefined); body background equals a JS-enabled page's `--background`. |
| C5 | same, `dark` | pass | As above. |
| C5 | `C5 the two schemes paint different backgrounds with JavaScript off` | pass | Extra guard so the two equality tests above can't pass because both schemes look alike. |
| C5 | `C5 (served HTML) no script in the page implements a theme` | pass | See "Contract defects" 1: not the literal wording. |
| C5 | `C5 (grep) no client-side theme code in app/, components/ or package.json` | pass | Also bans Tailwind `@variant dark` / `@custom-variant dark`. |
| C6 | `C6 (grep) colors come from the tokens, not literals` | pass | `app/layout.tsx` exempt; `app/globals.css` scanned outside the base `:root` block and the dark block. |
| C7 | `C7 light token values, type-step declarations and body colors are sprint 1's` | pass | Literals for the 5 light colors and the 5 `--step-*` declarations; also compares to `origin/main:app/globals.css` when the clone has it. |
| C8 | not a test | not checked | `pnpm verify` and the full suite, run at the end of the sprint. |

## Mutation check

I built a scratch copy outside the repo with the direction's values applied (`color-scheme: light dark`
in the base `:root`, accent `#eb8a64`, rule `#2d4543`, a `viewport` export with `colorScheme` and the two
`themeColor` entries). All 14 new checks and the 15 existing ones passed against it. Then, in the scratch
copy only: adding `dark:bg-black text-white bg-[#123456]` to `app/page.tsx`, an `rgb(...)` color and a
`color-scheme` inside the dark block to `globals.css`, and changing one `--step-lg` value made the C5 grep,
C6, C1 grep and C7 checks fail with the offending line named. So they can fail, and they can pass.

## Contract defects found while writing the checks

1. **C5 served-HTML bullet cannot pass as written.** "No `<script>` text contains `prefers-color-scheme`":
   Next streams the React tree in `<script>self.__next_f.push(...)</script>` tags. Today's `/` already has
   one that contains `prefers-color-scheme` (the framework's own 404 boundary CSS), and once C2 is built
   the `<meta media="(prefers-color-scheme: dark)">` tags appear there too (checked on the scratch build:
   the viewport meta elements are in the flight data). I kept the intent, no script that implements a
   theme: `localStorage` and `data-theme` are banned in every script, including the flight data, and
   `prefers-color-scheme` is banned in every script that executes (everything that is not
   `self.__next_f` flight data, which is a description of elements, not code). A pre-paint theme script
   such as next-themes' is an inline executable script and would still fail it. Needs decision (Quill or
   Atlas): accept this wording, or restate the contract bullet.
2. **C1's input assumption is false in this app, but the observable exists.** In Chromium 1194 a native
   `<input>` does have a different background per scheme once `color-scheme` is declared (255,255,255 vs
   59,59,59, checked on a bare page). In this app a bare `<input>` is `rgba(0, 0, 0, 0)` in both schemes,
   because Tailwind's preflight resets form-control backgrounds to transparent. So the check sets
   `background-color: revert` on the probe `<input>`, which rolls the author style back to the browser's own
   control style (255,255,255 light, 59,59,59 dark once `color-scheme` is set; verified by setting
   `color-scheme` from script in the page). It also asserts the `Canvas` system color differs (255 vs 18),
   which is the equivalent the brief suggested. Both are soft assertions in the one test.
3. **C7 "main's" declarations.** The local `main` branch in this checkout is stale (it is Team v4, before
   sprint 1), so the check compares to `origin/main` when it exists and to literals always. A shallow CI
   checkout has no `origin/main`; the literals still cover it.

## Not testable by Playwright (proven by hand at review)

- Scrollbars and the mobile address bar actually rendering dark: `color-scheme` and `theme-color` are
  checked as values; the pixels are looked at in review screenshots.
- C7's visual half (390 and 1440 px light screenshots against production): Iris, per the contract.
- C8: CI run plus Probe's post-build run.
