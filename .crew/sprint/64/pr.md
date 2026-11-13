## Sprint 64: drag the window yourself, and the page measures as you go

**Goal (from the roadmap, milestone "Try to sink it", sprint Tb):** with script, take the trials frame's corner and drag. Ruslan's first page reflows under the hand inside the scriptless frame, the contact links' freeboard is measured live from the frame's own document, a release settles on a window the crew swept, the address is replaced (never pushed), Copy link hands over the dare, and every window's address unfurls as its own card ("Under by 6.2 px. The crew's own gap."). Without script, Ta's page is unchanged.

**Size:** M. Contract: `.crew/sprint/64/contract.md` (T10 to T15, Atlas's four calls). Decisions: `.crew/sprint/64/decisions.md`. Iris's words and placement: `words.md`, `placement.md`. Pixel's spike: `spike.md`. Probe's hooks and mutant: `selectors.md`, `mutant.md`.

### What a visitor gets
- **The corner** (`components/trials-corner.tsx`, `lib/trials-live.ts`): a crop bracket at the frame's foot, a 44 px button. It takes a mouse, a finger and the keys (arrows one grid step, Page keys ten, Home and End the corners). The frame keeps the scale it had at the grab, so the corner stays under the hand. Mid-drag the number is the live measure, and the verdict's slot reads "Measured live in your browser", since a verdict beside an unswept number would be false. Release settles on a swept window: exact first, then a pinned or named window within half a grid step, else the grid's rounding (contract call 1).
- **One settle, said once:** the address (`history.replaceState`), the title, the canonical, the answer, the record and the corner's name all change together, and a polite live region says e.g. "390 by 664: Held by the crew's checks, 201.8 pixels above the waterline." Spoken sizes say "by", shown ones keep × (decision 3).
- **Copy link**, in its own row after the answer.
- **A card per window** (`lib/trials-card.ts`, `lib/trials-card-art.tsx`, `app/trials/**/opengraph-image.tsx`): 1200 × 630 PNG in the step cards' language, the window drawn to scale against its waterline. 84 cards prerendered with the 84 window pages; off-sweep windows 404. No copper: a card is a still from the sweep.

### Checks (Probe, `e2e/trials-drag.spec.ts`)
All 15 trials checks (T1 to T15) pass on the integrated tree, on a server Playwright started itself.
- **T10** 712 B gzip beyond the 404's at load (budget 1,024); one chunk on the first touch, 8,083 B in all after (budget 8,192). No animation frame before the first touch or from 1 s after a settle.
- **T11** a steered drag lands at the settled window exactly; mid-drag the shown freeboard equals a direct measure within 0.5 px.
- **T12** keys, a CDP finger, `touch-action: none` on the corner only, the live region once per settle.
- **T13** address replaced, `history.length` unchanged, reload agrees with scripts off, Copy link.
- **T14** INP of a 40-step drag at 4x CPU: longest pointer entry 32 ms (gated at 200). Long animation frames are **reported, not gated** (decision 5): 36 over 50 ms, longest 172 ms in Probe's run, 211 to 268 ms on a loaded box in Pixel's. The cost is `/`'s own relayout inside the frame.
- **T15** own `og:image` and `twitter:image` per window, PNG 1200 × 630, alt and drawn words from the sweep.

**Named rewrite:** T8's "script beyond the 404's 0 B" becomes "at most 1,024 B gzip at load" (T10's number), title and body together; nothing else in T8 changed. The contract mutant (a bare client component on the trials page, the unedited suite: 411 passed, 1 failed) turned exactly this clause red, and nothing else (`mutant.md`).

**Kept checks:** B2.10 and B4.14 unchanged in bytes (`/`, `/log`, `/log/13` 2,037 B; `/crew` 18,831 B; `/read` 730 B). No import of three. Nothing changes on `/`, `/log` or `/crew`.

### Iris
Early look on the running build: changes, one rule, taken (the bracket grew by width and height on hover, a layout shift; it grows by `scale` now). Everything else works as directed: the corner under the hand within 0.1 px, +201.8 live against 201.78 measured, keys, touch, Copy link, axe clean at 390 and 1440 in both themes. The deep-sink card (1008 × 460, −197.1) stays as drawn: its dimension is to scale.

### Different from the plan
- Keys step by the grid, not 1 px, so every settle has an address (contract call 1).
- Tc gets its own script allowance: Tb's controller leaves 109 B of the plan's shared 8,192 B (decision 6).
- The frame still fetches 465 KB of `/`'s script it never runs (Lens's nit on #130). Blocking it by CSP logs refusals T9 forbids, and stripping it needs a second render path for `/`; it stays a follow-up (`spike.md`).
- Without script the corner and Copy link hide by `@media (scripting: none)`, so nothing shifts when script arrives; browsers without that feature (Safari before 17, Chrome before 120) would show them inert.
- `proxy.ts`'s matcher now leaves `/trials/opengraph-image` alone (it was rewritten to the 404); `/trials/frame` re-exports `/`'s card.

### Fix round 1 (Lens on e4eeb33)
- Important, fixed: a typed or stepped size that is a swept window settles on it exactly. From `/trials`, 1439 now lands on `/trials/1439x900`; before, it landed on 1424. When a 1 px step lands off the sweep, the controller walks on to the first swept window within a grid step, so 1380 stepped down reaches 1376 (Pixel's `nextFrom`, a little beyond Lens's shape, per placement.md §3). Probe's new T12 clause was red on e4eeb33 (1424 × 900, 42.4 against 37.4) and is green now.
- Nits, fixed: a grab during the re-fit's ease keeps `--scale`, an edit that blurs to a grab no longer settles mid-drag, print hides `.trials-scripted`, and Probe's superseded memory line is gone.
- Follow-up: a Tab out of an input before the controller's chunk arrives isn't heard (the base had this too; Pixel saw it on 4 of 12 fresh pages with no wait). The new clause waits for the controller, as T12's keys do. The fix is to reconcile the inputs in `start()`, in the next sprint that touches the controller.
- `pnpm verify` passes on the integrated tree, and the trials specs pass 15 of 15.

### Not verified
Real Safari, iOS and Firefox (Playwright's WebKit resizes and measures the frame live, `spike.md`), a real finger, the clipboard on Safari, what screen readers announce (DOM text only), the cards in real link previews.

No owner path is touched and no Owner's pick is asked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvd9PaCcN9ohP36ZwAi
