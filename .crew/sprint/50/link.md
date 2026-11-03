# The record line's link (Iris, sprint 50, R3)

**The words: the whole line.** One `a href="/log#every-revision"` holds the line's one string, so
`p[data-keel-record]`'s textContent stays exactly what it is (K12): `<p …><a …>{`${n} sprints
merged: …`}</a></p>`, no `{" "}` joins and no spans inside.

- Why not "N sprints merged": the line wraps at 390 and 320, and a 44 px box around those words
  alone overruns line 2, so its ring boxes "own call.", words the link doesn't carry (prototyped in
  place on production at 390; my memory, sprint 31 and 48 lessons). The whole line's box is one
  rectangle around exactly its words.
- The keel's grammar already says it: each rule ends in a whole-line ink link to what backs it (its
  source line). The record is the same kind of claim, so it's the same kind of link, and "the record
  you can check" means the whole record, not just its count.

**Paint: the keel's links, nothing new.** LINK's ink and underline without `.crew-link`'s box:
`text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2`, so ink at rest,
a 2 px underline on hover, as `li[data-rule] a` (`components/crew-link.ts`). Not INLINE_LINK: its
`whitespace-nowrap` would stop the line wrapping on phones.

**Target: an inline-block whose padding a matching negative margin takes back out of layout.** In
`app/globals.css` beside `.keel-record`:

- `.keel-record a { display: inline-block; vertical-align: top; padding: 8px 0 17px; margin: -8px 0 -17px; }`
- from 64rem: `padding-block: 4px; margin-block: -4px;`

Below 1024 the padding sits low because the gap under the line (24 px) is twice the one above it
(12 px). The inline-block shrinks to the text on one line and wraps like the line on two
(`text-wrap: pretty` inherits; the break at 390 is production's).

Measured in place on production, Chromium via `@playwright/test`:

| Window | Lines | Link box | Ring clears the lead / rule 1 | Lead, line, rules' boxes |
|---|---|---|---|---|
| 1440 × 900 | 1 | 395 × 27.5 | 7.3 / 23 px | unmoved |
| 1024 × 768 | 2 | 376 × 47 | 7.7 / 21 px | unmoved |
| 800 × 900 | 1 | 385 × 44.5 | 3.4 / 7 px | unmoved |
| 390 × 664 | 2 | 358 × 64 | 3.8 / 8 px | unmoved |
| 320 × 568 | 2 | 288 × 64 | 3.8 / 8 px | unmoved |

So K6's `smallLinks` holds (24 from 1024, 44 below) and K7 and K12 are untouched. Clearances are
from the neighbours' text content areas, not their boxes.

**The ring: the site's one ring, inherited, nothing added.** `@layer base { :focus-visible {
outline: 2px solid var(--foreground); outline-offset: 2px; } }` (`app/globals.css`, ~296). The
`.keel-record a` rule sets no outline. On an inline-block it draws one rectangle at every width,
never fragments. My parked note on rings around inline links stays parked. This link isn't one.

Forge: check the focused link at 390 and 800 in a screenshot, not only its box.
