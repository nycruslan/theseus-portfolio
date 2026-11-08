## Sprint 54 (S): Yb, a card for every step

**Goal:** the yard's second sprint (`ROADMAP.md`, "Now: the yard"). Quill planned it in sprint 52
(`.crew/sprint/52/plan.md`, "Yb").

**Size:** S. It's staffed as the plan asks: Forge builds, Probe writes Y9 to Y11 red first, and Iris
judges the card. **Contract:** `.crew/sprint/54/contract.md`. **Decisions:**
`.crew/sprint/54/decisions.md`.

### What a visitor sees

A link to any `/log/n` unfurls as that step:
- the Theseus above the ghost hull as they stood after sprint n, with that step's plank marked;
- `Sprint n · <day it merged>`;
- the sprint's own line as the headline;
- the page's count line;
- the owner's name, "VP Engineering at JPMorgan Chase", and the step's address.

The link to /log/23 unfurls as **Which one is the Theseus?** Each step's og:title is
`Sprint n: <its line>`. `/` and `/log` keep their card byte for byte (sha256 `4bd7987f…`, 79,054 B).

### Who did what

- **Forge:**
  - `lib/step-card.ts` (the words) and `lib/card-ships.ts` (the drawings as SVG for satori);
  - `lib/count-line.ts`, the count rule shared by the page and the card;
  - `lib/card-fonts.ts`, shared with the root card;
  - the card route and the metadata;
  - Lens's #119 nit on the stale layout comments (`app/globals.css`, `components/foot.tsx`,
    `components/bar.tsx`).
- **Probe:** Y9 to Y11 (`e2e/log-cards.spec.ts`), red first on the branch: 52 steps serving the
  root card, no `lib/step-card.ts`, the root's alt and titles. Also the contract mutant: the whole
  kept suite against a stand-in card, with no kept check broken.
- **Iris:** judged the card at 1200 × 630, at feed sizes (360 and 506 px) and at the networks'
  crops. Verdict: changes, 7.7, better than production. All three of her changes are built (a
  balanced headline, a larger foot, firmer lines).

### Contract results

- **Y9, Y10, Y11** pass on the integrated tree, along with `invariants.spec.ts` (Atlas, port 3361:
  23 of 23). Forge's build passed 117 of 117: Y9 to Y11, invariants and all ten Log specs.
- `pnpm verify` passes on the integrated tree.
- **Budgets:**
  - Y8's script bytes: 464,751 B in 8 files on /, /log, /log/13 and /log/53, the same before and
    after.
  - The build: 19.0 and 19.2 s before, 20.8 and 19.9 s after, with 135 static pages instead of 83.

### Decisions worth a look

- No "Sprint 23 of 51": a cached card would be false within a day (decision 2).
- The foot names the employer rather than `profile.headline` (decision 5). It's the owner's words,
  presented differently, and it can be undone.
- The per-step alt is set in `generateMetadata` (decision 7).

### Not verified

- Real network unfurls (LinkedIn, X, Slack, iMessage). The feed sizes are downscales.
- A step with no merge record (head `Sprint n` alone) first runs at this PR's close-out.

### Follow-ups

- The step image URL has no version query, so a later change to a card won't show on a link a
  network already cached (Forge).
- The square centre crop cuts the headline (Iris, if small square thumbnails matter).
- /log/n's og:description repeats the goal, which the title already carries. B5.8 pins it (Quill).
- No check ties `LIGHT_LINES` to the CSS tokens (Probe).
- `components/model.tsx` still has a stale "header's end" comment (Forge).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvb9P2F2wQPHB14TrcJ
