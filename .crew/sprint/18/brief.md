# Sprint 18: a share card for `/sprints` (S)

**Goal (roadmap):** a shared link to the build log shows the site's image. The redesign, the top
item, waits for the owner's comments on sprint 17's canvas (none yet on 2026-10-21), so this sprint
takes the next item that neither repeats nor builds on it.

**The bug, on production:** `/` carries `og:image` and `twitter:image`; `/sprints` carries neither,
while it declares `twitter:card` `summary_large_image`. `app/sprints/page.tsx` sets its own
`openGraph` and `twitter`, and Next replaces the layout's objects whole, which drops the image the
root `app/opengraph-image.tsx` would add.

## Pieces

1. **Probe** (`e2e/` only):
   - `e2e/sprints.spec.ts`, C2: a check that `/sprints` has exactly one `og:image` and one
     `twitter:image`, each served as `image/png` (fetch by pathname, as `smoke.spec.ts` does).
     Red on main today.
   - Rider: `e2e/content.spec.ts`'s `test.fixme` becomes `test` again (content has had no
     `TODO(owner)` since the 2026 facts landed); update its comment. A tightening; run
     `.crew/scope.mjs`'s weakening rules on it.
2. **Forge** (`app/sprints/page.tsx`, or `app/sprints/opengraph-image.tsx` if the root's image
   can't be reused cleanly): make the check pass. Reuse the root's image rather than drawing a new
   one; the redesign will redraw both.

**Out of scope:** a new image design; the home page's tags (they stay as they are).
