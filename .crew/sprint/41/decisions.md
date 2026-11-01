# Sprint 41 decisions (Atlas)

1. **The sprint is Pc, from the roadmap.** The pre-flight said start sprint 41, nothing open, no
   goal from the owner, 5 of 6 daily merges used. Pc is the milestone's last sprint.
2. **Sized M, not the plan's S.** It adds a behaviour (the sentence layout), a new card with a
   vendored face and four riders, with checks P14 to P17 written first; that is an M by the skill's
   lanes.
3. **Atlas wrote the contract, not Quill.** Quill's plan already fixed the outcome and the checks'
   scope; what was left was the data rules and the markup.
4. **`/read` keeps its paragraphs.** The plan names Work's summaries on `/`; `/read` is the
   printable résumé and already holds the whole summary in its first viewport.
5. **The sentences keep the entry's `textContent` with single spaces between them,** so B2.1, B1.7
   and C4's residue checks run unedited: they compare the entry's squashed text with the facts.
6. **P17a was already done.** Probe measured the project link's rule gap below 1024 at 17.99 px
   (390) and 17.73 px (768) on the head: sprint 23's `-10px` on `.when-link` landed in #67 after
   Iris's review. P17a stays as a guard, green on main by nature; only P17b (`/read`'s figcaption
   gap) is red first.
7. **The hooks are Probe's** (`data-sentence` spans in `p.entry-text`, `lib/card.ts`'s `cardText`
   and `CARD_FONTS`, "Sofia Sans Local"), relayed to Forge word for word.
8. **Iris's must and should are taken before the review label** (`review-iris.md`): the card's name
   in Sofia Sans Extra Condensed 700 at 128 px, since platforms cache the first card anyone shares,
   and `/read`'s figcaption sentence 6 px under the legend. Her follow-up, the card drawn as a
   sheet with an ink frame, waits for a later sprint.
9. **The close-out's CI failure was the checks, not the page** (Forge's findings on cb44eba). With
   sprint 41's retro the record holds 40 merged sprints, so the fixtures' sprint 999 pencils seat
   `nextSeat(40)` = 5.0, the one led-out seat (`ledOut`, `lib/hull-layouts.ts`). B4.33, B4.15 and
   B4.36 assumed a lettered, chipped, deep seat; 5.0's number leads out with no chip by design
   (sprint 33, decisions 6; `app/globals.css`) and is exempt from B4.36's depth floor (sprint 36,
   decisions 8). The fixture's seat moves with every merge, so Probe fixes the checks' side
   without weakening them; no product change. Follow-up (Pixel, Iris): on `/` at 1440 with the
   model settled, a led-out 5.0 number sits on the drawing's Base line, which sprint 42's live
   pencil will show.
