# Roadmap

Quill owns this list and picks what matters most each sprint. Keep items small enough for one
sprint.

- [x] Design tokens: a color palette and a fluid typography scale in `app/globals.css`, used across the page.
- [x] Dark mode that follows the system preference, with accessible contrast in both themes. (Sprint 2, PR #12.)
- [ ] Project cards: give each project a card with its name, description and link. (Sprint 3, in progress.)
- [ ] Section reveal motion on scroll, disabled under `prefers-reduced-motion`.
- [x] Open Graph image generated from the profile (name and headline). (Already on main: `app/opengraph-image.tsx`, tokens from `lib/site.ts`, served as image/png and checked in `e2e/smoke.spec.ts`. A dark variant is not planned.)
- [ ] Accessibility pass: landmarks, focus styles, skip link, and zero axe violations.
- [ ] A subtle 3D hero element that degrades gracefully on low-end devices.
