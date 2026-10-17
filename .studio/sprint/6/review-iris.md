Verdict: ship 7.3/10 (DQ 7, Orig 7, Craft 7, Func 9). Better than production.

# Sprint 6: Iris's review of Stack and Education (PR #27 at a7195be)

## Setup

- I built and served two production builds from scratch worktrees: the PR head a7195be on :3321,
  and origin/main 7c21716 on :3322 to stand in for production, which the sandbox proxy blocks.
- I used Playwright (agent-browser isn't installed) at 390, 1024 and 1440 px, light and dark.
  For 320 px I checked light and dark.
- Screenshots are `iris-*.png` in
  /tmp/claude-0/-home-user-theseus-portfolio/93d5a88d-d017-55ed-ab03-1992ece69f4e/scratchpad/.
  The scripts are `iris-shots.mjs` and `iris-proto.mjs`. Both servers are stopped.

## Compared with production: better

Above the new sections, the page is pixel-identical to main. A full-page clip from the top to the
bottom of Projects is byte-equal at 390 and at 1440. The PR adds the owner's facts that nothing
showed before, and it does so in the page's own register. Nothing regressed.

## Hard gates: all pass

- **Placeholder:** none added. The diff to `app/` has no `TODO` and no stand-in. Every fact comes
  from `content/profile.ts`.
- **axe:** 0 violations at 390, 1024 and 1440 in both schemes. I also scanned the strict tags at
  windows 390 and 1440 wide by 700, 760, 800, 844 and 900 tall, with each new section's top
  0 to 64 px inside the bottom edge (the heading-rise band). That found 0 serious or critical.
- **Detector:** `[]` on `app/page.tsx` and `components/section.tsx`. On the URL there is one
  warning, overused-font (Geist). Main has the same warning, so it isn't this sprint's, and it isn't
  at error level.
- **Reduced motion:** 0 running animations after scrolling to the end.
- **320 px:** scrollWidth 320 = clientWidth 320 in light and in dark.
- **Phone budget:** at 390 with 4x CPU throttling, LCP is 84 ms and CLS is 0.

## Scores

- **Design quality 7.** Education is a true sibling of Experience: same h3, the same muted period
  under it, and the same `gap-8` rhythm. On the full page it reads as part of the résumé, not an
  add-on. The Stack is calm and stays in the typographic register. Keeping school as the h3 was the
  right call: the school is what a scanner looks for, and the credential reads well as the "summary"
  line.
- **Originality 7.** It holds at 7. Nothing template-like came in: no chips, no badges, no icon
  grid. Nothing new and distinct came in either.
- **Craft 7.** Clean, with two misses.
  1. Without separators, the Stack depends on gap width alone to show where a multi-word tool
     ends. "LangChain Claude Agent SDK" and "OpenAI Agents SDK MCP" are separated by 24 px gaps
     against 4 to 5 px word spaces. That parses, but it reads as a tag cloud with the chips taken
     off. It's also the same shape as the Contact row below it: a wrapping row of words with 24 px
     gaps, just without the copper.
  2. The row pitch is 36.8 px at 1440 (28.8 line + 8 gap), against 28.8 for the prose around it.
     The block looks looser than the page.

  A smaller one: at 320 the CS50 credential leaves "(CS50)" alone on its second line.
- **Functionality 9.** It's easy to scan, adds no Tab stops, keeps the region and heading order
  intact, and is fine on phones.

Weighted score: (2×7 + 2×7 + 7 + 9) / 6 = **7.3**.

## Changes, cheapest first

Each is advice, and they're independent. I'd take 1 and 2 in this PR: together they're one edit
in `app/page.tsx` and make the Stack read like the rest of the page.

1. **Tighten the Stack rows.** On the Stack `ul`, change `gap-y-2` to `gap-y-1`. The pitch drops
   from 36.8 to 32.8 px at 1440, so the block reads as running text, not a grid.
2. **Separate the tools with a drawn middle dot.** The dot echoes the ` · ` in the Experience
   titles, and it tells the Stack apart from the Contact links. I prototyped it on the running
   build with injected CSS (`iris-proto-1440-light.png` and `iris-proto-390-dark.png`, against
   `iris-built-1440-light.png`). Multi-word tools read as single units, and each row starts with
   no stray dot.
   - On the Stack `ul`, add `overflow-hidden`, so the dot in front of each row's first item is
     clipped: it sits 13 px left of the list.
     `className="flex flex-wrap gap-x-6 gap-y-1 overflow-hidden"`
   - On each `li`, use:
     `className="relative text-step-base before:absolute before:top-1/2 before:-left-[0.8125rem] before:-mt-[1.5px] before:size-[3px] before:rounded-full before:bg-muted before:content-['']"`
   - It stays inside the contract. The generated content is the empty string (C4). The `li` boxes
     don't move, so C6 still holds. `bg-muted` is a token, and nothing becomes interactive. Please
     run the suite on it, since I only checked it by injection.
   - Use `bg-muted`, not `bg-rule`: a 3 px dot at `--rule` almost disappears on the light ground.
3. **Avoid the one-word last line on the credential.** Add `text-pretty` to the Education credential
   `p`: `className="mt-2 text-pretty text-step-base"`. "(CS50)" stops sitting alone at 320.

I didn't ask for any other changes. The orphan "Kubernetes" on the last row at 1024 px is
acceptable. Once the dots are in, it reads as the end of a sentence.

## Notes

- Forge's build note says the Stack wraps to 5 rows at 390. I measured 6: 3, 2, 3, 3, 4, 3. The
  claim is wrong; the behavior is fine.
- Forge's `next start -p 3319` (PID 9014 and its children) was still running when I finished. It
  isn't mine, so I left it alone.
- Calibration: `design/calibration/` still has no scored examples from the owner, so this verdict is
  advice.
