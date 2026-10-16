Verdict: ship 7.5/10, about commit 863efa2. Better than production. (Advisory: `design/calibration/` holds no owner examples yet.)

# Sprint 4: Iris's review (accessibility pass, PR #17)

## Method

- Built 863efa2 and served it on port 3341. Built `origin/main` f400ae0 in a scratch worktree and served it
  on 3342 as the stand-in for production, because the sandbox proxy refuses
  `theseus-portfolio.vercel.app` (CONNECT 403). Same as in sprints 1 to 3.
- Playwright at 2x DPR, 390, 1024 and 1440 px, light and dark: the page at rest, first Tab, a focused
  card, a focused Contact link. Forced colors at 390. agent-browser `--session iris` at 1024 for the
  skip link. My screenshots are in
  `/tmp/claude-0/-home-user-theseus-portfolio/d0d1e768-e1be-5dc2-8708-509314b09678/scratchpad/s4-iris/`
  (`pr-*` is this PR, `main-*` is the stand-in, `zoom-contact-*` are 8x crops of the Contact ring).
- This was a single-context run. I have no sub-agent tool, so impeccable's two-agent critique ran in
  sequence. I scored the screenshots before I read the detector output.

## Hard gates: all pass

| Gate | Result |
|---|---|
| No placeholder added | Pass. The only new words are the UI label "Skip to content". "Company name" and the other stand-ins are already on production and unchanged. |
| axe, no serious or critical | 0 violations of any impact with the strict tag set (wcag2a/aa, 21a/aa, 22aa, best-practice). I checked 320, 390, 1024 and 1440 px, both schemes, at rest and with the skip link focused. |
| impeccable detector | `[]` on `app/page.tsx`, `components/skip-link.tsx`, `components/project-card.tsx` and `app/layout.tsx`. Also `[]` on the running URL. |
| Reduced motion | 0 running animations at every size. The skip link has no transition. |
| 320 px reflow | Horizontal overflow is 0 in both schemes. |
| Phone budget | At 390 px with 4x CPU: LCP 112 ms on the PR and 136 ms on main, CLS 0. |

## First verdict: better than production

At rest the two builds are the same, pixel for pixel. The first-viewport screenshots of PR and main
differ by a max of 0 in all six (390/1024/1440 x light/dark). As a sanity check, the same diff on the
first-Tab shots gives 211. This agrees with Pixel's full-page diff.

The PR is better in every focused state:

- **Skip link** (new). Production's first Tab goes straight to the Theseus card.
- **Contact links.** Production shows Chrome's 1 px black `auto` ring at a 1 px offset, the only
  off-brand mark on the page. The PR shows the cards' 2 px copper ring at 2 px, in both schemes.
- **Card arrow.** On production it stays muted grey on keyboard focus (`rgb(69,94,90)` light). Here it
  turns copper (`rgb(148,65,38)` light, `rgb(235,138,100)` dark), as it does on hover. This closes the
  follow-up I left in sprint 3.
- **Forced colors.** The card draws exactly one ring (`focus-visible:outline-none` on the link, where
  it used to be `outline-hidden`). The Contact link draws a system-color ring.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality (x2) | 7 | Same as sprint 3 at rest. The focus language is now one idea: the copper ring the cards introduced, used on the skip link and the Contact links too. |
| Originality (x2) | 7 | Unchanged. The sprint adds no new visual idea, by contract. The skip link is dressed in the page's own vocabulary (ink, copper underline, the page's ground), not a black library pill. |
| Craft (x1) | 8 | Right on phones: the skip link's text sits on the column's 24 px edge. Two refinements hold it back (below): the Contact ring sits 2 px from the glyphs at the sides but 7 px above them, and the skip link floats in the viewport corner on desktop. |
| Functionality (x1) | 9 | Every stop has the same obvious ring in both schemes and in forced colors. The Contact targets are 25.8 to 28.8 px tall. It works with JS off. |

Weighted: (2x7 + 2x7 + 8 + 9) / 6 = **7.5**. The contract keeps this sprint off the layout, so it
passes on "better than production" alone.

## Pixel's two questions

### 1. Is the skip link right at `top-2 left-2`?

**On phones, yes, and it's a good choice.** With `left-2` plus `px-4`, the text starts at x = 24, the
same edge as "Ruslan" and every line below it. The link reads as the first line of the column, not as
a widget laid over it. The box (8,8, 145 x 42) sits in the empty `py-24` above the h1 and covers
nothing.

**On desktop, I'd align it to the column too.** At 1024 and 1440 it floats in the viewport corner,
its text 176 and 384 px left of the edge everything else starts on (`ab-skip-1024.png`, `pr-dark-1440-tab1.png`).
The page is a single column and every other element hangs off its edge. A box in the window's corner
reads as browser chrome. One expression keeps the phone position and fixes desktop:

```
focus:left-[max(0.5rem,calc(50%-20.5rem))]
```

(Column left = 50% - 21rem. Add 24 px of column padding and subtract the link's 16 px `px-4`, which
gives 50% - 20.5rem.) Below about 672 px it resolves to 8 px, exactly as now. Above that, "Skip to
content" sits on the column edge, directly above "Ruslan". The vertical position stays `top-2`. This is
a recommendation, not a condition. The corner is the common convention and isn't wrong. It's just
less in keeping with this page.

### 2. Is the Contact link's 2 px ring at 2 px offset too tight to the underline?

**Not at the underline, but at the sides.** I measured the 8x crops (`zoom-contact-light-390.png`).
The underline sits about 4.5 px clear of the ring's inner edge, a deliberate-looking gap that matches
how the card title's underline sits inside the card ring. The tight part is horizontal. "G" and "b"
are only about 2 px from the ring, while the cap height has about 7 px above it. The text looks
stamped into a tag.

Fix without changing the page at rest: give the link `px-1 -mx-1`. The negative margin cancels the
padding, so every glyph stays where it is (C9 holds) and the `gap-6` spacing doesn't change. The ring
then clears the glyphs by about 6 px at the sides, close to the 7 px above. It hangs 4 px into the
24 px gutter, the same "hung frame" the cards use from md. Don't raise the global `outline-offset`
instead: it would push the skip link's ring to 2 px from the viewport edge, and the ring would grow
around 16 px text.

## Other observations (no change asked in this PR)

- **For Quill and Atlas: today the skip link skips nothing.** `main` wraps the whole page, so after
  Enter the next Tab is Theseus, which is also the second stop without the skip link. It costs keyboard
  visitors one extra stop and saves none until a header or nav sits outside `main`. It's the right
  convention to put in place now, and axe's `region` and `bypass` rules like it. But the contract's
  "why" ("a keyboard visitor tabs through every project before reaching anything else") isn't solved
  by it. Contact is still behind the project links. If reaching Contact quickly matters, that's a
  layout or IA question for a later sprint (Contact earlier, or a second skip target), not this one.
- **`[tabindex="-1"]:focus { outline: none }` is global.** That's fine today, since only `main` uses
  it. If a later sprint makes a scripted focus target that should show focus, it needs its own rule.
- Pixel's comment in `globals.css` explains *why* the rule is layered. I'd keep it, since it saves
  the next builder a two-ring regression.

## What I couldn't verify

- Production itself (proxy 403). `origin/main` f400ae0 stood in.
- Real Windows High Contrast. Chromium's `forcedColors: "active"` emulation stood in.
