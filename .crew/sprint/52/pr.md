## Sprint 52: something to play with

**Goal (chosen by the owner):** build something genuinely cool that entertains visitors. It starts
with research: Iris studies today's best-designed sites and creative-coding work, proposes a few
original directions on a Design canvas and recommends one, and Quill turns it into a milestone of
sprints. Pixel leads the 3D, shader and motion work. The five-second read, the budgets,
accessibility and reduced motion stay intact.

**Size:** L, notes only. It opens on a Design canvas; the build starts with the milestone's first
sprint, Ya.

### Owner's pick: which playable direction the crew builds
- [ ] A, the yard: on the Log you rebuild the Theseus one real sprint at a time, and at sprint 23 it asks which ship is the Theseus (Recommended)
- [ ] B, pull a plank: touch the home hull and every plank that ever sat in that seat fans out (needs your change to the brief's novelty budget)
- [ ] C, draw your own: drag the drafting weights on the real profile and share your own lofted hull (needs your change to the brief)

### Owner's pick: should visitors vote at sprint 23, "same ship or new ship"?
- [ ] No tally: the question stands on the page and its card, unanswered (Recommended)
- [ ] An anonymous two-counter tally, rate-limited like the assistant
- [ ] Decide after the yard's 3D press ships

**Canvas:** https://claude.ai/artifact/LwQHtrkAkhMAmC4aJH1rEE (private until you share it). It has
11 artboards with the recommendation first. One of them, "A. Play it", is a working prototype of
all 51 sprints with the real record. The frames are in `.crew/sprint/52/design/` for the Studio.

## What's in it

- `research.md` (Iris): current Sites of the Day, studio and creative-coding work, each with what
  makes it memorable, fun and shareable, and what it costs. awwwards.com and thefwa.com don't
  resolve from cloud sessions, so their listings are cited through search and write-ups, and the
  file says so.
- `direction-iris.md` (Iris): three directions and one set aside, with each one's loop, what it
  costs and its reduced-motion, no-WebGL and keyboard story. **A, the yard, is recommended** because
  it's the only one with an ending worth sending, every motion is a real merge, and it leaves `/`'s
  first screen alone. It fits `design/brief.md` as written, in its archive moment.
- `headroom.md` (Pixel), measured on a production build:
  - 11 B are left of `/`'s and `/log`'s loader script budget, so play code rides the lazily
    loaded 3D chunk, which has 95 KB of its 250 KB left.
  - three/webgpu with TSL doesn't fit: one piece alone is 272 KB.
  - Input on the existing hull would cost about 2 to 6 KB and draw frames only while touched.
- `plan.md` and `first-contract.md` (Quill): the yard as five sprints, Ya to Ye. Ya's contract,
  "every step is a page", has checks Y1 to Y8 and names the kept `/log` checks it will rewrite
  (B5.18, B5.19, B5.25's Tab clause) and those that may go red.
- `ROADMAP.md`: "the yard" is the current milestone, sprint 52 is ticked, and the stand-down moves
  under Finished.
- `decisions.md` 1 to 6, `retro.json`, and memory lines for Iris, Pixel and Quill.

## Left open, none blocking

- Iris, before Ya: where the step links go (123 px of room at 390), and their words.
- Pixel, before Yc: two hulls in one canvas count 9 draws against 8 and about 50k triangles against
  30k on desktop. His spike settles it.
- Not verified: the canvas prototype in the owner's browser (it was checked only as rendered
  states), the motion's feel (SwiftShader only), and a real GPU or phone.

Nothing here touches an owner path or edits `content/`. #101's pick stays open as written.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvcAXWN7cgSVJF2VMhC
