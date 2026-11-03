# What comes next: the record you can check, then stand down (Quill, sprint 49)

## The call

**One sprint, then the crew stands down until the owner answers the pick on #101.**

The sprint, Ra (M), makes the keel's last claim true and checkable. Today the record line counts
sprint 36 as merged "on the checks alone". It wasn't: #91 changed an owner path and waited for
Ruslan (`close.md`). After Ra:

- the line, `/log` and `/log/36` say what really happened;
- the line links to `/log`, where a visitor can check it;
- a guard in the crew's merge-record step refuses the next miscount before it ships.

After Ra, nothing left serves `PRODUCT.md`'s beliefs enough to earn a milestone without the owner.
The crew stops, and says so in `ROADMAP.md`.

## The outcome

A hiring executive who reads "N sprints merged: G on the checks alone, O on Ruslan's own call" can
trust the numbers and check them. The line links to the Log, and every revision's Approved there
says what GitHub's gate really did. Today the line reads 34 and 13, and the truth is 33 and 14. The
checks are R1 to R5, all in Ra. No sprint needs an owner answer to start, touches an owner path or
edits `content/`.

## Why this, and why only this

- **Principle 3 is the product's claim, and this breaks it.** `PRODUCT.md`: "Show the crew honestly:
  what it did, what it's doing, and who approved it." The keel is the one place the site argues the
  crew is governed. Its every rule links to its source, and its one number links to nothing and is
  wrong. An engineer or board member who checks one claim will check that one. The fix is tiny. Not
  making it costs the whole section's credibility.
- **Why the record isn't the keel's leftovers.** The keel's checks passed: K12 asks that the line
  equal `/log`, and it does. The miscount sits in a retro from sprint 36, read by a rule that matches
  prose (`needs-owner` in `outcome`). Nothing in the keel's contract could see it. It's a new finding,
  with its own outcome a visitor can check.
- **Why not more:**
  - **The keel in `/llms.txt`, `/api/me.json` and `/crew`'s card.** The first reader is a person
    deciding in seconds, not an agent. `/crew`'s card is `/`'s card today, with his name, role and
    particulars, which serves belief 1 in the most common share. A crew-first card trades belief 1
    for belief 2 in that share. That's for the owner to want, not for the crew to push. It stays a
    follow-up.
  - **The backlog under "Finished"** (the focus ring, the LCD hand-off checks, the 24 px bar,
    `openHome` and `shownOn`). Each is real and small, and none changes what the executive takes
    away. A sprint of them would be a grab-bag, the stream of polish `.crew/STATE.md` warns about
    (sprints 18 to 21). The 24 px bar is the one a reader would see. It's measured in `close.md` and
    rides with the next sprint that touches the bar.
  - **Letting the assistant (`/ask`) answer questions about the crew.** Its record (`SYSTEM` in
    `lib/assistant.ts`) is his résumé and case studies and says nothing about the crew, so it can't
    say who built the site. `PRODUCT.md` says it "answers from the owner's facts", so widening its
    record is his call, not a crew milestone. Listed for him below, not asked.
  - **Belief 1's depth** (the JPMorgan case study) needs his facts. **Belief 3's signature** (the
    loft, the live pencil, the ghost) waits for his demos on a GPU and a phone. Neither can move
    without him.
- **Why stand down rather than invent work:** `.crew/STATE.md` says that when the milestone can't
  move until the owner answers, the team stands down. The pick has been open since sprint 42. The
  crew built its recommended option because it could be undone. Building past it on lesser work
  spends sprints a visitor won't notice.

## The sprint

### Ra (M): the record you can check

The contract is `first-contract.md`, with checks R1 to R5. It's M, not S: Probe rewrites one kept
check (K6's link count) and writes the new ones, Forge builds the link and the guard, and Iris makes
one small call first. Kb was planned S and ran M on exactly this pattern (`.crew/sprint/48/decisions.md`
2).

- **R1 Sprint 36 reads Owner** on `/log`'s row and `/log/36`'s record.
- **R2 The keel's line is true**, and still equal to `/log`'s counts.
- **R3 The line links to its evidence:** `/log`, one link, server HTML.
- **R4 It can't drift again:** the merge-record step refuses a Gate retro whose PR touched an owner
  path.
- **R5 (rider):** K11's deployed landing read, root cause first.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/crew` and `/` | B4.14's budgets and B2.10, unedited |
| CLS 0 on `/crew` at load and on landing | K7 and K11 |
| Nothing new is copper | K12's paint read and K6, unedited |
| `/`'s first window unchanged | W1 to W17, B4.22, P3 and P8, unedited (Ra doesn't touch `/`) |
| CI under `check`'s 35 minutes | reported |

## Out of scope

- **Saying what each owner call decided** (a sentence per Owner revision). That's crew-written text
  about his decisions, published, which is the owner's to want (`.claude/agent-memory/product-owner/`,
  sprint 12's line). The PR link on each record already lets a visitor read it.
- **A filtered "his calls" view of `/log`.** The Approved column already sorts them.
- **Changing the rule the Approved column reads, or `.claude/skills/sprint/retro.md`.** The skill is
  an owner path. Ra's retro proposes documenting the `needs-owner` token there.
- **Changing any rule the keel quotes, any owner path, or `content/`.**
- **The focus ring, the 24 px bar, the LCD hand-off checks, `openHome` and `shownOn`.** Each rides
  with a sprint that touches its code.

## After Ra: standing down

Once Ra merges, the crew opens no sprint until one of these happens:

- the owner answers the pick on #101: the JPMorgan case study from his facts, or standing down for
  good;
- he sets a goal;
- a defect on production makes something the site says false, or hides a fact.

Each run's pre-flight still runs. Riders wait in `ROADMAP.md` for whichever sprint comes next.

## What waits for the owner

Nothing holds Ra. The pick on #101 stays open as written. These are for him, and none is asked:

- whether `/ask` may answer from the crew's record as well as his facts (a `PRODUCT.md` change);
- whether `/crew`'s shared card should lead with the crew rather than with him;
- his demos, and the five-second test.
