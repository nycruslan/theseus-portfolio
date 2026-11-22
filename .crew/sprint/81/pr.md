## Sprint 81 (S): the bar clears what it jumps to

**Goal** (from the roadmap's stand-down defect condition, sprint 80's follow-up): with a large
default font on a big screen, a fragment link's target and a focused link land below the sticky
bar instead of under it.

**Size:** S. **Contract:** `.crew/sprint/81/contract.md` (T41a to T41c). **Decisions:**
`.crew/sprint/81/decisions.md`.

### The defect

On production, from 64rem wide `scroll-padding-top` was a fixed 56 px while the bar is 3.5rem:
`/#work` landed 14 to 42 px under the bar at 20 to 28 px fonts (1440 × 900, 1920 × 1200), cutting
through "Work", the employer and the date at 28 px. Probe found a focused link's ring was under
the bar by 3.7 to 4.5 px even at 16 px (Shift+Tab on /log's revisions and /'s case studies), and
by up to 46.5 px at 28 px.

### The change

- `app/globals.css`: from 64rem the padding is `3.5rem`, the bar's `lg:h-14` (56 px at 16, so
  nothing moves there). `:focus-visible` gets `scroll-margin-top: 4px`, the ring's reach;
  `#main:focus` keeps 0 so the skip link still lands at the bar's edge. /crew's sticky drawing
  top is `calc(3.5rem + 16px)` (72 px at 16), since at 24 to 28 px the bar covered its top.
- `components/bar.tsx`: a comment that the padding and both sticky tops repeat the bar's height.

### Results

- T41a, T41b, T41c (`e2e/bar-landing.spec.ts`): red on main as the contract says (T41a at large
  fonts from 64rem, T41b at every font), 9 of 9 green on the fix.
- Forge's base-vs-fix sweep: 0 boxes moved at any font on `/`, /crew and /log (1024 × 768, 1440 ×
  900, 1920 × 1080); 0 of 147 landings changed at 16 px; rings under the bar on a Tab walk 210 →
  0, on a straddle 1,258 → 0.
- `pnpm verify` passes on the integrated tree. Forge's full e2e run: 489 passed, 2 failed, both
  B5.23 (the 3D model on /log never mounted within 45 s under load); the spec passed 2 of 2 alone.
  CI decides.
- Riding along: Lens's T39a nit, the mask lookup now starts at the copy itself.

No check is retired. No owner path or `content/` is touched.

### Lens: ship (8bc8ced), two nits for the next sprint on this spec

- T41b walks four of the contract's six windows (1024 × 768, 1536 × 864, 1920 × 1080, 2560 ×
  1440); 1280 × 800 and 1440 × 900 are left out to keep the spec near five test-minutes, and the
  four still meet each font on both sides of 64rem (the spec's header).
- /crew#replay's pressed-entry read at large fonts should assert the replay played first.
