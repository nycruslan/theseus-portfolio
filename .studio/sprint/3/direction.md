# Iris: direction for sprint 3, project cards

**Planks, not tiles.** On a hull, strakes are laid edge to edge and share their seams. Each project is
one plank: square, framed in `--rule`, sharing its rule with the next, and lit copper when your hand
is on it, like the new part fitted to the old ship. No radius, no fill, no shadow, no grid. The text
stays on the column's left edge at every width, and the frame hangs out into the gutter around it.

I tried this in the browser on a local build of HEAD by rewriting the Projects block, not by editing
any file. It reflows with no overflow at 320, 390, 1024 and 1440, and `elementFromPoint` lands on the
link at the centre and at corners inset 8 px. Captures are in `shots/`:
`iris-direction-phones.png` (390 light with three cards and the middle one hovered, then the
keyboard focus at 320 and 390 dark), `iris-direction-1440-light-three.png` and
`iris-direction-1024-dark-one.png`. The extra projects are stand-ins I made up for the test. They
aren't content.

## The card (`li`, one per project)

| | Below `md` (phones) | `md` and up |
|---|---|---|
| Delimiter | `border-y border-rule`. No side borders: a full plank. | `border border-rule`, all four sides. |
| Bleed | `-mx-6`: the rules run edge to edge across the column's `px-6` gutter. | `md:-mx-8`: the frame hangs 32 px into the gutter. |
| Padding | `px-6 py-5` (24 / 20 px) | `md:p-8` (32 px) |

- The padding equals the hang, so the title, the description and the `PROJECTS` label share one
  left edge, and the arrow's right edge sits on the column's right edge. Keep those values matched.
- Corners stay square: no `rounded-*`. No background, no `shadow-*`, no `transition-*`.
- Layout: `relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-2`. Row 1 holds the `h3` and the arrow.
  Row 2 holds the description, set to `col-span-2` so it gets the full measure.
- `ul`: `flex flex-col`, with the current `gap-8` removed. Every card after the first gets
  `-mt-px`, so neighbours share one 1 px seam. Never a 2-up grid, at any width: the column is the
  reading measure.

## Title, underline, description

- `h3`: keep `text-balance text-step-lg font-medium`.
- The link inside it: `text-foreground underline decoration-accent decoration-1 underline-offset-4`.
  The underline shows all the time, not only on hover, because it's the main sign that this is a
  link. This closes sprint 2 finding 1: the ink title stops the coral leaning at this size.
- Description `p`: `col-span-2 text-step-base` in the foreground colour. Drop the `mt-2`, since the
  `gap-y-2` gives the same 8 px.

## Link affordance

An inline SVG arrow that points up and right, in the grid's second column, as a sibling of the `h3`
and **outside the link**, so the link's name stays the project name only:

```html
<span class="flex h-[1lh] items-center text-step-lg text-muted group-hover:text-accent">
  <svg aria-hidden="true" viewBox="0 0 24 24" class="size-[1em]" fill="none" stroke="currentColor"
       stroke-width="1.5" stroke-linecap="square"><path d="M7 17 17 7M8 7h9v9"/></svg>
</span>
```

`text-step-lg` together with `h-[1lh]` centres the arrow on the title's first line, even when a long
name wraps. Its rest colour is `--muted`. Don't add any text, `title` or `sr-only` label.

## Stretched link

Give the `a` the classes `after:absolute after:inset-0`. The `li` is `relative`, so the link's
`::after` covers the whole card. A Server Component can do this, and it needs nothing in
`globals.css`. The cost is that a visitor can't select the description's text. I accept that.

## Hover (colour only, linked cards only)

Add `group` to the `li`, and give it `hover:border-accent hover:z-10`. The arrow goes to `--accent`.
The title doesn't change. The `z-10` only lets the hovered card's copper frame paint over the
neighbour's shared seam. It doesn't move anything.

## Focus

- On the `li`: `has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-accent
  has-[a:focus-visible]:-outline-offset-2`.
- On the `a`: `focus-visible:outline-hidden`. Use `hidden`, not `none`, so forced-colours mode still
  draws a ring.

This gives a 2 px copper frame drawn inward over the 1 px rule. It wraps the whole card, and on
phones it stays inside the viewport. The heavier line tells focus apart from the 1 px copper of
hover.

## One project, several, no link

- **One project** (today): a single framed plank under the label. Experience above has no frame, so
  Projects reads as the one built object on the page. That contrast is the point. Don't add
  anything to fill the space.
- **Several projects**: a stack of planks with shared seams. On phones this is a run of full-width
  rules. On desktop it's one tall frame divided by rules.
- **No `href`**: keep the same frame and padding, with the plain name in `--foreground`. No
  underline, no arrow, no `group` or hover, and no focus styles. An underline promises a link.

## Unchanged

Experience, Contact (copper links), the header, `Section` and every token stay exactly as they are.
