# Sprint 22, fix round 2: Lens's review of aa9fcd9 (Atlas)

Lens reviewed the head once the owner's #63 gave it the turns a page replacement needs. The verdict
is `changes`, with one Important finding and two nits. The whole review is the `lens` check run's
summary on aa9fcd9 (https://github.com/nycruslan/theseus-portfolio/runs/119846910057). This round
fixes the Important finding, takes the cheap nit with it, since it's in the same line, and refreshes
the notes the third nit named.

## For Forge: the card over the bar (Important), and the ring on phones (nit)

**Who it's for.** A visitor between about 768 and 1300 px who scrolls until a project card sits
partly under the sticky bar, hovers the card, then clicks Work, Log or Contact in the bar.

**What's wrong.** `components/bar.tsx` is `sticky top-0 z-10`. A linked card in
`components/project-card.tsx` lifts itself with `hover:z-10` and `has-[a:focus-visible]:z-10` to
paint its ink over the seam it shares with its neighbours. Nothing between the root and the card's
`li` makes a stacking context, so both are z-index 10 in the root context and the card wins, since
it comes later in the DOM. The card's title, arrow, border and ring paint over the bar, and the link's
`after:absolute after:inset-0` overlay keeps the li hovered while the pointer moves up into the bar,
so a click on a bar link opens the project's external URL.

**The fix.** The lift only has to clear the unlifted neighbours, which have no z-index, so `z-[1]`
is enough: `hover:z-[1]` and `has-[a:focus-visible]:z-[1]`, and the comment on line 11 says the new
number and why. (Raising the bar to `z-20` and the skip link to `focus:z-30` also works, but it
touches two more files for the same result.) Keep the seam fix: a hovered card must still paint its
ink over its neighbours' top rule.

**The nit, same line.** Below md the li is `-mx-6` inside a `px-6` wrapper, so under 672 px it spans
the whole viewport and the 2 px ring at `outline-offset-2` falls off both sides: a phone shows two
horizontal lines, not a box. Add `max-md:has-[a:focus-visible]:-outline-offset-2` (or the
equivalent) so the ring is drawn inside the li on phones and stays as it is from md. The contract
describes a boxed ring (B1.6, `tokens.webp`); B1.6 checks the ring at 1440 only, and
`keyboard.spec.ts`'s card-focus check must stay green.

**Files you own:** `components/project-card.tsx` only. Don't touch `e2e/` (Probe is adding the
check in parallel, in her own worktree) or the notes (Atlas).

**Proof.**
- `pnpm verify` passes.
- In the browser (agent-browser with your own session, a production build on your own port): at
  1024 × 768, scroll so the first linked card sits partly under the bar, hover its visible part, then
  click Log in the bar and land on `/sprints`; Tab to a card that sits under the bar and show the
  bar still paints over it. A screenshot of the hovered card under the bar, before and after, in
  `.crew/screenshots/` (git ignores it) or your scratchpad, with a line in your report saying what
  each shows.
- At 390 × 844, Tab to a linked card and screenshot: the ring is a box with four sides.
- `pnpm test:e2e` (`PLAYWRIGHT_PORT=<your port>`) green, `cards.spec.ts` and `keyboard.spec.ts`
  included.

**Report:** the diff, the commands with their results, the screenshots and what each shows, and
anything you did differently and why. Then at most three memory lines in
`.claude/agent-memory/engineer/MEMORY.md`, each citing `.crew/sprint/22/`, correcting any line the
round proved wrong. Commit in this checkout on `sprint/22-the-sheet`; don't push, Atlas pushes.

## For Probe: the check that pins it

**Who it's for.** The same visitor. Today B1.3's "following each link from the bar lands on its
target" passes because no card sits under the bar when it clicks.

**The check.** In `e2e/sheet.spec.ts`, beside B1.3, one test: at 1024 × 768 scroll so a linked
project card (`#projects` list, `li` with a link) sits partly under the bar's box, hover the card's
visible part, then click each bar link in turn (Work, Log, Contact) and assert the landing: the
fragment's target is in view for Work and Contact, and the URL is `/sprints` for Log. Also assert,
with `elementFromPoint` at the centre of the Log link while the card is hovered, that the hit element
is inside the bar's `<nav>`. It must be red on the current head (aa9fcd9's code, where the card's
`hover:z-10` ties the bar's `z-10`) and green once the card lifts to `z-[1]`: show both, with the
command and its result, by running it once before you apply Forge's one-line change locally in your
worktree and once after (change `hover:z-10` and `has-[a:focus-visible]:z-10` to `z-[1]` in
`components/project-card.tsx` for the green run, then revert it: Forge owns that file and commits
the real fix).

**Files you own:** `e2e/sheet.spec.ts` (and `e2e/helpers.ts` if a helper is needed). Work in your
own worktree from `sprint/22-the-sheet`, on your own port, and commit there; name the commit for
Atlas to cherry-pick. `pnpm install --frozen-lockfile` first: a fresh worktree has no `node_modules`.

**Report:** the test's title, the red run and the green run with their output, and at most three
memory lines in `.claude/agent-memory/qa-engineer/MEMORY.md` citing `.crew/sprint/22/`, committed in
the worktree.
