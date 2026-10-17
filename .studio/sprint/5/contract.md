# Sprint 5 contract

Size: M. One PR, one builder (Pixel: it is motion), Probe writes the checks first, Lens reviews in CI,
Iris reviews the running site as advice (`design/calibration/` is still empty). Branch:
`sprint/5-section-reveal`.

## Goal

Roadmap item 4, the top open item: **section reveal motion on scroll, disabled under
`prefers-reduced-motion`.**

## Outcome

As a visitor scrolls, each section below the header (Experience, Projects, Contact) eases in once,
a short rise and fade tied to its own scroll position, and then sits exactly where it sits today.
It is CSS only (scroll-driven animations, `animation-timeline: view()`), so it adds no JavaScript
and works with scripts off. The header never moves or fades: the first paint shows the owner's
name at once. Under reduced motion, and in browsers without scroll-driven animations, nothing
animates and the page is the page on main. Nothing is ever hidden from a keyboard or screen-reader
visitor.

## Existing checks that bind this (keep green, unedited)

- `e2e/cards.spec.ts`: under reduced motion `document.getAnimations()` is 0 and no card element has
  a transition or animation duration; hover moves nothing.
- `e2e/invariants.spec.ts`, per scheme: axe with no violation of any impact (with motion allowed,
  so a section caught mid-reveal must not fail contrast); text uses tokens; contrast; JS-off first
  paint; tokens set.
- `e2e/smoke.spec.ts`: reduced motion loads with every h2 visible.
- `e2e/keyboard.spec.ts`: Tab order and focus rings.

## Checks

New tests go in `e2e/reveal.spec.ts` (Probe), one per check, named by number. "Motion allowed" means
`reducedMotion: "no-preference"`. Viewport 1440 x 900 unless said otherwise. A section is
`main section`. No check uses `test.skip`, `test.fixme` or `test.fail`.

**C1. Sections below the fold wait, then arrive.** With motion allowed, on a fresh load at the top
of the page, every section whose top edge is below the viewport has at least one running
`CSSAnimation` on the section or a descendant whose `timeline` is a `ViewTimeline`, and at that
moment is visibly not at rest (computed opacity below 1, or a non-identity transform or translate).
After it is scrolled so the whole section is in view, and its animations are read once the scroll
settles, every element in it has opacity 1 and an identity transform and translate.

**C2. At rest nothing moved.** With motion allowed, after scrolling each section fully into view,
the bounding boxes of every section and of its h2 match, within 0.5 px, the same boxes on the same
page loaded with reduced motion. The document height is the same in both.

**C3. The header never animates.** With motion allowed, at 1440 x 900 and at 390 x 844, on load, no
animation targets the header or anything in it, and its h1 has opacity 1 and an identity transform.

**C4. Only opacity and transform.** Every keyframe of every animation on the page (motion allowed)
sets nothing but `opacity`, `transform` or `translate` (plus `offset`, `easing`, `composite`). The
rise is at most 24 px. No section uses a time-based `animation-duration` without a view timeline
(no reveal that runs on a clock).

**C5. Reduced motion is still.** With reduced motion, `document.getAnimations()` is empty, and every
section and descendant has opacity 1 and an identity transform, at the top of the page and after
scrolling to the bottom.

**C6. Unsupported browsers see the static page.** In the page's stylesheets (CSSOM), every rule that
sets `animation-timeline`, or that names the reveal's keyframes, sits inside both an
`@supports` rule mentioning `animation-timeline` and a `prefers-reduced-motion: no-preference`
media rule. No rule outside those sets a section's opacity below 1 or a transform on it.

**C7. Works without JavaScript.** In a context with `javaScriptEnabled: false` and motion allowed,
after scrolling to the bottom, the Contact section and its links have opacity 1 and an identity
transform.

**C8. Keyboard never lands on something hidden.** With motion allowed, from a fresh load, Tab until
the first Contact link has focus; once the scroll settles, the Contact section and that link have
opacity 1.

**C9. Gate.** `pnpm verify` passes, the whole suite passes, and the diff touches no owner path and
nothing in `content/`.

## Out of scope

- Per-item stagger inside a section, parallax, and any motion on the header or 3D (roadmap item 7).
- A JavaScript fallback (IntersectionObserver) for browsers without scroll-driven animations; they
  get the static page.
- New color or type tokens.

## Notes for the builder

- `app/globals.css` and `components/section.tsx` are the expected places; that is a guide, not a
  fence.
- Reduced motion: wrap the reveal so that under `reduce` there is no animation at all (C5 and the
  cards check count `getAnimations()`), not a zero-length one.
- A section that is already partly in view at load may be partly revealed; that is fine. The header
  is the no-flash promise.
