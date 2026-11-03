## Sprint 48: the ways into the keel (Kb, M)

**Goal (from the roadmap):** a hiring executive reaches the keel from "his rules" in the revision
key and from the crew page's Approval line in one click, and beside the rules reads how the crew's
merged sprints were approved.

**Contract:** `.crew/sprint/48/contract.md` (K9 to K12, from `.crew/sprint/46/plan.md`'s Kb).
Decisions: `.crew/sprint/48/decisions.md`. Sized S in the plan, run as M because kept checks pin
the key as link-free (decisions 2).

### What's built
- **K9:** "his rules" in the revision key is a server-HTML link to `/crew#keel`. The key is one
  shared component, so it shows on `/`, `/log` and every `/log/<n>`. It's an inline link
  (`INLINE_LINK` in the new `components/crew-link.ts`) with `py-1` for a 24 px target and
  `whitespace-nowrap` (Iris) so it never splits. The key's box and the contact links' boxes are
  unchanged at eight windows from 1920 to 390.
- **K10:** "Ruslan Shulga's rules" in `/crew`'s Approval line links to `#keel`, in each state that
  says it.
- **K11:** `.keel h2` has a scroll margin, so the heading lands wholly under the bar: 97.7–135.5 px
  at 1440 × 900 and 1536 × 715, 86.4–117.9 px at 390 × 664, scripts on and off, CLS 0.
- **K12:** `p[data-keel-record]` after the keel's lead: "46 sprints merged: 33 on the checks alone,
  13 on Ruslan's own call.", counted by `ownersCall`, equal to `/log`'s 33 Gate and 13 Owner cells.
- **Lens's two nits on #110:** `LINK` moved to `components/crew-link.ts`, so `components/crew.tsx`
  stays client-only; `globals.css`'s comment on the drawing's two-row span now says Chromium can't
  tell it from one row, so K7 doesn't guard it.

### Kept checks rewritten (for Lens)
Each one pinned the key as having no link, or pinned exact Tab stops or link lists that the new
link joins. Each rewrite keeps the exact text or the exact list, with `/crew#keel` (or `#keel`) in
its one place, and nothing else relaxed (Probe, 5e36bf6):
- P8 (`plain-words.spec.ts`): "no a" became "exactly one a, to `/crew#keel`, reading `his rules`".
- B2.3 (`keyboard.spec.ts`): 24 stops became 25, with `tabUntil`'s bound set to 25.
- B4.24 (`live-layer.spec.ts`), B4.49 (`crew-replay-home.spec.ts`), B1.5 (`sheet.spec.ts`): the
  block's link order, plus the key's one link.
- B4.8 (`crew.spec.ts`): the panel's link list, plus Approval's `#keel`.
- B5.6/C5.3 (`log-record.spec.ts`): the allowlist, plus exactly one `/crew#keel` inside the key.
- B5.9/C10 (`log.spec.ts`), B5.25 (`log-control.spec.ts`): the `/log` and `/log/13` Tab walks, plus
  `/crew#keel` where the key sits.

Nothing is retired. **One added skip:** `e2e/keel-ways.spec.ts`'s describe "on this checkout's build and the feed's fixtures" is skipped under `PLAYWRIGHT_BASE_URL` (`test.skip(DEPLOYED, …)`). Its one test serves copies of this checkout's build pointed at the fixture server, which can't be done against a deployment. CI never sets `PLAYWRIGHT_BASE_URL`, so the test runs on every CI pass, and K9–K12's default-server passes still run against deployments. `crew.spec.ts` and `keel.spec.ts` use the same guard. B2.9 (24 px targets), B2.10, P10 and W1–W17 run unedited.

### Results
- `pnpm verify` passes on the integrated tree (Atlas, 263da1b): lint, typecheck, knip and build.
- **Full e2e on 263da1b, fresh build:** 343 passed, 0 failed, 0 skipped (CI's conditions), in 32.5 min on 2
  workers (Probe). `e2e/keel-ways.spec.ts` (K9–K12) is red on the sprint base.
- **Script bytes** (Forge): `/` 464,751 B before and after (0 B new). `/crew` beyond the 404,
  18,604 → 18,838 B (budget 20,480); beyond `/log`, 16,567 → 16,801 B (budget 18,432).
- **Iris: ship, 7.8/10.** axe found 0 serious or critical issues in 36 runs, nothing overflows at
  320, and CLS is 0 everywhere. Her one fix (nowrap) is in. Screenshots are in Atlas's session
  scratchpad (`iris/s48/`): the key against production at 1440 and 390, the record line, the
  Approval line, and each landing.

### Follow-ups (not this PR)
- Iris: the site's focus ring (2 px at a 2 px offset) around an inline link touches the lines
  around it. A treatment that stays inside the line means Probe rewriting the ring checks.
- Iris's idea: "46 sprints merged" could link to `/log`.
- The keel in `/llms.txt`, `/api/me.json` and `/crew`'s card (the plan's follow-ups).

### Not verified
- Safari and Firefox (headless Chromium only).
- The Vercel preview at the time of writing; Iris used a local build.
