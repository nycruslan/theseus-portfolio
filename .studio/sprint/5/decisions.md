# Sprint 5 decisions (Atlas)

1. **`e2e/keyboard.spec.ts` `settled()` filters to clock-timeline animations.** A scroll-driven
   animation before its range never finishes, so awaiting every animation hangs any page that
   passes C1. Probe applies the one-line filter (`animation.timeline === document.timeline`); it
   adds and removes no expect. The contract's "keep unedited" yields to this, with the reason
   here. If scope.mjs counts it as a weakening, the PR waits for the owner.
   Probe also added a two-`requestAnimationFrame` wait at the end of `settled()` (31b5ed0): with
   the filter alone, a Tab that scrolls a Contact link into view was read one frame before the
   scroll-driven values updated (2 of 8 runs failed). It adds and removes no expect; `scopeNotes`
   reports nothing. Atlas accepts it as part of this decision.
2. **No new "at rest at load" check.** The need (a section caught mid-reveal at load must not fail
   contrast) is already pinned by the existing axe and card-link checks, which fail with a long
   range. The builder keeps the range short (Probe's reference: `entry 0% entry 30%`).
3. **C3 counts an animation on an ancestor of the header (e.g. `main`) as animating the header.**
   Accepted as written.
