# Sprint 42: decisions (Atlas)

1. **A planning sprint, as the roadmap said.** Pa, Pb and Pc were merged (#97, #99, #100) and the
   pre-flight said start. The roadmap named the next step: Quill closes the milestone on
   production and plans the next. Building Wa in this run would mean guessing Iris's placement
   call, which decides whether Pixel and the 3D suites come in, so this sprint is notes only, like
   sprint 38.
2. **The next milestone is the first window, not a case study or the keel.** Quill's close found
   the last milestone holding at the sizes its checks pin (1440 × 900, 390 × 844) and failing on
   common browser windows. Atlas checked one: the screenshot at 1536 × 715 shows the name starting
   at y 600 and the title block's links below the fold. The cause Quill names is in
   `app/globals.css` (`.sheet-row`, the drawing band at 0.3381 of the width). A first window
   that loses the name and the contact links fails `PRODUCT.md`'s first belief before any new
   proof could help, and fixing it needs no owner answer.
3. **The milestone after next is asked now, as an Owner's pick that can be undone.** A published
   keel publishes the owner's setup and a case study needs his facts, so both are his to choose.
   Asking it now means the answer is in when this milestone closes; nothing is built from it
   before then, so it holds no work. Recommended: the keel, since it needs no new facts.
4. **Checked by Atlas:** the plan and Wa's contract touch no owner path and edit nothing in
   `content/` (`git status` shows notes, the roadmap and Quill's memory only); the retro's goal is
   one line under 78 characters with no milestone code or path, so sprint 37's coded row ages out
   when this merges, as Quill's close expects.
