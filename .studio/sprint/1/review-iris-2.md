# Iris: design review 2 of PR #9 (sprint 1, design tokens) at 9461555

Verdict: changes 6.8/10

Advisory: `design/calibration/` still holds only its README, with no owner examples, so these scores
aren't calibrated and don't bind anyone. The verdict is `changes` for two separate reasons. First, the
placeholder hard gate still fails. That's owner content, and only the owner can clear or waive it.
Second, the weighted score is still just under the 7.0 bar. With the placeholder gate set aside, my
verdict would still be **changes 6.8/10**. One small fix in `app/page.tsx` (finding A) would
probably make it ship.

## First verdict: better than production

I built `main` (`origin/main` at 3700981, which is what production serves) and this PR (9461555) in
throwaway worktrees and ran both with `next start`. I rendered them in Chromium at 390, 1024 and
1440 px, light and dark, and also at 320 for the gates. Production itself can't be reached from this
sandbox, so `main` stands in for it.

**Better, clearly.** The fix round didn't change this: the PR has a mood you can name and a real type
hierarchy, and main has neither. Main is template white with `#171717` and opacity grays, a 36 px name
at every width, and links that look like body text. Nothing on the page got worse than main: same
words, same structure, no overflow, axe is clean, and LCP is about the same.

Side by side, main on the left and the PR on the right (the gray band is padding, because the PR page is taller):
`shots/iris2-main-vs-pr-{390,1024,1440}-{light,dark}.png`. A close-up of the 390 role titles is in
`shots/iris2-390-{light,dark}-titles.png`.

## Hard gates

| Gate | Result | Evidence |
|---|---|---|
| No placeholder renders | **fail (pre-existing, owner content)** | These render from `content/profile.ts`, the same as on main: "Company name", "Previous company", and twice "What you built, owned and improved." The summary line is a seed stand-in too; I missed it in review 1. Not visible but also a stand-in: LinkedIn points at `https://www.linkedin.com/` and Theseus at the GitHub profile rather than a repo. The `TODO(owner)` markers are source comments and don't render. |
| axe: no serious or critical | pass | `@axe-core/playwright` found 0 violations of any impact at 390 and 1440, in both light and dark. |
| impeccable detector: no errors | pass | `impeccable detect --json app/page.tsx app/globals.css app/layout.tsx components/` printed `[]`. |
| Reduced motion | pass | With `reducedMotion: 'reduce'`: 0 `document.getAnimations()` and no element with a transition or animation. The page has no motion at all. |
| Reflows at 320 px | pass | `scrollWidth` is 320, equal to `clientWidth`, in light and dark. |
| Phone budget | pass (approximate) | 390x844 at DPR 3, CPU slowed 4x, about 1.6 Mbps with 150 ms latency, cache off, local `next start`, 3 runs: LCP 616 / 616 / 596 ms, CLS 0. Main measured 692 / 660 / 736 ms, CLS 0. |

## Fix round 1, checked with my own eyes

**Finding 1 (role titles widow at 390): fixed, but it left a new flaw.** `text-balance` is on all three
`<h3>`, and the computed `text-wrap` is `balance`. At 390 neither title leaves a one-word line any
more: "Senior Software Engineer / · Company name" and "Software Engineer / · Previous company". The
break moved to before the middle dot, though, so the dot now starts line 2. At `step-lg` and
`font-medium` it reads like a list bullet in front of the company, and it's the first thing in the body
that catches the eye on a phone (`iris2-390-light-titles.png`). That's my miss: I asked for
`text-balance` without saying where the break should fall. It happens at 320 and 390, in both schemes.
At 1024 and 1440 the titles fit on one line, so nothing changes there.

**Finding 2 (two leadings in the body): fixed cleanly.** The summaries and the Theseus description
now take `step-base`'s own 1.6 (16.13 / 25.80 px at 390, 18 / 28.8 px at 1440), and the bio keeps its
step's 1.45. On a phone the Theseus paragraph no longer reads loose next to the lede, and the
Experience entries share one rhythm. Desktop changed by under a pixel, as expected.

## Scores (the running site at 9461555)

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Design quality | ×2 | **7** | Same as review 1. Color and type work as one calm verdigris-and-copper system, distinct in both schemes. Holding it back: the seed's single `max-w-2xl` column. At 1440 a narrow block sits in a wide field of mint with no structure, and there's no imagery. Layout is out of this sprint's scope, but the rubric scores the page. |
| Originality | ×2 | **6** | The palette comes from the subject, and the display-size name is a choice, not a default. The structure is still the most common minimal-resume template: eyebrow labels stacked over text. Only item 3 can move this. |
| Craft | ×1 | **7** | Better than review 1 in two places: no widows, and one leading per step throughout. It stays at 7 for two reasons. The separator now leads line 2 of both role titles on phones (finding A). And the dark accent still leans apricot, which is deferred to item 2 and fine to defer. Fix A and I'd score craft 8. |
| Functionality | ×1 | **8** | Easy to scan, and the three links are the only copper, so you can find them. Tab order is Theseus, GitHub, LinkedIn, with the browser's default ring visible (`outline: auto`). Focus styling belongs to item 6. It reflows at 320, and nothing moves. |

**Weighted:** (2×7 + 2×6 + 7 + 8) / 6 = 41 / 6 = **6.8**. Every criterion is at least 6, but the
total is under the 7.0 bar.

## Findings

A. **Keep the middle dot at the end of line 1 (for Forge, this sprint, `app/page.tsx`).** In the role
`<h3>`, join the title and the dot with a non-breaking space so the only break point comes after the
dot: `{role.title}{" "}· {role.company}`. Then the 390 titles read "Senior Software Engineer ·" /
"Company name", and the separator reads as a separator rather than a bullet. Keep `text-balance`.
This is presentation, not content, so `content/` stays untouched. It's the same kind of change as
findings 1 and 2. If Atlas would rather not take another round, this is a fair follow-up for item 3,
which reworks these entries anyway.

B. **Unchanged from review 1, still for later.** For item 2, move the dark accent `#e79d73` toward hue
40 to 45 and keep it at 7:1 or above. For item 3, give the 1440 composition some structure with
`--rule`, not more decoration.

## The verdict with the placeholder gate set aside

**changes 6.8/10.** Every other gate passes and the PR is clearly better than production, but the
score is under the bar. With finding A fixed I'd expect craft at 8, which makes it (14 + 12 + 8 + 8) / 6
= 7.0, a ship on the score alone. That's a narrow pass, so I'll re-score the build rather than promise
it. The real limit is the open question below: a token-only sprint can't move originality past about 6.

## Needs decision (owner, via Atlas)

- **Placeholder gate.** Replace the stand-ins in `content/profile.ts`, or waive the gate for content
  the owner hasn't supplied yet. The stand-ins are the two company names, the two "What you built,
  owned and improved." summaries, and the LinkedIn and Theseus links. Decision 2 sends this to the
  owner, but sending it isn't a waiver. Until one of those happens, every review fails this gate.
- **Does the absolute 7.0 bar apply to scoped sprints?** This PR is item 1 of 7 and, by contract,
  leaves layout alone. Should "better than production, gates pass, no criterion under 6" be enough for
  a scoped sprint? I've applied the rubric as written.
- **Decision 5 (verdict statuses can't post from this session).** This review is advisory and can't
  reach GitHub as a `theseus/iris` status either. The merge path is the owner's call.

## Could not verify

- Production itself, which this sandbox can't reach. A local build of `main` stands in for it.
- Calibration: no owner examples exist, so these scores can't be checked against the owner's.
- A real mid-range phone or a Vercel deploy. The phone budget is from throttled Chromium against a
  local server.
- Browsers other than Chromium. Safari's `text-wrap: balance` could break the titles differently, so
  check finding A there too. Hover states are only in the code, not in my screenshots.
- How the titles wrap with the owner's real company names. Finding A holds for any length.
