Verdict: ready. `e2e/hero.spec.ts` holds C1 to C9 of sprint 7's Part A as tests `C1` … `C9`. All nine fail now because no `[data-hero]` exists, and the rest of the suite is green: 47 passed, 1 skipped (the existing `test.fixme` in `content.spec.ts`), 9 failed (all hero).

Commit: the sha is in the hand-back (a commit can't name itself). Branch `sprint/9-hero-half-model`, pushed with `-u`.

## Evidence

- `PLAYWRIGHT_PORT=3317 pnpm test:e2e e2e/hero.spec.ts`: 9 failed. Every one fails at `exactly one [data-hero] is on the page: expected 1, received 0`. Each test requires the box first, so none passes vacuously.
- `PLAYWRIGHT_PORT=3317 pnpm test:e2e` (whole suite): 47 passed, 1 skipped, 9 failed (the nine hero tests).
- Lint and types: `pnpm exec biome ci --error-on-warnings e2e/hero.spec.ts` has 0 errors and 0 warnings. 9 infos remain: the cognitive-complexity and function-length rules, which `biome.json` sets to `info`, as in the other specs. `pnpm typecheck` is clean.
- Weakening rules: `scopeNotes` from `.studio/scope.mjs`, run on the new spec as an added file with its patch and the repo's CODEOWNERS, returns `[]`. No `skip`, `fixme`, `fail`, `only`, `retries` or `testIgnore`. No existing spec is edited, and nothing outside `e2e/hero.spec.ts`, my memory file and this note changes.
- The checks bite. In a scratch copy (`ref/` under the scratchpad, not committed) I wrote a minimal correct hero. C1 to C9 pass on it, and so does the whole suite (56 passed, 1 skipped). Then 14 mutants, each failing the check it should:
  - extra `<title>`: C1
  - box 200 px tall: C2 and C8
  - bow inset off by 12 px: C3
  - `animate-pulse` on a lift: C4
  - 9 KB of path data: C6
  - tone at 55% foreground: C7
  - copper at 60% accent: C7
  - copper on the fifth lift: C7
  - copper 46% of the hull: C7
  - an accent-tinted lift (hue): C7
  - no `forced-colors:hidden`: C8
  - no `pointer-events-none`: C1 and C9
  - an `<a>` inside: C1 and C9
  - `data-hero-hull` renamed: C3, C6, C7
  Writing the ref also caught two bugs in my own first draft: Tailwind v4's `max-[390px]` is `<` not `<=`, and a `--background` stroke on the copper plank. Both were the ref's fault, not the spec's; the spec reads as the contract does.
- **C5 baseline** (the carried nit): the LCP check run on the current build, which has no hero and the same product code as `origin/main` 31daf2c (only `.studio` and `CLAUDE.md` differ). At 4x CPU, three runs each at 390, 1024 and 1440:
  - 390: LCP 180, 236 and 264 ms, element the bio `<p>`.
  - 1024: 168, 192 and 136 ms, the bio `<p>`.
  - 1440: 176, 132 and 136 ms, the first Experience summary `<p>`.
  These are far under 2500 ms, and the LCP assertions pass; only the hero-presence assertion is red. A later red on LCP time or element is the hero's. Not a gate, shown for the report: with a hero the throttled LCP should stay within 100 ms of those figures. On the ref hero, one run was 212, 156 and 160 ms. The spec logs `LCP at 4x CPU throttle: ...` and adds it as a test annotation.
- **C6 baseline for Pixel**: `/` on the current build has 6 script tags, 571283 bytes raw and 175517 gzip, with a 32541-byte HTML response (summed from the HTML's `src` list on a `next start`). `next build`'s first-load figure for `/` is what the contract names; Pixel shows it, or these sums, for both builds, and says which.

## How each check maps to assertions

All geometry is measured in the browser, soft-asserted so one run lists every miss. A section's reveal `translate` is subtracted before any gap is measured.

- **C1 (1440 and 390).** Exactly one `[data-hero]`. A `DIV`; `parentElement` is `main`; `previousElementSibling` is `main > header`; `nextElementSibling` is the first `main > section`. `aria-hidden="true"`; computed `pointer-events: none`. No non-blank text node (tree walk). None of `img, image, video, canvas, [tabindex]`, and also none of `title, text, foreignObject`, which the Existing-checks section implies. No element inside matching a focusable selector or having `tabIndex >= 0`. No computed `background-image` other than `none` on the box or any descendant.
- **C2 (320, 390, 600, 767, 768, 1024, 1440).** Box width and height within 1 of `boxSize(clientWidth)`: 688 x 172 from 768, else `clientWidth` x `min(clientWidth / 2.9, 172)`. Never over 172. Box top minus header bottom, and first section top minus box bottom, are 64 within 1. `scrollWidth - clientWidth` is 0 at 320. At 390 x 844, 1024 x 768 and 1440 x 900, the part of the box inside the first viewport is at least half its height.
- **C3 (same seven widths).** Header's right edge matches `cw - 24` below 672 and `(cw + 624) / 2` above (within 1). Hull's right edge is the header's within 2. Hull width: `1.12 x cw` up to 390 (within 3); `437 + (cw - 390) x 187 / 378` from 390 to 768 (within 3); 624 from 768 (within 2). At 768 and up, hull left is the header's (within 2). At 320 and 390 hull left is negative. Hull left and width at 767 vs 768 differ by at most 2.
- **C4 (390, 1024, 1440, then 1440).** A `layout-shift` observer (`hadRecentInput` excluded) sums to exactly 0 across `load` plus a 2 s pause. With JavaScript off (a second context), the box's left, top, width and height equal the scripts-on box within 0.5. `hero.getAnimations({subtree: true})` is 0 at rest and after scrolling to half and to the end. After each scroll, the box's `outerHTML` and its (and all descendants') computed `fill`, `stroke`, `opacity`, `transform`, `display` and `visibility` are unchanged, and its page position and height are within 0.5.
- **C5 (390 x 844, 1024 x 768, 1440 x 900).** CDP `Emulation.setCPUThrottlingRate` 4. A buffered LCP observer records the last entry: its element exists, is in `main`, is not in `[data-hero]`, its `url` is `""`, and its time is at most 2500 ms. The hero's presence is asserted last and softly, so the baseline run above is meaningful.
- **C6 (1440).** `outerHTML` in UTF-8 bytes is at most 8192. A plain `request.get("/")` body contains `data-hero-hull`. No external script response contains `data-hero`, as a client component would put it there; a proxy for "no client component". First-load JS equal to `origin/main` can't be seen from one build in a browser; per the carried nit it stays in Pixel's report (`next build`'s figure, or chunk bytes in `.next` for both builds), and Lens checks it. "No dependency" is the diff's, shown by `package.json`.
- **C7 (1440, light and dark).** Every `path, line, rect, polygon, polyline, circle, ellipse` in the box has computed `fill` and `stroke` read; `none` and `url()` are skipped, `line` has no fill, and a zero-width stroke is skipped. Every `stop`'s computed `stop-color` is read. Each is resolved through a canvas, composited at its opacity over the resolved `--background`, and rounded to 8 bits. The stops of a gradient that a copper shape's fill or stroke uses (following `href` chains) are copper tones; all other stops, and every shape outside `[data-hero-copper]`, are non-copper tones. Non-copper: equal to `--background` exactly, or contrast 1.15 to 3.0; and for chroma at least 0.005, hue within 10 degrees of `--background`'s. Copper: hue within 3 degrees of `--accent`'s, chroma within 0.03, lightness within 0.06, for every tone. Exactly one `[data-hero-copper]`; exactly seven `[data-hero-lift]`, all `path`. The copper plank is, or is inside, the third lift counted in DOM order (first to seventh), or a separate path whose vertical centre is nearer the third lift's than any other's. Copper width is 20% to 40% of the hull's. At least one tone of each kind must be read, so an empty read can't pass.
- **C8.** At 1440 and 390: JavaScript off, and `reducedMotion: reduce` (new contexts): the box is present, `toBeVisible`, and has the C2 size. With `forced-colors: active` at 1440: computed `display` is `none`.
- **C9.** No `pageerror` and no console error on load (1440, after load and fonts and 0.5 s). Axe with the strict tags (the same set as `invariants.spec.ts`) at 1440 and 390 in light and dark: no violation. A 3 x 3 grid of cell centres inside the box, with the box scrolled to the middle of the viewport: `elementsFromPoint` minus `html`, `body` and `main` has nothing at or inside the hero, and nothing matching `a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])`. `pnpm verify`, the whole suite and the diff's scope are CI's and the gate's; the diff must touch no owner path.

## What Pixel must hit (hooks and numbers)

- **Hooks.** `div[data-hero][aria-hidden="true"]` as a direct child of `main`, between `header` and the first `section`; `[data-hero-hull]` (the group of all lifts); exactly seven `path[data-hero-lift]`; exactly one `[data-hero-copper]`. No `tabindex`, no text node, no `<title>`, no `<text>`, no `img`, `image`, `canvas`, `a`.
- **Lift order.** The seven lifts are counted in DOM order, first to seventh; the copper plank sits on the third. State in a source comment on the hull group whether the first lift is the keel or the sheer. (React drops JSX comments, so the spec can't read it; this is a note for Lens.)
- **Box.** 688 x 172 at 768 and up (hangs 32 px past the 624 column each side). Below 768: width `clientWidth`, height `min(clientWidth / 2.9, 172)` (110 at 320, 134 at 390, 172 at 600 and 767). 64 px above and below. At least half in the first viewport at 390 x 844, 1024 x 768 and 1440 x 900.
- **Hull.** Measured as the `getBoundingClientRect` of `[data-hero-hull]` (unclipped geometry, strokes not included). Right edge on the header's right edge (`cw - 24` below 672, `(cw + 624) / 2` from there). Width `1.12 x cw` to 390, then linear to 624 at 768 (437 at 390), then 624. Stern cropped off the left at 320 and 390. Continuous across 767/768. In Tailwind v4, `max-[390px]` means `width < 390`, so the 390 px boundary needs care.
- **Tones** (the quiet bar): every non-copper fill or stroke is `--background` exactly or 1.15:1 to 3.0:1 against it in both schemes (aim near 2.8 at the darkest), with hue within 10 degrees of `--background`'s. Use `color-mix(in oklab, var(--token) N%, var(--background))`. A shape with no `fill` set paints black: set `fill` (or `none`) on every `path`, `rect` and `polyline`.
- **Copper.** The copper plank, and every stop of a gradient it uses, within 3 degrees of `--accent`'s hue, 0.03 chroma, 0.06 lightness. **Give the copper plank no stroke:** any stroke on `[data-hero-copper]`, even a `--background` seam, counts as a copper tone and fails the window. Draw its seams on the neighbours. Width 20% to 40% of the hull's width.
- **Weight and render.** `outerHTML` of the box at most 8192 bytes; in the HTML response; no client component, so no `data-hero` in any JS chunk.
- **Nothing else.** `pointer-events: none` on the box, `forced-colors: active` gives `display: none`, no animation or transition on or inside the box, CLS 0, same rect with scripts off, `div` not `section`, no edit to an existing spec.
- **What the spec cannot do.** It cannot tell which lift is "third" if Pixel draws the copper as an overlay far from the third lift's centre; keep the overlay on the third lift's band. It also doesn't assert the first-load JS figure (see C6).

## Not verified

- The real hero doesn't exist. The spec's geometry and colour reads are proved only on my scratch reference hero and its mutants, not on Pixel's markup.
- Production wasn't reachable; the C5 baseline is the local production build, not Vercel.
- The 100 ms LCP comparison is a report line, not a gate; one ref run shows it, not Pixel's.
- C9's "diff touches no owner path" is the gate's job; I didn't test it.
- Tokens and minutes: I don't have the figures.
