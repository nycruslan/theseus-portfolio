# Sprint 35 (B4c): what every role reads first (Atlas)

**What it's for.** A hiring executive who clicks through to `/crew` from the pencil row on `/`
should see the crew working, not a snapshot. Today `/crew` is server-rendered from a 30 s cached
read and never moves after load. B4c makes it move while they watch, which is the proof
`PRODUCT.md` asks for: an AI org running in the open.

**The outcome** (the plan, `.crew/sprint/28/b4-plan.md`, "B4.3 (M): `/crew` live in the browser",
and its "Live in the browser, and WCAG 2.2.2" section): a visitor who stays on `/crew` sees
- the crew table, the now line and the moments update as the feed does, within about a minute;
- a run that ends while they watch turn into the rest state;
- "Pause updates" (beside the Live label, `aria-pressed`) stop it;
- a screen reader hear who started or stopped working, not every moment (one polite live region).
The browser reads only the portfolio's own `/api/crew` (CDN-cached about 30 s, contract fields
only); the Studio's URL stays server-side. Polls run every 30 s while live and visible, every 60 s at
rest, and never while hidden or paused. `/` stays exactly as B4b left it, with 0 B of new script.

**Out of scope:** the hull on `/crew` (B4d), Replay (B4e), any change to `/`'s look.

**Riders this sprint carries** (from `ROADMAP.md`, B4a and B4b):
- Lens's four nits on #78: the `lib/sprint-log.ts` and `next.config.ts` comments miss `/crew`'s
  request-time read of the retros; `crew.spec.ts` serial, its 40 s deadline, and skipping under
  `PLAYWRIGHT_BASE_URL`.
- Lens's empty-goal nit on #87: a blank feed goal renders an empty link (`goal?.trim()` in
  `layerOf` and the oracle), and the three test nits on 415b4c0 (the copper scans match
  `.swatch-tip`, not the legend's words; B4.15's title says `--pencil`; `crew-feed.ts`'s site-count
  comment).

**Read:** `.crew/sprint/28/b4-plan.md` and `feed-contract.md`; `.crew/sprint/31/contract.md`
(B4a: the read, the four states, the fixture harness); `.crew/sprint/34/contract.md` and
`decisions.md`; `lib/crew-feed.ts`, `app/crew/page.tsx`, `components/crew.tsx`,
`components/crew-table.tsx`; `e2e/crew*.ts`; `.crew/STATE.md` (CI's 25-minute cap and the B2.10
budget lessons); your own memory.

**Working:** your own worktree (run `pnpm install --frozen-lockfile` first) and your own ports.
Commit and push your branch (`<role>/35`) after every commit, and tell Atlas (SendMessage to `main`)
the commit when something lands another role needs. Bash descriptions say what a command does,
never the command. Finish with the report `CLAUDE.md` asks for.
