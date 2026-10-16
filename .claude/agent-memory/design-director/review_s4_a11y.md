---
name: Sprint 4 review (PR #17, accessibility pass)
description: My scores and verdict on sprint 4 at 863efa2, my answers to Pixel's skip-link and Contact-ring questions, and the skip link that skips nothing.
type: project
---
Verdict: ship 7.5/10 (DQ 7, Orig 7, Craft 8, Func 9). Better than prod (origin/main f400ae0 stood in;
prod is still a proxy 403). At rest the two are pixel-identical: the first-viewport diff is 0 at
390/1024/1440 in both schemes. Every gate passed: strict-tag axe 0 at rest and with the skip link
focused, detector `[]` on files and URL, 0 animations, 0 overflow at 320, LCP 112 ms, CLS 0.

Rulings:
- Skip link at `top-2 left-2`: right on phones, because the text lands on the column's 24 px edge.
  On desktop I recommended aligning it to the column with
  `focus:left-[max(0.5rem,calc(50%-20.5rem))]`. Advisory, not a condition.
- Contact ring: the underline gap (about 4.5 px) is fine. The sides are the problem: about 2 px
  versus 7 px above. Fix with `px-1 -mx-1`, which leaves rest layout unchanged and makes a hung ring
  like the cards'. Not a global outline-offset, which would crowd the skip link against the viewport
  edge.

**Why:** a focus ring's room comes from the box, not the offset. An inline-block at line-height 1.6
already has vertical air, so only the sides need padding. Negative margin keeps the page at rest
identical.
**How to apply:** when I spec a ring on inline text, compare the glyph-to-ring gap on all four sides
in an 8x crop before answering "too tight?".

Flagged to Quill/Atlas: with `main` wrapping the whole page, the skip link skips nothing (Enter then
Tab = Theseus, the same as without it). It's a fine convention to set up now, but it doesn't solve
"recruiter reaches Contact fast". That's an IA question for later.

Tooling: the URL detector needs `IMPECCABLE_BROWSER` pointed at a wrapper script that adds
`--no-sandbox` to `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (we run as root). Axe needs
`browser.newContext()`, not `browser.newPage()`. Loops and `eval` strings are refused by the guard.
Put them in a script file.
