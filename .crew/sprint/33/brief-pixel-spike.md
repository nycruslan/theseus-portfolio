# Brief: Pixel, sprint 33 (the spike for B5c)

**What it's for.** B5c puts the card model on `/log` as the ghost hull in vellum: the 22 original
planks, each numbered by the first sprint that took it out (the 2D rule in
`.crew/sprint/29/b5-plan.md`, "The data rules", and `components/log.tsx`), under the Full/Calm/Off
control in `/log`'s bar; a pointer on a plank opens `/log/<n>`. It's the first mount of the model
on a second route; B4d will reuse the mount on `/crew`. Before the contract is final, the team needs
measurements, not guesses.

**Your job now:** a short spike in your own worktree, then `.crew/sprint/33/spike-pixel.md`:
- How `components/model.tsx` and `lib/model/mount.ts` (and `stage.ts`, `hull.ts`, `loft.ts`) can
  mount on `/log` over the ghost drawing: what's shared, what's per route (the sheet vs. the ghost,
  the loft vs. one camera move), the smallest seam, and whether the chunk stays one chunk.
- The ghost hull's cost measured in a scratch mount: draws, triangles at desktop and at phone DPR,
  the chunk's gzip as B3.6 (`e2e/model-cost.spec.ts`) measures it, 0 frames at rest.
- Picking: raycast against the planks vs. an ID buffer, cost per pointermove, and how a pick maps
  to a sprint number from the same rule the 2D drawing uses.
- Numbers on the planks if Iris wants them (she's deciding in `.crew/sprint/33/notes-iris.md` at
  the same time; read it if it lands): what they cost (canvas texture atlas, SDF, or the 2D
  drawing's SVG beneath a hollow canvas as `/` does).
- Anything in the plan that won't hold.
Quill is writing the contract at the same time (`.crew/sprint/33/contract.md`) and reads your file.

**Setup:** `git worktree add -b pixel/33 /home/user/wt-pixel-33 HEAD`; `pnpm install
--frozen-lockfile`; ports 4850 to 4859; servers with node, killed by PID (check the port after:
`kill $!` can leave `next-server` serving). Spike code stays out of the product: keep it on
`pixel/33` only if it's the start of the build, and say which.

**Files you own:** `.crew/sprint/33/spike-pixel.md` (write it in the main checkout at
`/home/user/theseus-portfolio/.crew/sprint/33/`), your worktree, your memory. Don't commit
there; Atlas commits the notes.

**Report:** the file's path, the numbers with how you measured them, and the seam you recommend.
