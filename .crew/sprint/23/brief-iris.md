# Sprint 23 brief for Iris: build notes for B2, then the review (Atlas)

## What this sprint is for

B2 of the redesign: the facts below the sheet laid out as your frames show, with Detail A; "Read as
page" at `/read`; a not-found page. For the executive who scrolls past the sheet, and the one who
wants the plain page. Quill's contract is `.crew/sprint/23/contract.md` and it is the spec; your
notes give the values the contract leaves to you, under it. Sprint 22's lesson
(`.crew/sprint/22/retro.json`, wentWrong 2): notes and contract written in parallel disagreed in
twelve places. This time the contract is done first, so read it before you write a line, and where
you'd disagree with it, say so to Atlas in your report rather than writing a different rule into
the notes: Probe's checks follow the contract.

## Part 1: the build notes, `.crew/sprint/23/notes-iris.md`

Your sprint 22 notes, section 10, already set the facts' grid, type and spacing against
`work-1440.webp` and `work-390.webp`, and the build reads them. Don't repeat them: say what still
holds and what changes now that B1 shipped (the sheet as built, not the canvas: your memory). Then
the new objects, with values a builder can type:

1. **Detail A** (`work-1440.webp` under the JPMorgan summary, `work-390.webp` stacked): the boxes,
   arrows, strokes, type (the condensed face at what size), the filled box, the dashed rule above,
   the caption, both schemes, forced colours, print, 390 and 1440. Its words are the summary's own,
   verbatim, as the contract lists them. Real text, no raster.
2. **Projects as rows** (no cards): the link in the date column, the name in the company style, in
   both schemes, hover and focus (ink, never copper), the 24 px target, and what replaces the
   card's whole-surface link, if anything.
3. **`/read`** (`read-1440.webp`, `read-390.webp`): the header strip (Back to the ship, the URL
   line if kept, Print if the contract keeps it), the measure, the heads, the entry layout, "The
   ship" with the drawing and the count line, print styles, and what the page shares with `/`
   (tokens, type steps, the drawing component).
4. **The not-found page**: in the site's style, with a link home. One short note.
5. **The bar's new link**, Read as page, at the right end on `/` (`work-1440.webp`), and the bar at
   390 with four links (`work-390.webp` shows three; say where the fourth goes).
6. **Riders**, if the contract carries them: the forced-colours fills for seated and original planks
   and the legend swatches (Lens's nit on PR #62: today both fill Canvas and look the same), and
   whether the social card's typeface or the favicon's copper mark is cheap enough to ride now.

Keep every text token-named (`--foreground`, `--muted`, the step tokens) so the invariants read
them. Write the file, commit it on `sprint/23-the-facts` in this checkout (don't push), and report:
what you set, what you'd change in the contract and why, and what you couldn't verify.

## Part 2: beside the build, then the review

Atlas will message you when Forge has a build running. Look at it early at 1440 and 390, both
schemes, against the frames and the rubric, and tell Forge (through Atlas) what to change while
it's cheap. When the build is done, review it against `design/rubric.md` and production, score
it, and write `.crew/sprint/23/review-iris.md` with `Verdict: ship`, `changes` or `blocked` on the
first line, your musts and your cheap changes apart, with screenshots in your scratchpad or
`.crew/screenshots/` (git ignores it) and a line saying what each shows. Then at most three memory
lines citing `.crew/sprint/23/`.
