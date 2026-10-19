**Work in progress**

## Goal
Roadmap item (Quill's pick, `.studio/sprint/11/pick-quill.md`): draw a middle dot between the tools in the Stack section, so multi-word tools read as single units and the row stops reading like the Contact row. Recipe: Iris, `.studio/sprint/6/review-iris.md` item 2.

## Size
S: one component's classes in `app/page.tsx`. Builder: Forge. The existing suite stays green (sprint 6's `e2e/profile-sections.spec.ts` C4/C6 bound it).

## Also in this PR
Quill groomed `ROADMAP.md`: the 3D hero marked merged (#35), a new "Next" list.

## Results
Forge (546b64e, 28ad955): the Stack `ul` gets `overflow-hidden` (clips each row's leading dot), and each `li` a 3 px `before:` dot in `bg-muted`, 13.5 px left (the centre of the 24 px gap; Iris's 13 px measured 0.5 px off). The row gap stays main's `gap-y-1` (fix round 1, 28ad955, after Lens caught a stray `gap-y-2`). `innerText` unchanged, generated content `""`, no new custom property, no sideways scroll at 320. `pnpm verify` exit 0; `pnpm test:e2e` 63 passed, 1 skipped (the existing fixme in `content.spec.ts`). Checked in a browser at 1440/390/320, light and dark (`.studio/sprint/11/notes-forge.md`; screenshots kept out of git). Not verified: retina, 1024, real devices.
