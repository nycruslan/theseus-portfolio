# Sprint 59 decisions

## 1. The contract mutant: no kept check goes red on Iris's placement (Probe)

**The build.** A scratch copy of 3b3f211's app (main's code at 19f675e) with Iris's recipe from
`placement.md` applied bare, nothing else:

- `components/log.tsx`: Start again reads "Rebuild it yourself"; `p[data-yard-chapter].log-chapter`
  after the count line on the chapter step ("Every plank up to sprint S is out too.", the
  `whitespace-nowrap` span as she wrote it).
- `components/log-record.tsx`: `p[data-yard-hint].record-hint` after `.record-top` on every record.
- `app/globals.css`: her recipe word for word (the shared question and chapter slot, the hint's
  held line by `visibility`, the row placed absolutely under the ghost below 768, the caption's
  72 px), with `.log-head .log-question`'s own rule and the `width < 22.5rem` block removed.
- `lib/model/yard.ts`: `QUESTION` takes `[data-yard-chapter]` too (Atlas's call).
- `lib/count-line.ts`: `chapterLine(k, merged)`, the interface H4 loads.

**The run.** On that build, `PLAYWRIGHT_BASE_URL=http://localhost:3317`, 2 workers: every
`e2e/log*.spec.ts` but log-hand, plus keyboard, keel-ways, one-site, plain-words, read, invariants,
not-found and crew-bar. Specs as committed on probe/59, with `e2e/log.ts`'s YARD_WORDS at Iris's
words. **195 passed, 10 skipped, 1 failed, in 25.5 min.**

- The 10 skips are the kept ones that skip under `PLAYWRIGHT_BASE_URL`, untouched.
- The one red is B5.24's touch drag (2), not the contract's.
- So the contract names **no rewrite and no retirement**. The links never leave `.record` in the
  DOM, so Y4's "record's head" clause, B5.6 and B5.25's order stand as written.

## 2. B5.24's red is the runner's load, not the placement (Probe)

`e2e/log-pick.spec.ts:214`, on `/log` at 390 × 844 (no step page, so Iris's rules don't apply):
"scroll after a 40 px drag from seat 5.0 (20) … (21 px)", |21 − 40| = 19 against a 16 px slop.

- Run alone on the same build it passed (1 passed, 1.5 min).
- The machine's load average was 6.5 to 11 on 4 cores during the suite (other agents' runs too).
- A touch scroll that falls short under load is the runner's. If CI ever shows it, it's a
  follow-up for B5.24's harness, not for Ha.

## 3. Ha's own checks on the mutant: 16 of 16 green; on main, 14 red (Probe)

`e2e/log-hand.spec.ts` on the mutant: 16 passed, 113 s on 2 workers (222 test-seconds). On main's
build: 14 failed, 2 passed (H5, H7).

Red on main, each for what the sprint adds:

- **H1** (five tests): next is cut or below the first screen at all three phones (639–683 at
  390 × 664, up to 736–780 at 320 × 568), scripts off and in Full. The walk fails before its first
  press.
- **H1, Iris's guard:** `.record-steps` isn't at the ghost's foot.
- **H2:** "Start again from sprint 1".
- **H3** (two tests): no `[data-yard-hint]`.
- **H4** (two tests): no `p[data-yard-chapter]`, and no `chapterLine`. The riffle from 30 already
  stops at 45 on main, so that clause passes there.
- **H6** (three tests): the WebGL-refused invariants and the Tab order pass on main. The hint (shown
  in Full, and its colour and focus) and the chapter line are missing.

Green on main, honestly:

- **H5** pins what mustn't move: the drawings' boxes from 1024, and every step's link at
  390 × 844.
- **H7** reports bytes, and gates the 3D chunk at 250,000 B.

## 4. Readings the spec makes where the contract leaves room (Probe, for Lens)

- **Shown is `checkVisibility({ opacityProperty, visibilityProperty })`, not bare
  `checkVisibility()`.** Iris's held line hides by `visibility`, which a bare call reads as shown.
- **"Its showing moves nothing"** is read two ways:
  - CLS 0, as the contract asks;
  - every box in main compared with `data-yard` set by hand and unset, on a scripts-off page at
    390 × 664, 1024 × 768 and 1440 × 900. The same read proves "CSS keys it, with no script".
- **On `/log` in Full** H1 waits for the model's rest, since the yard never mounts there and
  `data-yard` never comes.
- **H4's chapter line is read after the landing, polled up to 3 s,** since it lands with the plank
  as the question does (Atlas's call). Its every-step rule reads the server's HTML.
- **H4's sweep loads `chapterLine` from `lib/count-line.ts`,** as briefed to Forge. A missing export
  fails that test alone, and tsc stays green. The sweep also holds each line to 40 characters.
- **H2's "place"** is the DOM's (after the foot row, before the hand-off and the Theseus). Its Tab
  order is the stop after the control's last button, at 390 × 844 and 1440 × 900.
- **H6 adds one axe pass in Full at rest on each page,** the only paint where the hint shows. Y7
  runs with WebGL refused.
- **Iris's guard** (on `/log/23` with scripts off, 320 to 767 in 1 px steps: the row at the ghost's
  foot, the hint above the ghost's caption) pins her placement, not the contract. A redesign that
  moves the row retires it, not H1. It costs about 15 s.

## 5. Numbers read at the mutant (Probe)

- **B5.7:** the tenth row is `/log/49`, its h2 at 743.5–806.5 at 390 × 844 (main 710–773): 37.5 px
  spare, as Iris measured.
- **H5 at 1024 × 768:** the Theseus at 40, 104, 568 × 113.234 and the ghost at 40, 271.313,
  568 × 113.234 (page px), the same on main and on the mutant.
- **H7:**
  - the WebGL-refused `/log/13` loads 8 scripts, 138,635 B gzip -9 (−1 B against main's 138,636,
    build noise);
  - the 3D chunk is one file of 167,244 B (+11 B, the selector), 82,756 B under 250,000.

## 6. The review (Atlas)

- **Lens: ship** on dc57c5c, 0 Important, 4 nits. The first `lens` job died at setup on Bun's 504s;
  the download answered 200 twice from the session and the re-run of the failed job shipped the
  same head (STATE.md, Review).
- The PR text's "nothing moves from 1024 up" nit is fixed in the close-out. The CSS nits (scope the
  placement to `20rem <= width < 48rem`; the 112 px comment names five margins and the 44 px row)
  ride along with the next sprint on the Log CSS.
- H7's shard reading, from CI on dc57c5c: shard 2 15 min 35 s, shard 3 16 min 38 s, both under 20.
- **Iris: ship, 8.0/10**, posted as advice. Her 4 px lower row, so a focused Next's ring clears the
  ghost's keel, costs a Probe edit and a full re-review for a 2–3 px overlap of a focus ring with a
  line: it rides with the next sprint, as STATE.md's Review lesson asks for advice after a ship.
