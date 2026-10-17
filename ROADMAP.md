# Roadmap

Quill owns this list and picks what matters most each sprint. Keep items small enough for one
sprint.

- [x] Design tokens: a color palette and a fluid typography scale in `app/globals.css`, used across the page.
- [x] Dark mode that follows the system preference, with accessible contrast in both themes. (Sprint 2, PR #12.)
- [x] Project cards: give each project a card with its name, description and link. (Sprint 3, PR #16, merged as f400ae0: `components/project-card.tsx`, checked in `e2e/cards.spec.ts`.)
- [ ] Section reveal motion on scroll, disabled under `prefers-reduced-motion`. (Next. It needs scroll-driven CSS or a client component, and must keep the reduced-motion check in `e2e/cards.spec.ts` and the JavaScript-off first paint in `e2e/invariants.spec.ts` green.)
- [x] Open Graph image generated from the profile (name and headline). (Already on main: `app/opengraph-image.tsx`, tokens from `lib/site.ts`, served as image/png and checked in `e2e/smoke.spec.ts`. A dark variant is not planned.)
- [x] Accessibility pass: landmarks, focus styles, skip link, and zero axe violations. (Sprint 4, PR #17, merged as 2e792ee: a skip link, one shared focus ring, the card arrow on keyboard focus, one ring in forced colors, strict axe and 24 px targets, checked in `e2e/keyboard.spec.ts` and `e2e/invariants.spec.ts`.)
  - Open question: the skip link skips nothing. `main` wraps the whole page, header included, so Enter then Tab lands where Tab alone would (`.studio/sprint/4/retro.json`). Give it something to skip (the header as a banner landmark outside `main`, or a target past the project list), or decide it's convention only.
- [ ] A subtle 3D hero element that degrades gracefully on low-end devices.
- [ ] Education and skills: show `profile.education` and `profile.skills` (the owner's CV, now in `content/profile.ts`) on the page, in its own style. Only how they look is the team's; the facts are the owner's.
