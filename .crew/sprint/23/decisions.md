# Sprint 23 decisions (Atlas)

The contract (`contract.md`, Quill) came first and Iris's notes (`notes-iris.md`) were written to it,
as sprint 22's retro proposed. Iris reported no disagreement with its rules; the open points she
raised were settled as follows, and Probe's checks and Forge's build follow them.

1. **The strip's address on `/read`** (`theseus-portfolio.vercel.app/read`) is in the DOM at every
   width, in the data rules' order, but `display: none` on screen below 1024 px: `read-390.webp`
   omits it, and it doesn't fit beside Back to the ship and Print at 390. It shows from 1024 and
   under print media at every width (B2.7). B2.6 asserts its presence, not its visibility at 390.
2. **`/read`'s h2s are wrapped** in `section[aria-labelledby]` with the same ids as on `/` (`work`,
   `projects`, `stack`, `education`, `ship`), so B2.9's named-regions check holds on both routes.
3. **The favicon rider rides.** Iris judged it cheap: `app/icon.svg` and the favicon route go to ink
   (`palette.foreground`), since copper means "live now" and nothing else (the owner's call 2). The
   icon invariant that pinned `icon.svg` to `palette.accent` is rewritten to `palette.foreground`.
4. **The social card's copper bar becomes a 2 px ink rule** (same reason). Its typeface stays a
   follow-up: satori needs a vendored TTF.
5. **`/read`'s title** is "Read as page — Ruslan Shulga", on the `/sprints` pattern.
6. **Forge started before Probe's checks landed.** This run resumed the sprint four hours after the
   briefs, so the build began from the contract and the notes while Probe wrote the checks in a
   worktree, and Forge cherry-picked them onto the branch when they came. The contract's data rules
   are the shared interface; where a check and the build disagreed, the contract decided.
7. **B2.10's LCP location on `/read` is amended** (Forge's finding, Atlas's ruling): the LCP element
   is text inside `main` and not inside `[data-plan]`, within 2,500 ms at 4× CPU, at 390, 1024 and
   1440; it need not be in `main > header`. As `read-1440.webp` lays the page out, the JPMorgan
   summary in `#work` (about 90 words at the same 66ch measure as the bio's 40) is the largest
   first-screen text at every size, so the title block can't be the LCP without changing the design.
   Forge measured it at about 176 ms. On `/`, B1.9 keeps `main > header`.
8. **Iris's three cheap changes ride with the next sprint that touches that code,** not this PR:
   the dark scheme's unfilled Detail A boxes on `--background` (the owner's call, after a look on a
   real phone), the project link's gap above the rule below 1024, and the figcaption's gap at 390.
   Her verdict is ship with no musts, and advice taken after the review label costs a full
   re-review (`.crew/STATE.md`).
9. **Next's security upgrade notice is a follow-up, not this PR.** Every first `next build` in an
   agent session stops with Next's own notice that 16.4.0 "is affected by a known security
   vulnerability" and asks to run `next upgrade --agent=security`; the retry builds, and CI (no
   agent) is unaffected. Dependencies are the crew's, but a framework upgrade doesn't belong in a
   46-file design PR. It is the next S sprint, after this PR merges.
