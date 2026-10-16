# Roadmap

Quill owns this list and picks what matters most each sprint. Keep items small enough for one
sprint.

- [x] Design tokens: a color palette and a fluid typography scale in `app/globals.css`, used across the page.
- [x] Dark mode that follows the system preference, with accessible contrast in both themes. (Sprint 2, PR #12.)
- [x] Project cards: give each project a card with its name, description and link. (Sprint 3, PR #16, merged as f400ae0: `components/project-card.tsx`, checked in `e2e/project-cards.spec.ts`.)
- [ ] Section reveal motion on scroll, disabled under `prefers-reduced-motion`. (Next. It needs scroll-driven CSS or a client component, and must keep the no-script, no-flash and no-`useEffect` guards in `e2e/project-cards.spec.ts` C7 and `e2e/invariants.spec.ts` green, so it comes after the accessibility pass settles focus and motion rules.)
- [x] Open Graph image generated from the profile (name and headline). (Already on main: `app/opengraph-image.tsx`, tokens from `lib/site.ts`, served as image/png and checked in `e2e/smoke.spec.ts`. A dark variant is not planned.)
- [ ] Accessibility pass: landmarks, focus styles, skip link, and zero axe violations. (Sprint 4, in progress: `.studio/sprint/4/contract.md`. Axe is already clean per scheme in `e2e/invariants.spec.ts`; the gaps are the skip link, focus rings on the Contact links, the card arrow on keyboard focus and the forced-colors double ring. Not here: a banner landmark, `app/not-found.tsx`, `scrollbar-color`.)
- [ ] A subtle 3D hero element that degrades gracefully on low-end devices.
