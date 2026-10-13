# Sprint 1 design direction (Iris)

**Mood:** an engineer's computation pad: green-tinted paper and graphite writing, with the pad's own
printed green for the form's structure. Exact, quiet, made by hand, and clearly not a template.

Why: Theseus is rebuilt in public, sheet after sheet, the way engineers work on the green grid pad.
It's off the AI-default looks and the literal ship reading, and later sprints can build on its
sheets, revisions and grid. Two inks: **graphite** for what the owner wrote (name, bio, roles),
**printed green** for the form's structure (section titles, rules, links). Never mix them up.

## Palette (6 tokens, literal values in `@theme`, no `var()` indirection, no dark values)

| Token | Value | Role | Contrast on background |
|---|---|---|---|
| `--color-background` | `#E7EEDC` | pad paper, the whole page (body bg) | n/a |
| `--color-foreground` | `#20251E` | graphite: body text, h1, h3 | **13.13:1** |
| `--color-muted` | `#4D5948` | soft graphite: location, periods | **6.22:1** |
| `--color-accent` | `#1C6640` | printed green: links, h2 titles, section rules | **5.84:1** |
| `--color-accent-deep` | `#124A2D` | link hover/active, focus ring | **8.64:1** |
| `--color-rule` | `#C3D3B6` | grid lines and hairlines only, never text | 1.33:1 (decorative) |

Computed with WCAG 2 relative luminance. Declare `--color-accent` before `--color-accent-deep` and
`--color-muted` first among the muted tokens: `e2e/tokens.spec.ts` checks the first match. Don't use
opacity to soften text anywhere. If a step needs to be lighter, use `muted`.

## Fonts: one family, two voices

**Archivo** (next/font/google, variable, `axes: ["wdth"]`, `subsets: ["latin"]`,
`variable: "--font-archivo"`), mapped to `--font-sans` in `@theme inline`. Drop Geist and Geist Mono.
Why: Archivo is a grotesk built for technical, high-performance setting, and its width axis (62 to 125)
gives us the pad's two lettering habits from a single file. The h1 is set wide and heavy, like a
stamped title block. Section titles are set condensed, like a printed form label. One family means
fewer font bytes on a phone, and next/font's metric-matched fallback keeps layout shift at zero. Do not
add a second family this sprint.

## Type scale (6 steps; linear from 320 px to 1440 px; no names shared with color tokens)

| Token | Value | px at 320 / 1440 | Used for |
|---|---|---|---|
| `--text-small` | `clamp(0.875rem, 0.857rem + 0.089vw, 0.9375rem)` | 14 / 15 | location, period (muted, `tabular-nums`) |
| `--text-body` | `clamp(1rem, 0.964rem + 0.179vw, 1.125rem)` | 16 / 18 | bio, summaries, links; leading 1.6, max 65ch |
| `--text-title` | `clamp(1.125rem, 1.054rem + 0.357vw, 1.375rem)` | 18 / 22 | h3 role and project titles, weight 600 |
| `--text-lead` | `clamp(1.25rem, 1.107rem + 0.714vw, 1.75rem)` | 20 / 28 | headline, weight 500, foreground (not muted) |
| `--text-heading` | `clamp(1.5rem, 1.286rem + 1.071vw, 2.25rem)` | 24 / 36 | h2: `font-stretch-75%`, 600, uppercase, tracking 0.02em, accent |
| `--text-display` | `clamp(3rem, 1.857rem + 5.714vw, 7rem)` | 48 / 112 | h1: `font-stretch-125%`, 800, tracking -0.02em, leading 0.95 |

Line heights can ride along as `--text-display--line-height: 0.95` etc. (the test skips `--` companions).

## Details that make it read as designed

- **Section rule:** each h2 sits under a 2px `accent` top rule with a little padding, like the ruled
  header of a printed form. This replaces the seed's tiny, widely tracked gray label, which is the rut.
- **Grid paper (the signature):** a faint 24px grid on `body` in `--color-rule` (two
  `linear-gradient`s, 1px lines), with `background-color` kept as the token so the computed-color
  checks hold. If the detector flags it at error level, drop the grid and keep everything else.
- **Links:** accent text, 1px underline offset 0.2em. On hover, `accent-deep` and a 2px underline.
  `focus-visible`: 2px `accent-deep` outline, offset 2px. No transitions (no motion this sprint).
- **Rhythm:** more space above a heading than below it. Keep the left-aligned single column, and no cards.
- `::selection` uses `rule` behind `foreground`. `color-scheme: light` on `:root`.

## Refused

Zinc/gray, pure white or cream grounds, any gradient fill or glow, purple/blue accents, red/terracotta
"redline" accents, tiny tracked mono labels, opacity-made grays, stock `text-sm`-style sizes.
