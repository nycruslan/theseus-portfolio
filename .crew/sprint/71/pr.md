## Sprint 71 (S): the bar's motion control stays clear of Read as page at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): from
1024 px wide, the bar's Full/Calm/Off control printed over "Read as page" at a 20 to 28 px default
font on `/`, the Log, its records and `/crew`, up to 43 px over at 1440 × 28. Named by Iris in
sprint 70 and confirmed by Atlas's sweep of production on 2026-11-16.

**Size:** S. Contract: `.crew/sprint/71/contract.md`.

## What changed for a visitor

- **The bar's control slot (`nav > [data-motion]`, `app/globals.css`).** It was a fixed 186 px
  (from 48rem) and 142 px (from 64rem) while its labels grow with the reader's font, so the
  right-aligned group ran out of the slot's left edge over Read as page. The slot now keeps its
  drawn width at 16 px and grows by 5.3em of label (the foot's own measure) per px the label's
  step gains: `max(186px, 186px + 5.3 * (1.0625rem - 17px))` and
  `max(142px, 142px + 5.3 * (var(--step-sm) - 13px))`. At a large font Read as page and the links
  sit further left; the control stays where it was. The slot is the same width empty (server HTML)
  and with its buttons in, so their arrival moves nothing.
- CSS only: no markup, no script.

## Evidence

- **Production, before** (Atlas's sweep, `/`, `/log`, `/log/23`, `/crew`, 768 to 1920, 16 to 28
  px): Read as page's right edge against Full's left edge 800/799 at 1024 × 20, 952/930 at 1180 to
  1440 × 24, 1208/1165 at 1440 × 28, 1666/1659 at 1920 × 28.
- **After (Forge, local production build):** the gap is 21.5 px at 20 px, 23.1 at 24, 24.6 at 1440 ×
  28 and 44.7 at 1920 × 28; never below the 16 px gap (19 and 21) across 16 to 32 px, in Playwright's
  Chromium and Chrome 153, webfont blocked and real. No label wraps; the buttons stay 32 px tall
  from 64rem and 44 px from 48rem.
- **Nothing moves at 16 px:** 0 of 14,700 boxes (scripts on) and 0 of 14,520 (scripts off) on the
  four pages at 768, 1024, 1280, 1440 and 1920; main against itself also read 0. At 20 to 28 px,
  0 of 324 bar boxes move when the buttons arrive.
- **T32** (`e2e/large-font-bar.spec.ts`, new; Probe): four tests, one per page, 1024 to 1920 × 16
  to 28 px, webfont blocked: the group clear of Read as page on a shared line, both whole and
  unclipped inside the window, both shown wherever the bar holds them, no sideways scroll. Red on
  main in all four (the six cases above); an `overflow: hidden` mutant on the slot and a hidden
  Read as page stay red. Green on the build. Named to sort inside shard 2, which gets about 8 s
  faster (Probe's `--list --shard` diff).
- `pnpm verify` exits 0 on the integrated head. Forge ran large-font-bar, large-font, crew-bar,
  log-control, crew-control, motion and sheet: 43 passed. CI runs the whole suite.

## Decisions

1. The slot grows by formula rather than `width: auto`: empty in the server's HTML, an auto slot
   would have no width until the buttons arrive and the links would jump left on hydration (Forge).
2. The bar's breakpoints are in rem, so at 1024 × 24/28 and 1180 × 28 the page is in its phone
   layout and the control is in the foot's row; T32 checks only the foot's buttons there (Probe).
3. T32's sideways-scroll read leaves out `.record-steps` by name: /log/23's step links scroll it
   66 px at 1920 × 28 on main, sprint 70's open follow-up, out of this scope.

## Left open

- /log/23's step-link arrow scrolls the page at 1536 to 1792 × 24 and 1920 × 28 (sprint 70's
  follow-up, unchanged).
- The yard's hint over the hand-off link with WebGL on; /crew's table at 320 × 28; "answering."
  splitting mid-word (sprint 70's follow-ups).
- Safari, Firefox and the Vercel preview were not measured by the builders.
