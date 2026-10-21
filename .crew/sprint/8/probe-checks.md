# Sprint 8: Probe's checks

Spec: `e2e/hero.spec.ts`, nine tests named `C1 …` to `C9 …` after C1 to C9 of
`.crew/sprint/7/contract.md` ("Part A"). No `skip`, `fixme` or `fail`. No existing file touched;
`e2e/helpers.ts` is imported, not edited. `pnpm lint` and `tsc --noEmit` pass on the spec.

## State now

On the current page (a build of this branch's HEAD, no hero) all nine fail, each on the missing hero
(`exactly one [data-hero]: expected 1, received 0`, or the box/hull being null). C5 fails on the same
precondition: it asserts the hero is in the page before it rules the LCP out of it, because without
that, "the LCP is not in the hero" is true of any page.

## Proof they are buildable and bite

A scratch copy of the app with a hand-written hero (seven `path` lifts with two gradients, one copper
`path` on the third, two background-colored butt lines, the box and hull sized in CSS) passes all nine,
passed 6 repeats at 4 workers, and the **whole existing suite** (56 passed, the one `content.spec.ts`
fixme skipped) with it, so none of the "existing checks that bind this" is broken by a correct hero.

29 mutants of that hero, one fault each, each caught by the check that owns it:

| Mutant | Fails |
| --- | --- |
| box is a `section` | C1, C2 |
| `pointer-events` left on | C1, C9 |
| `tabindex=0` on the svg | C1, C9 |
| `<a>` around the hull | C1, C9 |
| `<title>` text inside | C1 |
| `background-image: url()` on the box (real PNG) | C1, C5 |
| `<image href>` inside the svg (real PNG) | C1, C5 |
| box 180 px tall | C2, C8 |
| box nudged 16 px into the header gap | C1, C2 |
| bow fixed at 32 px from the box edge | C3 |
| hull 624 from 390 up (no growth), or +20 px step in the ramp, or 600 px at 768 | C3 |
| lifts at 30%/25% mix (too loud) | C7 |
| lifts mixed with `--accent` (pink) | C7 |
| dark scheme only too bright | C7 |
| `opacity: .5` on the hull | C7 |
| copper on the 5th lift / 50% wide / hue pulled by `--foreground` | C7 |
| a second `[data-hero-copper]` / six lifts | C7 |
| load-in `opacity` keyframes (1 s) | C4, C7 |
| scroll-timeline `translate` on the hull | C4 |
| 0.1 s `@starting-style` opacity transition | C4 |
| 900 extra path segments (> 8 KB) | C6 |
| client-only render (`useEffect`) | C6, C8 |
| `forced-colors` rule removed | C8 |

Report-only numbers, scratch hero vs a build of this branch's HEAD (no hero), 4x CPU:
LCP 124 vs 152 ms (390), 164 vs 168 (1024), 188 vs 168 (1440): within 100 ms, and the LCP element is
the same `<p>` in both. First-load JS for `/`, gzip of the six `<script src>` chunks: 175,517 bytes
in both (equal). Both are for the builder to repeat on the real hero; the spec prints the LCP delta as
a test annotation when `PLAYWRIGHT_BASELINE_URL` points at a build of `origin/main` (JSON reporter
shows it), and never asserts on it.

## How I read the contract (ambiguities, none unbuildable)

- **C1 "no text node":** no text node with non-whitespace data. `focusable="false"` on the svg (the
  old attribute) is fine; `focusable="true"` is not. I also require every element inside to compute
  `pointer-events: none` (a child that turned it back on would be hit through the box), that
  `.focus()` on each element leaves focus outside the box, and no background image on `::before` /
  `::after`.
- **C2 extras:** "never taller than 172" is also checked at 360, 480, 500, 700, 1920. First-viewport
  check uses the scroll-0 rect at 390x844, 1024x768 and 1440x900.
- **C3:** the ramp starts at `1.12 x 390 = 436.8`, not 437. Tolerance is 3 px below 768 and 2 px from
  768 up; 767 vs 768 must agree in left edge and width within 2.
- **C4:** the contract gives no viewport for "scripts on vs off"; I use 390 and 1440. "Nothing about
  the hero changes when scrolled" = its `outerHTML`, document rect and a screenshot of the box are
  identical at scroll 0, 120, 400 and after a full scroll and back, and no `animationstart`,
  `transitionrun` or `transitionstart` event had the box as target (so a 100 ms load-in that is over
  before the test looks is still caught).
- **C5:** LCP is the last `largest-contentful-paint` entry after load plus 1.5 s at 4x CPU. Chrome
  ignores `data:` URLs and flat low-entropy images as LCP candidates, so only a real, busy image
  makes C5 itself bite; the static part (no `img`, `image`, background image) is C1's.
- **C6:** the first-load JS comparison is not in the spec (report-only, above).
- **C7, the reading that matters most to the builder:**
  - "The third lift" is the third `[data-hero-lift]` **in DOM order**, and the seven lifts must
    be stacked in DOM order (centers strictly rising or strictly falling), or "third" means nothing.
    The copper plank must lie within that lift's `getBoundingClientRect` (1.5 px slack). It is a
    separate shape, not the lift path itself (the lift is the full hull length; copper must be 20-40%
    of the hull's width).
  - Tones are read per painted shape and per `<stop>`. A `url()` fill is skipped and its stops are read
    instead; a gradient is "copper" if a copper shape (or one inside `[data-hero-copper]`) paints with
    it and no other shape does. A tone's effective alpha folds in `fill-opacity` / `stroke-opacity` /
    `stop-opacity` and `opacity` on the shape and its ancestors up to the box, composited over
    `--background`, so an opacity trick cannot move a tone out of the window.
  - "`--background` exactly" is an exact 8-bit match after compositing (a seam). Seams in
    `--background` are also allowed on the copper plank; every other copper tone must be copper.
  - Hue test skipped under chroma 0.005, as amended. A copper plank needs at least one copper tone.
  - Contrast is the WCAG ratio against the resolved `--background`, per scheme.
- **C8:** "same rect as C2" is tested at 320, 390, 768 and 1440 with scripts off, reduced motion, and
  both. I added Save-Data plus `hardwareConcurrency`/`deviceMemory` 2: the box is unchanged (the
  contract says they do nothing in Part A).
- **C9:** the diff-touches-no-owner-path and `pnpm verify` parts are not browser tests; the `gate`
  check and CI own them (I did not try to read git history from a test). Hit-test points are the
  1/6, 1/2 and 5/6 positions on each axis (nine points), after centring the box, at 390 and 1440. I
  added a 12-stop Tab walk asserting no stop is inside the hero, and axe at 390 and 1440 in both
  schemes with the tags `invariants.spec.ts` uses.

## For the builder

- **Header geometry** (measured on HEAD, font loaded; heights vary with the font): `main` is
  `max-w-2xl` with `px-6`, so the header's box is `[24, cw-24]` below 672 and 624 wide centred above.

  | cw | header left | header right | header top | header bottom |
  | --- | --- | --- | --- | --- |
  | 320 | 24 | 296 | 96 | 599 |
  | 390 | 24 | 366 | 96 | 474 |
  | 600 | 24 | 576 | 96 | 404 |
  | 767 | 71.5 | 695.5 | 96 | 415 |
  | 768 | 72 | 696 | 96 | 415 |
  | 1024 | 200 | 824 | 96 | 433 |
  | 1440 | 408 | 1032 | 96 | 461 |

  The box top is header bottom + 64 and the first section starts 64 below the box (`gap-16`; a
  `display: none` box under forced colors drops its gap, which is right).
- **Where the hull's bow sits in the box:** 24 px from the box's right edge below 672; `(cw - 624) / 2`
  from 672 to 767 (the box is `cw` wide there, so the bow slides in from 24 to 71.5); 32 px from 768
  (the box is 688, centred). Width: `min(1.12 cw, 436.8 + (cw - 390) x 0.4947, 624)` (concave, so a
  CSS `min()` of the three is exactly the contract's curve). Use the box's own width (`cqw`, with
  `container-type: inline-size`) rather than `vw`, in case a scrollbar is present.
- **Box CSS that passes C2** (what the scratch hero uses): below 768 `width: 100vw` (or the
  container), `margin-inline: calc(50% - 50vw)`, `height: min(100vw / 2.9, 172px)`; from 768 `width:
  688px; margin-inline: -32px; height: 172px`; `pointer-events: none`; `display: none` under
  `@media (forced-colors: active)`.
- **`[data-hero-hull]`'s rect is its geometry**: Chrome's `getBoundingClientRect` on a `g` is the union
  of its children's fill boxes. Strokes are not counted and curves are exact (not control points), so
  the tips of the top lift decide the hull's edges, and a hairline stroke overhanging the tip is fine.
  Anything inside the `g` counts, including the copper plank and seam lines; keep them inside the
  hull's span.
- **Tones the light and dark schemes measured as passing:** gradient stops of
  `color-mix(in oklab, var(--background) 66-78%, var(--muted))`: oklab L about 0.79-0.85 (light) and
  0.30-0.36 (dark), all inside 1.15-3.0 : 1 and hue-neutral. Copper as plain `var(--accent)`.
  Mixing in `--muted` keeps hue; mixing in `--accent` (pink) or `--foreground` at 30% fails.
- Per-lift `<path>` with no children, one `data-hero-lift` each; seams are the 1 px gap between
  lifts (the `--background` showing through) or lines in `var(--background)`.
- A scratch tip: a correct hero adds no client JS, but check `next build`'s first-load JS for `/`
  against `origin/main`: the scratch hero changed it by 0 bytes.
