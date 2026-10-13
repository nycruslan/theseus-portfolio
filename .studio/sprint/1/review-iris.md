# Iris: design review of PR #9 (sprint 1, design tokens) at 4a28975

Verdict: changes 6.8/10

Advisory: `design/calibration/` still has no owner examples, so these scores aren't calibrated and
don't bind anyone. The verdict is `changes` for two reasons: the placeholder hard gate still fails
(the owner's call, see below), and the weighted score is just under the 7.0 pass bar. Forge has two
small in-scope fixes; the rest needs owner decisions.

## First verdict: better than production

I compared `main` (`origin/main` at 3700981, which is what production serves) with this PR. I built
both in throwaway worktrees and rendered them in Chromium at 390, 1024 and 1440 px, light and dark.
Production itself is blocked by the sandbox proxy.

**Better, clearly.** On `main` the page is template white with `#171717` text, opacity grays, a 36 px
name at every width, and links that look like body text. This PR has a mood you can name (calm
sea-glass patina in light, a green-black hull in dark) and a real type hierarchy: the name runs
48 to 76 px, the lede is set apart, and role titles outrank their summaries. The one accent marks
the only things you can click. Nothing got worse: same words, same layout, no overflow, axe is clean.

Side by side, main on the left and the PR on the right: `shots/iris-main-vs-pr-{390,1024,1440}-{light,dark}.png`.

## Hard gates

| Gate | Result | Evidence |
|---|---|---|
| No placeholder renders | **fail (pre-existing, owner content)** | "Company name" and "Previous company" render in Experience, from `content/profile.ts`. Same on `main`. |
| axe: no serious or critical | pass | My run: 0 violations of any impact at 390 and 1440, light and dark. Probe's e2e agrees. |
| impeccable detector: no errors | pass | `impeccable detect --json app/page.tsx app/globals.css components/section.tsx app/layout.tsx` returned `[]`. |
| Reduced motion | pass | `reducedMotion: 'reduce'`: 0 animations and no transitioned elements. The page has no motion at all. |
| Reflows at 320 px | pass | `scrollWidth` 320 = `clientWidth` in both schemes. Probe saw the same. |
| Phone budget | pass (approximate) | 390x844 at DPR 3, CPU slowed 4x, about 1.6 Mbps with 150 ms latency, local `next start`: LCP 688 ms, CLS 0. `main` is 680 ms and 0, so the fluid type costs nothing. |

**How I treat "Company name":** it fails the gate, and I'm not waiving it. Decision 2 in
`decisions.md` sends it to the owner, which is right, but sending it isn't a waiver. Only the owner
can waive a gate in the owner's rubric, and the rubric says a failing gate means `changes`
"whatever the score". I said so in the direction before the build. It isn't this change's fault:
the stand-in renders on `main` too, the team can't edit `content/`, and nothing Forge does here can
clear it. When the owner replaces the two company names (or waives the gate for owner-pending
content), this gate stops counting and my verdict depends only on the points below.

## Scores (the running site at 4a28975)

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Design quality | ×2 | **7** | Color and type now work as one system with a distinct, calm mood. The cool verdigris ground isn't white and isn't cream, and copper reads as "the new part". Holding it back: the layout and spacing are still the seed's single `max-w-2xl` column, so at 1440 a narrow text block sits in a lot of empty mint with no structure. There's no imagery. |
| Originality | ×2 | **6** | The palette comes from the subject and avoids both defaults (template gray, cream with terracotta). The display-size name is a choice, not a default. Still, the structure is the most common minimal-resume template: a stack of eyebrow labels and text. Layout is out of this sprint's scope, but the rubric scores the page. |
| Craft | ×1 | **7** | The tokens match the direction exactly, every text pair clears 6:1, the steps carry their own leading, and the scale is fluid without jumps (h1 48 / 49.75 / 65.6 / 76 px). Lost points: the role-title widows at 390 and mixed leading in the body (findings 1 and 2), and the dark accent leans apricot (finding 3). |
| Functionality | ×1 | **8** | Easy to scan, and the three links are the only copper on the page, so you can find them. Tab order is Theseus, GitHub, LinkedIn, with the default ring visible in both schemes (focus styling is item 6). Reflows at 320, nothing moves. |

**Weighted:** (2×7 + 2×6 + 7 + 8) / 6 = 41 / 6 = **6.8**. Every criterion is at least 6, but the
total is under the 7.0 bar.

## Findings

Forge can do 1 and 2 in this sprint, as class changes in `app/page.tsx`. They're the same kind of
change as decision 1 (line height and wrapping follow the type change; no spacing or layout).

1. **Role titles widow at 390 px.** "Senior Software Engineer · Company / name" and "Software
   Engineer · Previous / company" leave one word on the second line, right where the title is
   biggest (`step-lg`). Fix: add `text-balance` to both `<h3>` (role and project). 320 already
   breaks cleanly and so will 390. You can see it in `probe-390-light.png` and in
   `iris-main-vs-pr-390-light.png`.
2. **The body has two leadings.** The bio uses its step's 1.45, but the summaries and the project
   description keep `leading-7`, which is 1.75 at 16 px. On a phone the Theseus description reads
   loose and gappy next to the tight lede. Fix: drop `leading-7` from the two summary `<p>`s so
   they take `step-base`'s 1.6. My direction said to keep it, and seeing the real build, I was
   wrong. At 1440 the difference is tiny (28 to 28.8 px), so desktop won't change.
3. **The dark accent reads apricot, not copper** (`#e79d73`, hue 50). It's fine for contrast
   (8.45:1), but at 16 px on the hull it looks peach. This is for item 2 (the dark theme), not this
   PR: move it toward hue 40 to 45 with slightly more chroma, keeping it at least 7:1.
4. **For item 3, not now:** the 1440 composition is the main thing holding back design quality and
   originality. When project cards arrive, use `--rule` and give the page some structure (a stronger
   left edge, or a real two-column header at large widths). Don't add more decoration.

What I'd want before `ship`: findings 1 and 2 fixed, and the owner's decision on the placeholder
gate. With 1 and 2 done I'd expect craft at 8, which brings the weighted score to 7.0. I'll
re-score the real build, not promise the number in advance.

## Needs decision (owner, via Atlas)

- **"Company name" placeholder gate:** replace the two company names in `content/profile.ts`, or
  waive the gate for content the owner hasn't supplied yet. Until one of those happens, every review
  fails it.
- **Does the absolute pass bar apply to incremental sprints?** This PR is item 1 of 7 and leaves
  layout untouched by contract. Originality can't get much past 6 until item 3, so on a strict
  reading, token-only sprints can't reach `ship` even when they are clearly better than production.
  Whether "better than production, gates pass, no criterion under 6" is enough for a scoped sprint
  is the owner's call. I've applied the rubric as written.

## Could not verify

- Production itself (proxy blocks it, CONNECT 403). `main` built locally stands in for it.
- Calibration: there are no owner examples, so my scores have nothing to be checked against.
- A real mid-range phone or a Vercel deploy. The phone budget is throttled Chromium against a local
  server.
- Browsers other than Chromium. Hover states only in code (`hover:underline` on Theseus, copper
  to ink on Contact), not in screenshots.
