# The first viewport at 1440 × 900, measured on main (93c432c) before sprint 24

Playwright's Chromium, viewport 1440 × 900, `document.fonts.ready` awaited, production build served
with `next start`. Boxes in CSS px from `getBoundingClientRect`.

| What | top | bottom | height |
|---|---|---|---|
| `main > header` (the title block) | 547.3 | 909.7 | 362.4 |
| `section[aria-labelledby="revisions"]` | 547.3 | 909.7 | 362.4 |
| the revision table | 607.8 | 858.7 | 250.9 |
| row 23 (77 characters, one line) | 631.2 | 663.1 | 31.9 |
| row 22 (91 characters, two lines) | 663.1 | 711.9 | 48.8 |
| row 21 (99 characters, two lines) | 711.9 | 760.7 | 48.8 |
| row 20 (96 characters, two lines) | 760.7 | 809.4 | 48.8 |
| row 19 (87 characters, two lines) | 809.4 | 858.2 | 48.8 |
| the block's footer (count line, Log link) | 868.7 | 892.7 | 24 |
| the contact links (GitHub, LinkedIn, ruslanshulga.com) | 866.4 | 892.7 | 26.3 |

The description column is 466 px wide at `font-size: 13px`, `line-height: 1.3`, so a line holds
about 80 characters; a second line adds 16.9 px to the row. The title block and the revision block
share a grid row, and the contact links sit at its bottom (`lg:mt-auto`), so the block's height
sets where the links end: 892.7 px, 7.3 px above the fold.

Consequences: the block is capped at five rows (`components/revisions.tsx`, `ROWS = 5`), so it
never grows a row a sprint. It grows 16.9 px for each of the five goals that wraps at 1440. Today four
wrap; five would end the links at about 909.6 px and fail B1.1 by about 10 px. A new sprint's
one-line goal (at most 78 characters) replaces the oldest row; when that row was two lines the block
shrinks by 16.9 px.
