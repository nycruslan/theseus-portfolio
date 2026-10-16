# Sprint 4: Probe's verification of PR #17, head 863efa2

Verdict: ship

Tested from a fresh checkout of 863efa2 (detached), not the builder's account. Base is origin/main f400ae0.

## Checks, by number

| Check | Result | Evidence |
|---|---|---|
| C1 skip link first, hidden until focused | pass | `e2e/a11y.spec.ts` C1 green. By hand (agent-browser, session probe2, light and dark, 390 and 1440): first Tab lands on `a[href="#main"]` "Skip to content", box 8,8 145x42 (390) / 158x45 (1440), ring `solid 2px` copper. |
| C2 skip link works | pass | Green. By hand, Enter gives `#main`, `activeElement` is `main#main`, outline `none 0px`; next Tab lands on the Theseus link. Same with JavaScript off (Playwright, `javaScriptEnabled: false`): Enter gives `#main`, main focused, next Tab on Theseus. The 404 has no skip link (tested by the check). |
| C3 landmarks and headings | pass | Green (a guard, it already held before the build). |
| C4 one focus look | pass | Green. By hand: tab order skip, Theseus, GitHub, LinkedIn, then body (wraps to skip). Contact and skip rings `solid 2px` `rgb(148,65,38)` light / `rgb(235,138,100)` dark, offset 2px; the project card's link draws none and its `li` draws the ring (screenshots). |
| C5 arrow follows keyboard focus | pass | Green. Screenshot `ab-card-dark-1440.png` shows a copper arrow with the card ring. Mouse down on the card shows no focus ring (focus-visible does not match), contact click shows no ring and a muted arrow. |
| C6 forced colors one ring | pass | Green. By hand with `forcedColors: active` at 390 and 1440: card focused gives exactly one ring, on the `li` (`solid 2px rgb(0,0,0)`), `a` is `none`; skip and first Contact link `solid 2px`. Screenshots `fc-card-*`, `fc-contact-*`, `fc-skip-*`. |
| C7 strict axe | pass | Green (4 combos x 2 states). |
| C8 targets | pass | Green (Contact links `inline-block`, decision 4). |
| C9 page at rest unchanged | pass | See below: every delta is 0.00 px. `content/` has no diff. |
| C10 nothing regressed | pass | `pnpm verify` exit 0. `PLAYWRIGHT_PORT=3331 pnpm test:e2e`: 38 passed, 1 skipped (the owner's `test.fixme` for `TODO(owner)`, untouched), 0 failed. `package.json`, `biome.json`, `knip.json`, `playwright.config.ts`, `.github`, `content/` have no diff. |

## C9 numbers (origin/main build vs the PR build, one run, `.studio/sprint/4/` scratchpad script)

Production (https://theseus-portfolio.vercel.app) is not reachable from here: the sandbox proxy answers 403 to the CONNECT. So the comparison is against a build of origin/main (f400ae0), as the contract allows. Boxes are x, y, width, height in CSS px.

| Scheme, width | main origin/main | main PR | h1 origin/main | h1 PR | Max delta |
|---|---|---|---|---|---|
| light 390 | 0, 0, 390, 1186.84 | same | 24, 96, 342, 49.75 | same | 0 |
| light 1440 | 384, 0, 672, 1188.41 | same | 408, 96, 624, 76 | same | 0 |
| dark 390 | 0, 0, 390, 1186.84 | same | 24, 96, 342, 49.75 | same | 0 |
| dark 1440 | 384, 0, 672, 1188.41 | same | 408, 96, 624, 76 | same | 0 |

Document height is also identical (1187 at 390, 1188 at 1440).

## Scope rules over `git diff origin/main -- e2e/`

`.studio/scope.mjs` `scopeNotes` fed the diff: `e2e/a11y.spec.ts` added (+608, -0), `e2e/project-cards.spec.ts` modified (+1, -0). Notes: none. The one change to project-cards C2 is the added line `"Skip to content",` at the head of `expected`, which removes no line and is not a weakening. No `test.skip`, `fixme`, `fail`, `only`, `retries` or ignore in `e2e/a11y.spec.ts`. No owner path appears in `git diff --name-only origin/main`.

## Tried to break it

- JS off: skip link works as a plain fragment link (above).
- Reduced motion at 320 px: skip link focused, box 8,8 144x42, no horizontal overflow (scrollWidth 320).
- Shift+Tab back to the skip link after scrolling 536 px: it shows at 8,8 (fixed), so it is reachable from anywhere.
- Click on non-link text: focus goes to `main` (tabindex -1), no ring; next Tab goes to the first project link.
- Mouse press on a Contact link or a card: no keyboard ring left behind.

## Not checked / limits

- Production could not be reached, so no side-by-side with the deployed site; the origin/main build stands in.
- No screen reader run (VoiceOver, NVDA). Accessible names and landmarks are covered by C1, C3 and axe only.
- Forced colors was Chrome's emulation, not Windows High Contrast. Contact and skip rings come out in a different system color (`rgba(5,0,73,0.8)`) from the card's (`rgb(0,0,0)`); each is one visible ring. Noting it, not a failure.
- agent-browser's headless Chrome has `(hover: hover)` false, so hover was checked in Playwright only (C5 and project-cards C7).

## Evidence files

Screenshots: `/tmp/claude-0/-home-user-theseus-portfolio/d0d1e768-e1be-5dc2-8708-509314b09678/scratchpad/s4-probe/` (`ab-skip-*`, `ab-card-*`, `ab-contact-*`, `ab-afterskip-*`, `ab-rest-*`, `fc-*`, `nojs-skip-390.png`, `skip-320-reduced.png`, `rest-pr-*`). Scripts: `c9.cjs`, `ab.sh`, `extra.cjs`, `mouse.cjs`, `scope-check.mjs` in the same folder. Full e2e log: `.../scratchpad/e2e-full.log`.
