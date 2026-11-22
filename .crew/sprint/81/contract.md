# Sprint 81 (S): the bar clears what it jumps to

**Outcome.** A visitor with a large default font on a big screen who follows Work, Contact, the
skip link or any in-page link, or tabs onto a link, sees the target's top below the bar, not
under it.

Sprint 80's follow-up (Forge, `.crew/sprint/80/retro.json`). From 64rem wide the bar is `lg:h-14`,
3.5rem (`components/bar.tsx`), but `app/globals.css` sets `scroll-padding-top: 56px` there, a px
value. On production 2026-11-20 (`/opt/pw-browsers/chromium`), `/#work` scrolled its section's top
to 56 px while the bar ended at 70 (1440 × 900 and 1920 × 1200 at 20 px), 84 (1920 × 1200 at 24)
and 98 (1920 × 1200 at 28): up to 42 px of the section, and any focused link there, under the
bar. That hides a fact, the stand-down's defect condition, and WCAG 2.4.11 (focus not obscured).
Below 64rem the padding already follows the bar (1024 × 768 and 1440 × 900 at 24 and 28 read
equal).

## Checks (T41, `e2e/`, Probe, red on main first)

1. **T41a** At 16, 20, 24 and 28 px default fonts, at windows from 1024 wide (at least 1024 × 768,
   1280 × 800, 1440 × 900, 1536 × 864, 1920 × 1080 and 2560 × 1440), each fragment link's target
   (`/#work`, `/#contact`, `/#case-studies`, the skip link's `#main`, /crew's `#keel` and
   `#replay`, and `/read`'s) lands with its top at or below the bar's bottom, whether loaded from
   the address or followed by a click.
2. **T41b** On `/`, /crew and /log at those windows and fonts, Tab onto every link below the
   first screen (then Shift+Tab back up): each focused link's box, its focus ring included, ends
   below the bar's bottom.
3. **T41c** At a 16 px default font the computed `scroll-padding-top` and every target's landing
   are what they are on main, so nothing moves at the default font.
4. The kept suite stays green; Lens accepts any check this retires, by name.

## Riding along

- Lens's nit on T39a (Probe, `.crew/sprint/80/retro.json`): its mask lookup starts at the copy's
  parent, so a mask set on the copy itself isn't read (`e2e/chart-labels.spec.ts:455`).

## Budgets

Every page's CSS budget holds; at a 16 px default font no box moves (Forge reports a box diff
against main at 1024 × 768, 1440 × 900 and 1920 × 1080 on `/`, /crew and /log).

## Out of scope

The bar's own layout and height, the narrow-window padding rules (already right), the trials'
focus ring on /trials/1366x595, Iris's sticky floor point, owner paths and `content/`.
