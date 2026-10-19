# Sprint 11: Forge's notes

Stack dots, in `app/page.tsx` only. The Stack `ul` gets `overflow-hidden`; each `li` is `relative` and
draws a 3 px `before:` dot in the gap before it. The dot in front of each row's first tool falls left of
the `ul` and is clipped, so no row starts with one. `content` is `""`, the colour is `bg-muted`, the `li`
boxes don't move, and `innerText` is unchanged. No new custom property.

## One number changed from Iris's recipe

`before:-left-[0.8125rem]` (13 px) became `before:-left-[calc(0.75rem+1.5px)]` (13.5 px). The gap is
24 px (`gap-x-6`), so the gap's centre is 12 px left of the next tool, and a 3 px dot centred there has
its left edge at 12 + 1.5. At 13 px the dot sat 0.5 px right of centre at every size; at 13.5 px the
measured error is 0. Her vertical numbers hold: the dot's centre is 0.11 px from the centre of a real
"·" glyph at 1440 and 390, 0.7 px at 320.

I kept `gap-y-2`. Iris's item 1 (`gap-y-1`) is a separate change that Quill's pick leaves out.

## Verified in a real browser (agent-browser, session `forge`, `next dev` on 3341)

Measured per `li`, at 1440, 390 and 320, light and dark: every row's first tool is clipped (its dot lies
fully left of the `ul`), every other tool has a dot, `::before` content is `""`, the dot is `--muted`
(rgb(69, 94, 90) light, rgb(150, 169, 166) dark), `scrollWidth - clientWidth` is 0 at all three sizes,
and the list has no focusable element. Rows at 390 are 3, 2, 3, 3, 4, 3 (Iris's count). Descenders
("Python", "pgvector") are whole: the `li` line box is 28.8 px tall, so nothing paints outside it. The
reveal moves only the `h2` (`app/globals.css`), which is outside the `ul`.

Screenshots in `.studio/screenshots/` (git-ignored): `sprint11-stack-{1440,390,320}-{light,dark}.png`,
each the Stack section centred in the viewport.
