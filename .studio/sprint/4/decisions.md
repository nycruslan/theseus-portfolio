# Sprint 4 decisions (Atlas)

1. **Goal and size:** Quill's pick, roadmap item 6 (accessibility pass), size M. Lane: Probe writes
   `e2e/a11y.spec.ts` first, Pixel builds, Lens reviews, Probe verifies the pushed head, Iris advises
   (uncalibrated).
2. **C9 is evidence, not a suite test.** A committed test that fetches production makes CI depend on
   the network and on whatever is deployed (once this ships, production *is* this change). Probe
   measures the `main` and `h1` boxes against the `origin/main` build (and production if reachable)
   during verification and reports the numbers; the `content/` no-diff half is shown by the PR's file
   list. The suite gets no C9 test.
3. **The one inserted line in `project-cards.spec.ts` C2** must be a pure addition (do not touch the
   `const expected = [` line), so `.studio/scope.mjs` sees no removed line.
4. **Contract change for C8 (Probe's "Needs decision").** The Contact links are 21 px tall at 390 px,
   so C8's 24 x 24 target can't be met under "nothing else in `page.tsx`". The builder may also
   change the Contact links' classes in `app/page.tsx` (for example `inline-block`) to meet C8,
   provided the page at rest stays unchanged (C9). C8 stays as written.
