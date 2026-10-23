# Sprint 27 brief for Iris: the control's place on phones, first; then beside the build; then the review (Atlas)

## What this sprint is for

B3's last build sprint: the Full/Calm/Off control the owner approved on the canvas
(`.crew/sprint/17/design/motion-control.webp`; your sprint 22 notes, section 9, give its look:
an `inline-flex` group with a 1 px ink border, `role="group" aria-label="Motion"`, three
`<button aria-pressed>` 32 px tall, 44 on phones, padding 0 12 (0 16 on phones), 14/600, 1 px ink
dividers, pressed = ink ground, film text). Full is the default, reduced motion starts at Calm,
the choice is remembered on the device. Full plays the loft once a visit; Calm opens settled and
draws on events only; Off is the 2D sheet, no 3D chunk, no WebGL context. The control exists only
where scripts run, in a slot the bar keeps for it so nothing moves (as Print's slot on `/read`).
The contract is `.crew/sprint/27/contract.md` (Atlas is writing it as you start; read it when it
lands). Forge builds, Probe writes the checks first. The B3 demo on the owner's phone follows on
this PR's preview.

## Part 1: where the control sits, within the hour

**Desktop is decided by the approved frame** (`main.webp`): the bar's right end, after Read as
page. Confirm the sizes at 1024 and 1440 (the bar is 56 px tall from 1024 px, `components/bar.tsx`),
and the gap between Read as page and the group.

**Below 1024 px is open, and it's your call.** The canvas (`hero-390.webp`) put the control in the
first screen's bottom strip beside Read as page, on a sheet that no longer exists as drawn: since
sprint 22 (owner-approved, #62) the phone bar carries the wordmark and all four links on one row
(Work, Log, Contact, Read as page; 44 px tall, one line down to 320), and the first screen is the
drawing, then the title block. Look at production at 390, 320 and 768 (https://theseus-portfolio.vercel.app,
both schemes) and decide where three 44 px buttons go, with numbers a builder can type:

- the position in the layout (a second row of the sticky bar; the canvas's strip, fixed or in
  flow, and where; a row between the drawing and the title block; anything better), with the
  group's size, alignment and margins at 320, 390 and 768;
- what it costs the first screen at 390 × 844: B1.1 (`e2e/sheet.spec.ts`) wants the name, role,
  bio and the three contact links wholly inside the first viewport at 390 × 844, and the slot is
  there with scripts off too, so an empty slot must look intended;
- the DOM: Quill's plan (`.crew/sprint/24/b3-plan.md`, sprint 27) and the checks assume the group
  follows the four links inside the bar's `nav` at every width, so the Tab order is skip, Work,
  Log, Contact, Read as page, Full, Calm, Off. If your placement needs the group elsewhere in the
  DOM, say so and why; it changes Probe's rewrites;
- whether your call departs visibly from `hero-390.webp` as the owner approved it: if it does, one
  paragraph Atlas can put to the owner on the PR with the preview, as sprint 26 did for the rest
  pose.

Constraints that hold: no horizontal scroll at 320; all four links on one line at 320; 24 px
targets from 1024 and 44 on phones (B2.9); one ring per focused button in forced colours; CLS 0
(the slot is sized before the buttons arrive); the 404 and `/read` don't change. On a cold cache
production's fallback face wraps the bar's nav at 390 today (your sprint 26 review); Forge fixes
that in passing, so say what the bar should do there if your placement changes the bar.

Write the call as `.crew/sprint/27/notes-iris.md` on `sprint/27-motion-control` in this checkout
(commit, don't push) and report it to Atlas the moment it's written: Atlas relays it to Forge and
Probe mid-build.

## Part 2: beside the build, then the review

Atlas messages you when Forge has a build running, with its URL (or a worktree to serve yourself,
ports 4720 to 4729; `git worktree add /home/user/wt-iris-27 <branch>`, `pnpm install
--frozen-lockfile`, `pnpm build`, `node node_modules/next/dist/bin/next start --port 4720 &`,
note `$!` and kill the `next-server` child by PID when done). Look early at 320, 390, 768, 1024
and 1440, both schemes, scripts off (the slot), reduced motion (Calm pressed), forced colours,
and each mode's switch mid-visit (Off mid-loft, Calm → Full), and say exactly what to change
while it's cheap. When the build is done, review it against `design/rubric.md` and production
(pixel-identical at every width with the group apart is the expectation for the sheet; the
control is what's new), score it, and write `.crew/sprint/27/review-iris.md` with `Verdict: ship`,
`changes` or `blocked` on the first line, your musts and your cheap changes apart, frames in your
scratchpad or `.crew/screenshots/sprint-27/` (git ignores it) with a line saying what each shows.
Then at most three memory lines citing `.crew/sprint/27/`, and correct any line of yours that
proved wrong.
