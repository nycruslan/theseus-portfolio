# Sprint 74 (S): /crew's panel keeps whole words at a large font on a phone

**Goal:** On `/crew`, on a phone with a 20 to 28 px default font, the live panel's own words (the
status sentence, "Replay sprint n" and the Activity heading) read as whole words beside or under
their buttons, and the page never scrolls sideways, whether the feed is live or down.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production hides
a fact; sprints 70 to 73 named this one as open ("/crew's table at 320 × 28", "'answering.'
splitting mid-word"). Atlas swept production on 2026-11-16 (scripts on, feed live, crew resting
after sprint 73) at 320, 360, 390 and 414 wide with a 20, 24 and 28 px default font through CDP
`Page.setFontSizes`:

- At 320 × 28 "Pause updates" keeps its whole width in `.crew-status-row`'s `auto` column and leaves
  the status 62 px, so "Crew resting. Sprint 73 merged." prints as "Cre / w / resti / ng. / Spri /
  nt / 73 / mer / ged." and the entry as "Rep / lay / spri / nt / 73" (screenshot `status-28.png`
  in Atlas's scratchpad, described in the PR). The status is the panel's one-line answer to "what
  is the crew doing": broken that way it stops reading as words.
- The Activity heading's box is 71 px beside the kept box of "Pause replay": "Activi / ty, 16 / Nov
  / (UTC)" (`act-28.png`).
- A feed line's "committed" splits in the table's 131 px line column. That is a feed word in a
  column narrower than the word; it is not this sprint's (Out of scope).
- Sprint 70 measured, with the feed down, the table scrolling the page sideways at 320 × 28 (328 to
  338 px) and "answering." splitting at 320 and 390 with 24 and 28 px. Today's live state doesn't
  show either; the checks read the down state too.
- Nothing splits from 360 wide, or at 320 below 28 px, in today's live state.

## Checks (Probe, T35)

- **T35.** On `/crew` with scripts on, the poller ready (Pause updates shown), in the resting state
  with a replay offered and in the feed-down state (the existing fixtures in `e2e/crew-feed.ts` /
  `crew-live.ts`, whichever serve), and once during a replay (Pause replay shown), at 320, 360 and
  390 wide, with a 16, 20, 24 and 28 px default font (the root's computed font asserted to have
  taken, T27's pattern), webfont blocked: no word of `.crew-status`, `.crew-entry` or
  `.crew-activity` breaks across lines (each word's text range's client rects share one top), the
  status's text doesn't overlap its button's box, and the page doesn't scroll sideways. Red on main
  at 320 × 28. Keep the test count small (one per state, looping inside), since shard time is tight
  (`.crew/STATE.md`).
- The kept checks on the panel (`e2e/crew*.spec.ts`, notably the pause's place at the row's right
  end and the status's first line centred on it at 16 px) stay green unedited.

## Budgets

- **Nothing moves at 16 px.** At 320, 390, 768, 1024, 1440 and 1920 with the default font, webfont
  blocked, every box on `/crew` is where it was on main (Forge's box diff, as sprints 68 to 73
  measured).
- The button keeps its row's top whenever it sits beside the status. Where there isn't room for the
  status's longest word beside it, it may move under (or over) the status, on the row's content
  edge; the design keeps "Pause updates" visible and in reach either way.
- No script. CSS first (`app/globals.css`, `.crew-status-row`, `.crew-activity-head` and their media
  blocks).

## Ride-along

- Lens's sprint 73 nits: T34's header (Probe) and the `.record-hint` comment (Forge) still say the
  hint ran into the step links; it ran into the hand-off and the goal (`.crew/sprint/73/decisions.md`
  1). T34's shard comment matches the shard diff.

## Out of scope

The panel's words, the table's line column (a feed word narrower than its column may wrap), the
panel at 16 px, the bar, `/` and the Log, owner paths and `content/`.
