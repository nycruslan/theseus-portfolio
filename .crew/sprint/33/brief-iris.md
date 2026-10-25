# Brief: Iris, sprint 33 (B5c's calls)

**What it's for.** B5c puts the card model on `/log` in vellum: the ghost hull, the 22 original
planks numbered by the sprint that took each one out, as the 2D drawing on `/log` numbers them
today. It's the archive moment the direction's novelty budget allows, and the last of B5. A
pointer on a plank opens that sprint's record; the table stays the keyboard's way in. The plan is
`.crew/sprint/29/b5-plan.md` ("B5c"); the approved direction is `.crew/sprint/17/direction-iris.md`
and the owner's canvas (ROADMAP.md, "Now: the redesign"); the frames include `log-1440.webp`.

**Your job now, before the build:** write `.crew/sprint/33/notes-iris.md`, short and decisive,
with the calls the builders need. Each is a call inside the approved direction; if one needs a
visible departure from it, say so plainly, since that is the owner's.
1. The vellum in 3D: material, colour in both schemes (B5a set `--vellum` light `#d7e2e1`, dark
   `#3f4d52`), how it reads against the sheet and against `/`'s white card hull; lighting.
2. The numbers: on the planks in 3D, beside them, or left to the 2D drawing; their face and size.
3. Full's one camera move (what it shows, duration, easing) and Calm's settled view, per width.
4. The pick's affordance: hover state and cursor, what a touch does, how a visitor learns planks
   are clickable without breaking "nothing on `/log` is copper" (copper means live now only).
5. The control's place on `/log` at 390, 768, 1024 and 1440, given #78 (waiting for the owner)
   re-lays the bar below 768 and moves Read as page to the drawing's foot, on `/log` after the
   count line: a place that both PRs can keep when the second merges.
Quill is writing the contract at the same time (`.crew/sprint/33/contract.md`) and will fold your
notes in; Pixel is spiking the mount (`.crew/sprint/33/spike-pixel.md`). Look at production
(https://theseus-portfolio.vercel.app/log and `/`) and the code before you decide.

Later in the sprint you'll look at Pixel's running build early, and review the finished PR against
`design/rubric.md`.

**Files you own:** `.crew/sprint/33/notes-iris.md`, your memory. Work in your own worktree if you
build (`git worktree add /home/user/wt-iris-33 HEAD`; `pnpm install --frozen-lockfile`), ports 4820
to 4829, servers started with node and killed by PID; screenshots in your scratchpad or
`.crew/screenshots/`.

**Report:** the notes' path and the five calls in a line each, with anything that needs the owner.
Don't commit; Atlas does.
