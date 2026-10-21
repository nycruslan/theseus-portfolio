# Sprint 2 direction: the hull at night

Iris, for Pixel. Advisory: `design/calibration/` has no owner examples yet.

Tune the dark hull, don't replace it. The verdigris ground and the bright copper accent stay. In dark,
two values move: the accent goes from apricot to copper, and the rule goes up a step so selection is
visible. Light doesn't change, because every light pair passes (see the table).

## Dark tokens (the only `prefers-color-scheme: dark` block, `:root`, these 5 and nothing else)

| Token | Dark value | oklch intent | Change |
|---|---|---|---|
| `--background` | `#091413` | oklch(18% 0.016 190) green-black hull | none |
| `--foreground` | `#e1eae9` | oklch(93% 0.01 185) tinted, not white | none (see note) |
| `--muted` | `#96a9a6` | oklch(72% 0.022 185) | none |
| `--accent` | **`#eb8a64`** | **oklch(73% 0.13 42)** copper | was `#e79d73` oklch(76% 0.105 50) |
| `--rule` | **`#2d4543`** | **oklch(37% 0.03 189)** deep verdigris | was `#283635` oklch(32% 0.018 190) |

Keep the oklch beside each hex in a comment, as in sprint 1, and update the comment above the block. It
isn't "parity only" any more.

## Contrast (WCAG 2.x, computed from these hex values in a node script, not estimated)

| Pair | Dark | Light (unchanged) | Contract |
|---|---|---|---|
| foreground / background | **15.30:1** | **14.53:1** | ≥ 7 |
| muted / background | **7.60:1** | **6.15:1** | ≥ 4.5 |
| accent / background | **7.45:1** | **6.06:1** | dark ≥ 7, light ≥ 4.5 |
| foreground / rule (`::selection`) | **8.39:1** | **10.88:1** | ≥ 4.5 |
| rule / background | 1.82:1 | 1.34:1 | none (decorative) |

The lowest margin is the dark accent: 7.45 against a floor of 7. Don't lighten or desaturate it to "fix"
anything without rerunning the numbers.

## Why these values

- **Accent.** I rendered the real build in dark at 390 and 1440 with four accents
  (`shots/iris-dir-accent-390-dark.png`, from left: current, h42 L73, h42 L74, h40 L73). Hue 50 at
  chroma 0.105 reads peach. At hue 42, chroma 0.13, it reads as fresh copper. At hue 40 it starts to go
  salmon-pink. L 73% is the darkest step that holds 7:1 with margin, and the lower lightness is what makes
  it look like metal and not fruit.
- **Rule.** `::selection` draws `--foreground` on `--rule`. At `#283635` (1.49:1 against the ground) the
  highlight read as a dull grey band. At `#2d4543` it reads as verdigris and you can find it at a glance
  (`shots/iris-dir-selection-390-dark.png`, current on the left). Item 3's dividers will want this step
  too: a lighter-than-ground hairline needs more contrast than a darker one does in light to look as
  present. Selected links turn to foreground on the verdigris. That's intended, since the selection rule
  already sets `color`.
- **Foreground.** I tried oklch 91% (`#dae4e2`, 14.43:1) to reduce glare and couldn't see a difference
  from 93% at either width. At chroma 0.01 it isn't white, so it isn't glaring. No change.
- **Muted.** 7.60:1 is already AAA and sits clearly below the foreground. No change.

## Details

- **`::selection`: no dark-specific rule.** Keep the single global rule (`--rule` background,
  `--foreground` text). The new dark `--rule` does the work, and the dark block stays at 5 tokens (tokens
  C5).
- **`color-scheme: light dark`**, both ways the contract's C1 asks for: in the base `:root` rule in
  `globals.css` (outside the dark block), and as `colorScheme: "light dark"` in a `viewport` export in
  `app/layout.tsx` (renders `<meta name="color-scheme">`). Without it, the browser keeps its light native
  scrollbars and form controls on the dark hull, which is the most visible seam today.
- **`theme-color` per scheme: worth it**, and it's the same `viewport` export. Set the light value to
  `#e6f3f1` with `media: "(prefers-color-scheme: light)"`, and the dark value to `#091413` with
  `media: "(prefers-color-scheme: dark)"`. Both equal `--background` exactly, so the mobile address bar
  disappears into the page instead of framing it. Write the hex literally (CSS variables don't resolve in
  a meta tag), with a comment pointing at the tokens (contract C2/C6).
- **Leave alone:** `antialiased` (it keeps light-on-dark Geist from blooming), the Contact hover (copper
  to foreground works in both schemes), the browser's focus ring (item 6), and the light values.

## What I'll check in review

Dark and light at 390, 1024 and 1440 next to production (`main` built locally, since the proxy blocks
production). I'll check that the accent reads as copper at 16 px, that selection shows across a link,
that the scrollbar is dark, that light has no pixel change, and that the address bar color is right
wherever I can emulate it. The placeholder hard gate ("Company name" and the other seed stand-ins in
`content/profile.ts`) still fails until the owner fixes or waives it, so expect `changes` on that gate
whatever the tokens score.
