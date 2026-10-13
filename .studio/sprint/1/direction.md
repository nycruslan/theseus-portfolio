# Sprint 1 direction: "New copper on old bronze"

Iris, for Forge. Advisory (not yet calibrated against `design/calibration/`, which has no examples yet).

## Mood

The ship of Theseus, read through its metal: the page is weathered bronze gone to sea-glass
verdigris, and the links are the only freshly fitted parts, bright copper that hasn't oxidised yet.
Calm, cool, a little salt-worn in light; a lantern-lit hull at night in dark.

Why this and not something else: the two looks a model reaches for here are template gray with a
blue link and, once told to avoid that, cream paper with a terracotta accent. A cool verdigris
ground with a copper accent comes out of the subject (copper and its own patina are one material,
old and new), and it doesn't land in either default. The accent has a story, too: it marks the parts
that are new, which is the one thing a rebuilt-in-public portfolio is about.

## Color tokens

Write the **hex** values in `app/globals.css`. The oklch values are the design intent, so keep them in
a comment. Use hex because `getComputedStyle` then returns `rgb()`, which keeps Probe's C4 luminance
math simple. Chrome returns oklch values as `oklch(...)` strings.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#e6f3f1` oklch(95.5% 0.014 185) | `#091413` oklch(18% 0.016 190) | Page ground. Light is pale sea-glass, cool and committed, not white. Dark is green-black hull, not neutral `#0a0a0a`. |
| `--foreground` | `#0f2220` oklch(23.5% 0.025 185) | `#e1eae9` oklch(93% 0.01 185) | All primary text: name, headline, bio, role titles, summaries. Tinted ink, never pure black or white. |
| `--muted` | `#455e5a` oklch(46% 0.03 185) | `#96a9a6` oklch(72% 0.022 185) | Secondary text: location, `<h2>` section labels, periods. Replaces every `foreground/60` and `/80`. |
| `--accent` | `#944126` oklch(48% 0.12 38) | `#e79d73` oklch(76% 0.105 50) | Links only: the project link and the Contact links. Nothing else, no backgrounds, no headings. |
| `--rule` | `#c5d5d2` oklch(86% 0.018 185) | `#283635` oklch(32% 0.018 190) | Decorative. Used now for `::selection` background (text stays `--foreground`), and reserved for dividers and card edges in item 3. Never for text. |

### Contrast (WCAG 2.x, computed from the hex values)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| foreground / background | **14.53:1** | **15.30:1** | ≥ 4.5 |
| muted / background | **6.15:1** | **7.60:1** | ≥ 4.5 |
| accent / background | **6.06:1** | **8.45:1** | ≥ 4.5 |
| rule / background | 1.34:1 | 1.49:1 | none (decorative) |
| accent / foreground | 2.40:1 | 1.81:1 | (for info: links are told apart by hue and placement, and the Contact ones are underlined) |

Every required pair clears 4.5:1 with margin (the lowest is 6.06), so muted `sm` labels at 13 px are
comfortably readable. Computed with the WCAG relative-luminance formula. The script is in my
scratchpad, not the repo.

## Type scale

A modular scale that opens up as the viewport grows: **ratio 1.2 (minor third) at 320 px to 1.333
(perfect fourth) at 1440 px, base 16 px to 18 px**. `sm` to `xl` are steps −1, 0, 1, 2. `2xl` is
an off-scale display step (48 to 76 px) so the name carries the first viewport on a phone too.
The clamps are linear between 320 px (20rem) and 1440 px (90rem). Copy them exactly:

```css
--step-sm:   clamp(0.8333rem, 0.8304rem + 0.0149vw, 0.8438rem); /* 13.3 → 13.5 px */
--step-base: clamp(1rem, 0.9643rem + 0.1786vw, 1.125rem);       /* 16 → 18 px */
--step-lg:   clamp(1.2rem, 1.1143rem + 0.4286vw, 1.5rem);       /* 19.2 → 24 px */
--step-xl:   clamp(1.44rem, 1.28rem + 0.8vw, 2rem);             /* 23 → 32 px */
--step-2xl:  clamp(3rem, 2.5rem + 2.5vw, 4.75rem);              /* 48 → 76 px */
```

Resolved sizes (px), checked in a browser:

| Step | 320 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| sm | 13.3 | 13.3 | 13.4 | 13.4 | 13.5 |
| base | 16.0 | 16.1 | 16.8 | 17.3 | 18.0 |
| lg | 19.2 | 19.5 | 21.1 | 22.2 | 24.0 |
| xl | 23.0 | 23.6 | 26.6 | 28.7 | 32.0 |
| 2xl | 48.0 | 49.8 | 59.2 | 65.6 | 76.0 |

C2 holds: the h1 is strictly increasing, 76 / 48 = 1.58 (≥ 1.4), and the bio is 19.2 px at 320.

**Line heights belong to the step.** Expose each step through `@theme inline` as `--text-step-*`
with a `--text-step-*--line-height`, so `text-step-2xl` brings its own leading:
sm 1.5, base 1.6, lg 1.45, xl 1.2, 2xl 1. Without this, the 76 px name inherits the body's 1.5
leading and floats. Name the utilities `text-step-*`. Plain `text-sm` and the like are what C3's
grep forbids.

Set `body { font-size: var(--step-base); }` in `globals.css` so unclassed text (summaries,
descriptions) is on the scale.

## Element map

| Element | Step | Color | Notes |
|---|---|---|---|
| `<h1>` name | `2xl` | foreground | Keep `font-semibold tracking-tight`. |
| Headline | `xl` | foreground | Regular weight. Drop `/80`: size gives it its rank, and gray doesn't. |
| Location | `base` | muted | |
| Bio | `lg` | foreground | The lede. **Remove its `leading-7`** so the step's 1.45 applies, because 28 px leading on 24 px text is cramped. That's line height following the size change, not spacing. If Atlas rules it out of scope, the fallback is bio at `base` with `leading-7` kept. |
| `<h2>` section labels | `sm` | muted | Keep `font-medium uppercase tracking-widest`. |
| Role titles (`<h3>`) | `lg` | foreground | Keep `font-medium`. |
| Period | `sm` | muted | |
| Summaries / project description | `base` | foreground | Keep `mt-2 leading-7` (1.75 to 1.56 across the range, which is fine). |
| Project link (`<h3>` "Theseus") | `lg` | **accent** | Keep `underline-offset-4 hover:underline`. It's the one link in the body, the "new plank". |
| Contact links | `base` | **accent** | Keep `underline underline-offset-4`. Hover: `hover:text-foreground` (the copper weathers to ink). This replaces `hover:text-foreground/70`, which C3's grep forbids. |

The accent appears in exactly two places. Don't add it to headings, labels, the name or any background.

## What I checked in a browser

I mocked the page in static HTML with the exact structure, spacing and Geist from `app/page.tsx`, and
compared it with the current page (white, `#171717`, opacity grays, Tailwind sizes) at 390 and
1440 px, light and dark. Production (https://theseus-portfolio.vercel.app) is blocked by this
sandbox's egress proxy (CONNECT 403). `main` is the seed that production serves, so the mock of
the current page stands in for it.
- **Better than the current page:** it has a real hierarchy (the name went from 36 to 48–76 px, and
  the lede is set apart), a mood you can name, and links you can find.
- 320 px: no horizontal overflow (`scrollWidth` 320), h1 48 px, bio 19.2 px.
- I rejected a paler ground (oklch 96.5% 0.008 190), which read as off-white, timid, almost the
  template. I also rejected the first try at hue 170, which read mint and clinical. Hue 185 at
  chroma 0.014 reads as patina.

Screenshots of the mock are in my session scratchpad, not the repo. I'll judge the real build
from Probe's 390 and 1440 captures.

## Known issue outside this sprint (will hit the review)

"Company name" renders in Experience. It's a seed stand-in, which is a rubric **hard gate**. It
lives in `content/profile.ts`, so only the owner can fix it. Unless the owner replaces it or waives
the gate for owner-pending content, my review of this PR will have to say `Verdict: changes` on that
gate alone, whatever the tokens score. Needs decision (owner, via Atlas).
