# Probe's checks, sprint 5

`e2e/reveal.spec.ts`: eight tests, `C1.` to `C8.`, one per numbered check in the contract. C9 is the
gate (evidence only, at the end). Viewport 1440 x 900 and `reducedMotion: "no-preference"` are set
for the whole file; C3 also visits 390 x 844, C5 and C2 switch to reduced motion with
`emulateMedia`, and C7 turns scripts off.

## State today

On the current product (no reveal) all eight fail, each at its first assertion and for the same
reason: there is no `CSSAnimation` on a `ViewTimeline` in any section. C1 says "running view-timeline
CSSAnimations on contact or inside it: expected > 0, received 0". The others fail on the shared
precondition `expectRevealExists` ("with motion allowed there is a view-timeline CSSAnimation in a
section ...").

Why a precondition in C2, C3, C5, C6, C7 and C8: "nothing moved", "the header never animates" and
"reduced motion is still" are all true of a page with no reveal. Without it they would pass today and
keep passing if the reveal were deleted. Tests that need the reveal to exist say so first.

## What each check reads

One in-page pass (`read`) returns every section's boxes, the elements in it that are not at rest, and
every animation (kind, timeline is a `ViewTimeline`, target, keyframe properties, largest vertical
offset). "At rest" is opacity 1 (within 0.001) and an identity `transform` and `translate` (within
0.01). The test waits for the scroll to hold for a quarter second (polling from the test; with scripts
off, `requestAnimationFrame` and timers in the page never fire, so nothing in the page is awaited).

- C1. At load, 1440 x 900, only Contact is below the fold (Experience top 421, Projects 745 of 900,
  Contact 1019; the page scrolls only 288 px). It must have a running view-timeline `CSSAnimation`
  and be visibly not at rest. Then it is centred (it clamps at the bottom, still wholly in view) and
  every element in it is at rest.
- C2. Section and h2 boxes in document coordinates, section by section after scrolling each to the
  middle, against the same page under reduced motion; each of left, top, width, height within 0.5 px;
  document height equal after scrolling to the bottom.
- C3. At both sizes: no animation whose target is the header, inside it, or an ancestor of it (an
  animation on `main` would fade the name too, so it counts); the h1 and every ancestor at rest.
  Checked on load, settled, at the bottom and back at the top.
- C4. Union of `document.getAnimations()` at the top, at each section and at the bottom (not
  `CSSTransition`s, which are card colour fades). Keyframe keys must be within opacity, transform,
  translate, offset, computedOffset, easing, composite. The rise is read by resolving each keyframe's
  transform and translate on a probe the target's size (so `rem` and `%` work), at most 24 px. No
  element in a section has an `animation-name` with `animation-timeline: auto` and a nonzero duration,
  and no `CSSAnimation` in `main` is on the document timeline.
- C5. Precondition, then reduced motion: `getAnimations()` empty and every section element at rest, at
  the top and at the bottom.
- C6. CSSOM walk (nested rules too). A rule "belongs to the reveal" if it sets `animation-timeline` or
  names a keyframes the running view animations use. Each must sit inside an `@supports` whose
  condition mentions `animation-timeline` and an `@media` with `prefers-reduced-motion: no-preference`.
  No rule outside that gate, whose selector matches a section, may set opacity below 1 or a
  transform/translate/scale/rotate; nor an inline style on a section.
- C7. Context with `javaScriptEnabled: false` (proved by `self.__next_f` undefined). Contact is
  not at rest at load, and is at rest at the bottom.
- C8. Contact waits before the first Tab; Tab to the first Contact link; after the scroll settles
  the Contact section and every element in it are at rest, the link's opacity times its ancestors' is 1,
  and it is in the viewport.

axe is not repeated here: `invariants.spec.ts` already runs it per scheme with motion allowed and it
is the check that catches a section caught mid-reveal (see the first finding).

## Proof the checks can pass and bite

A throwaway reference reveal in a scratchpad copy (`cp -a app components content e2e lib package.json
next.config.ts tsconfig.json playwright.config.ts pnpm-workspace.yaml node_modules`, `next build`,
`next start --port 335x`). All eight pass (6 repeats x 8, 4 workers: 48 passed, no flake). With the
two findings below applied, the whole suite passes: 41 passed, 1 skipped (the `test.fixme` already in `content.spec.ts`).

Mutations of the reference, each run against the spec (failing checks only):

| Mutant | Fails |
| --- | --- |
| no `both` fill (animation: reveal linear) | C1, C7, C8 |
| `animation-range: cover 0% cover 100%` | C1, C2, C7, C8 |
| `animation-timeline: scroll()` | all eight |
| header added to the selector | C3 |
| no `prefers-reduced-motion` gate | C2, C5, C6 |
| `@supports (color: red)` instead of the timeline test | C6 |
| `margin-top` in the keyframes | C4 |
| 40 px rise | C4 |
| `animation: reveal 0.6s ease both` (a clock) | all eight (no view timeline; C4 also names the clock) |
| `main section:last-child { opacity: .5 }` unconditional | C5, C6 (C7 holds: the animation's end value wins, correctly) |
| `padding-top: 4px` on Projects under motion only | C2 |

## The reference CSS that passed (a hint, not a requirement)

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    @keyframes reveal {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: none; }
    }
    main section {
      animation: reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 30%;
    }
  }
}
```

Appended to the end of `app/globals.css` (unlayered), it survives Tailwind/lightningcss intact. Three
things in it are load-bearing:

1. `both` (or `backwards`): without it, a section below the fold sits at rest until its range starts.
2. `animation-range: entry 0% entry 30%`: see finding 1. `animation-timeline` must come after the
   `animation` shorthand, which resets it.
3. Everything inside both the `@supports` and the `@media`, so reduced motion has no animation at all.

## Findings: the contract as written is not enough

**Needs decision (Atlas): `e2e/keyboard.spec.ts` `settled()` hangs on any C1-compliant page.** It
awaits `document.getAnimations().map(a => a.finished)`. A scroll-driven animation that is still
before its range (Contact at load) never finishes, so three keyboard tests time out at 30 s
("a skip link is the first stop...", "Tab visits every link...", "a card shows keyboard focus..."), with
the reference. No builder can make C1 and that test both pass. The contract says keep it unedited and
Probe was told not to edit other specs, so this is for Atlas to authorise. Rewrite that keeps the
intent (wait for transitions, e.g. a ring fading in) and the same assertions:

```ts
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    ),
  );
}
```

With only this change (and the 30% range), `keyboard.spec.ts` passes in full. It adds no `expect` and
removes none, so the gate's weakening rule stays quiet; the PR still touches an e2e file, which Lens
should read.

**Builder constraint, not yet a check: the range must be short.** With `entry 0% entry 100%`,
`invariants.spec.ts` axe (all four runs: color-contrast on `#projects`) and `cards.spec.ts` "the whole
of a linked card is its link" at 390 px fail, because Projects is already 74% (1440) and 43% (390)
into its entry when the page loads, so it is caught mid-fade with motion allowed. `entry 0% entry 30%`
passes them: both Projects positions are past 30%. The contract's note ("a section caught mid-reveal
must not fail contrast") is not satisfiable by luck; the range, or the starting opacity, has to be
chosen for it. If Atlas wants it pinned, a check like "at load, every section whose top edge is inside
the viewport is at rest" would do it (it is true of the reference at 1440 x 900 and 390 x 844). I did
not add it, since it changes the contract (and Experience, Projects at other sizes would depend on it).

**Decision for C3 (done, tell me if wrong):** an animation on an ancestor of the header (`main`,
`body`) counts as animating the header, since it would fade the name. The contract's text only says
"the header or anything in it".

## C9 (gate), for the end

Evidence to collect after the build: `pnpm verify`, `PLAYWRIGHT_PORT=<335x> pnpm test:e2e` (whole
suite), `git diff --name-only origin/main` shows no owner path (`.github/CODEOWNERS`) and nothing in
`content/`; `scopeNotes` on the diff of `e2e/` is empty (run locally: it is empty for
`reveal.spec.ts` today).

## Manual proof still owed

None of C1 to C8 needs a manual step. Not checked by any test: that the motion looks right (Iris),
Safari/Firefox without scroll-driven animations (C6 reads the CSSOM; the unsupported path itself
cannot be exercised in Chromium).
