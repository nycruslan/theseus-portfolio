# Sprint 54 decisions (Atlas)

1. **S by the plan, staffed as it asks:** Forge builds, Probe writes Y9 to Y11 red first, Iris
   judges the card. Contract in `contract.md`, Atlas's, since the plan already made the product
   calls.
2. **No "Sprint 23 of 51" on the card.** Iris's frame had it. Networks cache a card for a long
   time, and "of N" changes with every merge, so it would stop being true within a day. "Sprint 23
   of 51" also pairs a sprint number with a count of steps (16 never merged).
3. **The body is the page's count line,** one rule in `lib/count-line.ts` that the page and the
   card both call. It replaces the frame's "replaced every original plank in 23 sprints", since
   that was 22 merges, not 23 sprints. The page's HTML is byte-identical on the steps Forge compared.
4. **The head's day always carries the year, and a step with no merge record reads `Sprint n`
   alone** (Probe and Forge, agreed mid-build). `dayWords` drops the year, and a card outlives it.
5. **The foot names the employer** (Atlas, on Iris's question): "VP Engineering at JPMorgan
   Chase", the bio's first sentence as the root card's `lead`, without its full stop. The
   contract said `profile.headline`. The unfurl's og:title and og:description both carry the
   goal, so the foot is the only place it says who he is, and PRODUCT.md's reader looks for scale.
   It's the owner's words, presented differently, and it can be undone.
6. **Iris's round** (changes, 7.7): a balanced headline wrap, the foot at 48/28/22, and the
   card's lines about 1.5 times the page's, because a card is seen at 0.3 to 0.46 scale. Four lines
   stays the headline's ceiling: 18 of 52 goals need four.
7. **The per-step alt goes through `generateMetadata`, not `generateImageMetadata`** (Forge).
   With `generateImageMetadata`, Next's generated params replace the file's and never receive `n`,
   so 0 cards prerendered. The plain file prerenders all 52, and `openGraph.images` names each one
   with its alt. Y10 would catch a change in Next.
8. **No kept check is rewritten or retired.** Probe ran the whole kept suite against a stand-in
   card: 360 passed and 1 failed. The failure was the stand-in's own `#fff`, caught by
   invariants:291. Forge's colours come from `lib/site.ts` (`LIGHT`, plus `LIGHT_LINES`, because
   B1.11 pins `LIGHT`'s five keys).
