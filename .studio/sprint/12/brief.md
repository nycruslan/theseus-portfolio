# Sprint 12: the sprint log's contract ("Watch the team build")

**Lead:** Atlas. **Goal:** the roadmap's top open item, "Watch the team build" (chosen from the
roadmap; Quill named it next in `.studio/sprint/11/pick-quill.md`). **Size:** L, contract step. No
product code.

The site says a team of agents rebuilds it, but a visitor sees only the result and a GitHub link. A
page (or section) of sprints, built at build time from `.studio/sprint/*/retro.json` (goal, outcome,
PR link, what went wrong), would show the process. It brings new visual language, so Iris gives
direction first; Quill writes the contract on it.

## Steps

1. **Iris (`iris`): direction.** `.studio/sprint/12/direction-iris.md`: where the log lives (a route
   of its own or a section of `/`, and how a visitor reaches it), what one sprint's entry shows and
   how it looks in the page's existing language (tokens, type scale, Experience entries, copper),
   ordering, how much of `wentWrong` to show, and what it must never look like. Checked against the
   running site and `design/rubric.md`.
2. **Quill (`quill`): the contract.** `.studio/sprint/12/contract.md` on Iris's direction: the outcome,
   numbered checks a browser can show (each groundable in the current page or the retro files as they
   are on main), out of scope, the build split into S/M PRs, and "Needs owner decision". It must handle
   both retro shapes (sprints 1–4 snake_case, 5+ camelCase) and missing fields, read only team-written
   files, and leave `content/` untouched.
3. **Lens in CI** on the PR, labelled `needs-owner` and `review`. Two fix rounds at most.
4. The owner accepts the contract by merging. The build is a later sprint's.
