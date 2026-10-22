# Sprint 23 brief for Forge: build B2, the facts and `/read` (Atlas)

## What this sprint is for, and for whom

B2 of the redesign. The hiring executive who scrolls past the sheet reads the record laid out as
a drawing's schedule, with Detail A under the JPMorgan summary; the one who wants the plain page
opens **Read as page** at `/read` and can print it; a mistyped address gets a page in the site's
style. The site stays whole: `/` above the facts, `/sprints` and the sheet's checks are unchanged.

## The spec, in this order

1. `.crew/sprint/23/contract.md` (Quill): the outcome, the data rules (word for word: Probe's
   oracle implements the same rules), checks B2.1 to B2.11, the budgets, the riders and the check
   disposition. It is the spec; where the notes and it differ, the contract wins and you say so.
2. `.crew/sprint/23/notes-iris.md` (Iris): the values. Her sprint 22 notes, section 10
   (`.crew/sprint/22/notes-iris.md`), set the facts' grid and type against the frames and still
   apply where her new notes say so.
3. Probe's checks in `e2e/` (B2's new specs and the rewrites), already on the branch: run them,
   see them red, make them green. You don't edit `e2e/`: a check you think wrong goes to Atlas.
4. The frames: `.crew/sprint/17/design/work-1440.webp`, `work-390.webp`, `read-1440.webp`,
   `read-390.webp`.
5. The page as shipped: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/*`,
   `lib/*`. Your memory: `.claude/agent-memory/engineer/MEMORY.md`. Next's docs in
   `node_modules/next/dist/docs/` for `not-found.tsx`, metadata and fonts.

## What you build

- **The facts on `/`** as the frames and the notes lay them out: the big condensed heads left, the
  entries right, the period in the left column, projects as rows with one small link labelled by
  the data rule, Stack and Education and Contact as drawn. Each `li`'s `h3` first in the DOM.
- **Detail A**: a server-rendered `<figure>` in the JPMorgan entry with the five labels as real
  text, drawn only when every label occurs in the summary (a small pure function in `lib/`, unit
  checked by Probe on fixtures), connectors `aria-hidden`, outerHTML ≤ 4,096 B.
- **The bar** gains Read as page → `/read`, last; Iris's notes say how five items fit at 320 to
  1023.
- **`/read`** (`app/read/page.tsx`): the strip (`<header>` before `main`: Back to the ship, the
  address text, Print), `main > header` with the title block's facts and `#contact`, the h2s in the
  data rules' order, "The ship" with the same `[data-plan]` component and `/`'s count line, legend
  and Log link; no bar, no revision block, no Detail A, no JSON-LD. Canonical and og:url `/read`,
  its own `opengraph-image.tsx` re-exporting the root's (your sprint 18 lesson), the sitemap entry.
- **Print** is a `<button>` that exists only when scripts run and calls `window.print()` once, in
  a reserved slot (CLS 0). It is the sprint's only client component. Its script cost counts in
  B2.10's budget: `/read`'s script bytes within 2,048 B of `/sprints`'. If that can't be met, leave
  Print out and say so; the contract allows it.
- **The fonts**: the condensed face is declared once, in a module both pages import, so B1.10
  (which reads `app/` and wants each font import once) stays green and `/sprints` stays one family.
- **Print styles** for `/` and `/read`: ink on white in either scheme, the bar and the strip's
  controls hidden, the address shown, entries `break-inside: avoid`.
- **The not-found page** (`app/not-found.tsx`): `main#main`, h1 "Page not found", Iris's line, the
  two links, its own title.
- **The riders**: forced-colours fills for original planks and their swatch (GrayText or Iris's
  value), a plain `content: attr(data-label)` before the alt-text form in the folded revision
  table, and the Geist comment in `app/opengraph-image.tsx`.

## Files you own

`app/**`, `components/**`, `lib/**`, `app/globals.css`, `content/` never (the owner's facts; if a
rule needs a fact changed, stop and say so). Not `e2e/`, not the notes, not `package.json`'s
scripts. New dependencies are the crew's, but B2 should need none.

## Proof

- `pnpm verify` passes (the hook holds you to it).
- `PLAYWRIGHT_PORT=<your port> pnpm test:e2e` green, Probe's new specs included. Say which were
  red before and which are green now, with the output.
- In a real browser (a production build on your own port, agent-browser with your own session and
  the hover wrapper from your memory): screenshots at 390, 1024 and 1440 of `/` from Work down,
  of `/read`, and of the 404, in `.crew/screenshots/sprint-23/` (git ignores it) with a line each
  saying what it shows; and the print preview of `/read` as a PDF (`page.pdf()` in a scratch
  script, or Chromium's `--print-to-pdf`), with its page count for Letter.
- The budgets measured: Detail A's and `[data-plan]`'s outerHTML on `/read`, the two woff2 on
  `/read`, script bytes on `/`, `/read` and the 404 against `/sprints`, LCP on `/read` at 4× CPU.
- Iris looks at your running build early: when the facts and `/read` first render, tell Atlas the
  port and leave the server up until Atlas says Iris is done with it (your memory: note the PID,
  stop it by PID).

## Report

Outcome first; then what's built and what isn't, the commands with their results, the screenshots
and what each shows, the budgets measured, anything done differently from the contract or the notes
and why, decisions you need and from whom, and what you couldn't verify. Then at most three memory
lines in `.claude/agent-memory/engineer/MEMORY.md`, each citing `.crew/sprint/23/`, correcting any
line that proved wrong. Commit on `sprint/23-the-facts` in this checkout, in small commits (Probe's
and Iris's commits are already on it; don't push, Atlas pushes).
